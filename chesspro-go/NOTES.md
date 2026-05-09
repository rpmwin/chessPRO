# chesspro-go — Technical Notes

Deep reference for the analysis pipeline, frontend contract, known issues, and roadmap.

---

## 1. End-to-End Flow (Current)

```
Frontend                 Backend (Go)                   Workers / External
─────────                ────────────                   ──────────────────
POST /analysis  ───────► handler.Submit()
  { pgn }                  ↓
                         repo.Create()  ──────────────► Postgres: INSERT analyses (status=pending)
                           ↓
                         asynq.Enqueue() ─────────────► Redis queue
                           ↓
                         return { id, status:"pending" }
◄─────────────  202 Accepted { id }

                                                        Worker picks up job:
GET /analysis/:id ──────► repo.FindByID()               1. SetStatus(processing)
◄─────────────  { status:"processing" }                 2. Parse PGN → chess.Game
                                                        3. Build FEN array (N positions)
GET /analysis/:id ──────► repo.FindByID()               4. Stockfish.AnalyzeGame(fens, depth=15)
◄─────────────  { status:"done", results:{...} }            → spawn 1 process, sequential UCI
                                                        5. Build MoveResult array
                                                        6. Gemini.GetCommentary(moves)
                                                        7. repo.SaveResults()
```

**Problem**: Old frontend does `api.post('/analysis', {pgn}).then(res => setBackendData(res.data))` —
it expects the full result in the POST response. Our new async design returns 202 + id immediately.
The frontend has NO polling logic. It will only see `{id, status:"pending"}` and render nothing.

---

## 2. What the Frontend Expects (exact shape)

From `Analysis.jsx` reading:

```json
{
  "analysis": [
    {
      "bestMove": "e2e4",     ← UCI 4-char string (used for board arrows: bm.slice(0,2), bm.slice(2,4))
      "eval": 49,             ← centipawns, integer (used for EvaluationBar + display)
      "depth": 15             ← integer (displayed as "Depth N")
    }
  ],
  "commentary": [
    {
      "comment": "..."        ← string, accessed as commentary[moveIndex].comment
    }
  ]
}
```

Array indexing:
- `analysis[0]` = position at start (before any moves) — needs N+1 entries
- `analysis[moveIndex]` = current eval after `moveIndex` half-moves played
- `commentary[moveIndex]` = tip shown when viewing position after `moveIndex` moves

**What we currently return:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "pgn": "...",
  "status": "done",
  "results": {
    "moves": [
      { "move_number": 1, "played_move": "e2e4", "eval": 49, "best_move": "e2e4", "depth": 15 }
    ],
    "commentary": [
      { "move_number": 1, "comment": "..." }
    ]
  }
}
```

**Mismatches:**
1. Shape: `results.moves` vs `analysis` (flat)
2. Shape: `results.commentary` vs `commentary` (flat)
3. `move_number` not used by frontend (it uses array index)
4. `played_move` field not needed by frontend at all
5. `best_move` → frontend key is `bestMove` (camelCase)
6. Commentary array is 1-indexed (`move_number`) but frontend accesses 0-indexed
7. Array has N entries, frontend needs N+1 (position 0 = before game starts)

---

## 3. Commentary Bug — Root Cause

**What Gemini receives now:**
```json
[
  { "move_number": 1, "played_move": "e2e4", "eval": 49, "best_move": "e2e4", "depth": 15 },
  { "move_number": 2, "played_move": "e7e5", "eval": 46, "best_move": "c7c5", "depth": 15 }
]
```

**Problem**: 
- `played_move` is in UCI notation ("e7e5") not SAN ("e5")
- `best_move` is UCI ("c7c5") not SAN ("c5")
- The prompt says "comment on the move" but never tells Gemini to say "Instead of e5, the best move was c5"
- eval is the position BEFORE the move is played, not after — Gemini doesn't know how bad the move was
- There is no `centipawn_loss` field — Gemini can't tell if the move was a blunder

**What Gemini should receive:**
```json
[
  {
    "move_number": 2,
    "played_move_san": "e5",
    "best_move_san": "c5",
    "eval_before": 49,
    "eval_after": 46,
    "centipawn_loss": 3,
    "classification": "good",
    "is_best_move": false
  }
]
```

**And the prompt should say:**
> If `is_best_move` is false, mention that `best_move_san` was stronger and why.
> If the `classification` is "mistake" or "blunder", be more critical.
> Always reference moves in SAN notation.

---

## 4. Evaluation Bar — What's Needed

`EvaluationBar.jsx` takes a single `cp` prop (integer centipawns).
It clamps to ±1000 and maps to bar height: `whiteHeight = 50 + cp/20`.

Currently fed from: `backendData.analysis[moveIndex]?.eval`

**For the bar to be correct**, `analysis[moveIndex]` must represent the eval of the CURRENT
board position (after `moveIndex` half-moves). This requires N+1 eval values:
- index 0 = eval of starting position (no moves played)
- index i = eval after i half-moves played

Currently we compute eval BEFORE each move (N entries).
`eval_before_move_N` = `eval_after_move_{N-1}` — so we have the right data,
just need to shift: prepend the starting position eval and append final position eval.

---

## 5. Missing Features vs Old Backend

| Feature | Old JS | New Go | Notes |
|---------|--------|--------|-------|
| Synchronous response | ✓ | ✗ | Old returned result in POST body. New is async. Frontend needs polling. |
| Analysis saved to DB | ✗ (model existed, never saved) | ✓ | Fixed in Go. |
| Analysis history | ✗ | ✓ | GET /analysis added. |
| Move classification | ✗ | ✗ | Need to add |
| Centipawn loss per move | ✗ | ✗ | Need to add |
| Game summary (accuracy %) | ✗ | ✗ | Need to add |
| SAN notation for moves | ✓ (chess.js) | ✗ (UCI) | Need UCI→SAN conversion |
| Final position eval | ✗ | ✗ | Need N+1 evals |
| Opening detection (ECO) | ✗ | ✗ | Could add via notnil/chess |

---

## 6. Optimisations Done

| What | How |
|------|-----|
| Stockfish spawned once per game | Old: 1 process per move. New: 1 process for all N positions sequentially |
| Analysis queued async | Old: blocked HTTP handler. New: asynq + Redis, non-blocking |
| Results persisted | Old: lost on response. New: Postgres, queryable later |
| Token invalidation on logout | token_version in DB, embedded in refresh token |
| No secrets in logs | Removed console.log(JWT_SECRET) from old backend |

---

## 7. More Optimisations Possible

### Stockfish batching
Currently: N sequential `position fen X` + `go depth 15` pairs in one process.
Better: Run multiple stockfish processes in parallel (goroutines), one per core.
A 40-move game at depth 15 currently takes ~40s. With 4 workers: ~10s.

```go
// Rough idea
sem := make(chan struct{}, runtime.NumCPU())
results := make([]PositionResult, len(fens))
var wg sync.WaitGroup
for i, fen := range fens {
    wg.Add(1)
    go func(i int, fen string) {
        defer wg.Done()
        sem <- struct{}{}
        defer func() { <-sem }()
        results[i], _ = analyzeSingleFen(fen, depth)
    }(i, fen)
}
wg.Wait()
```
Tradeoff: each process uses ~100MB RAM. 4 workers = 400MB. Fine for local, size for prod.

### Gemini batching
Currently: one Gemini call with all moves at once.
This is already optimal — no need to batch further.
Could reduce token usage by only sending moves where played ≠ best move.

### Caching
Identical PGN games (from chess.com archives) hit Stockfish again. 
Cache: `hash(pgn + depth)` → Redis → skip re-analysis if found.

### Depth tiers
- Quick preview: depth 10 (~5s for 40 moves) — returned immediately
- Deep analysis: depth 20 (~3min) — queued, notified when done
Frontend could show quick results first, then update with deep.

---

## 8. More Features to Ship

### Accuracy score (chess.com style)
Win percentage formula: `wp = 50 + 50 * tanh(0.00368208 * cp)`
Accuracy per move: `100 - 200 * |wp_before - wp_after|`
Game accuracy: average of all move accuracies.

### Move classification (chess.com thresholds)
```
centipawn_loss == 0            → best      (!!)
0 < loss <= 10                 → excellent (!)
10 < loss <= 25                → good
25 < loss <= 50                → inaccuracy (?!)
50 < loss <= 100               → mistake   (?)
loss > 100 OR position flipped → blunder   (??)
```

### Opening detection
`notnil/chess` has position hash. Can match against ECO database.
Return: `{ eco: "C60", name: "Ruy Lopez" }` in game summary.

### Game chart data (eval over time)
Return `eval_history: [20, 18, 22, -40, ...]` — one value per half-move.
Frontend renders a sparkline/line chart below the move list.

### Comparison: played vs best eval delta
Frontend arrow currently shows best move from backend.
Could also show the "mistake arrow" (what was played that was wrong) in red.

### Lichess puzzle links
For moves classified as blunder/mistake: link to a lichess puzzle in that position.
`https://lichess.org/analysis/fen/{fen}` — links directly to position.

### WebSocket for real-time progress
Instead of polling: push status updates over WS as worker progresses.
`{ status: "processing", progress: 12/40 }` — frontend shows progress bar.

---

## 9. What Needs Fixing NOW (Priority Order)

1. **[CRITICAL]** Frontend compat: POST /analysis must return full result, OR frontend must poll
2. **[HIGH]** Response shape: must match `{ analysis: [...], commentary: [...] }` frontend contract
3. **[HIGH]** Fix eval array: N+1 entries (prepend startpos eval OR shift by one)
4. **[HIGH]** UCI→SAN conversion for `played_move` and `best_move`
5. **[HIGH]** Fix Gemini prompt: include centipawn_loss, is_best_move, SAN notation
6. **[MEDIUM]** Add move classification to response
7. **[MEDIUM]** Add game summary (accuracy, blunder/mistake/inaccuracy counts)
8. **[LOW]** Parallel Stockfish workers
