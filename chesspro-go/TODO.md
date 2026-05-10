# chesspro-go — TODO Tracker

Live status tracker. Update this file after every step. One commit per step.

## Status Legend
- `[ ]` not started
- `[~]` in progress
- `[x]` done

---

## Phase 1 — Foundation

- [x] **S1** `go mod init` + folder scaffold + `.gitkeep` files
- [x] **S2** `internal/config/config.go` — load all env vars, fatal if missing
- [x] **S3** `internal/db/postgres.go` — pgx pool, ping on start, fatal if fail
- [x] **S3b** `migrations/001_create_users.sql` + `migrations/002_create_analyses.sql`
- [x] **S4** `internal/jwt/jwt.go` — generate + verify access/refresh tokens

## Phase 2 — Auth

- [x] **S5** `internal/user/model.go` + `repository.go` — CRUD via raw pgx
- [x] **S6** `internal/auth/service.go` — signup, login, refresh logic
- [x] **S7** `internal/auth/middleware.go` — Bearer JWT guard, set user in ctx
- [x] **S8** `internal/auth/handler.go` + routes wired in main
- [x] **S8b** Manual test: signup → login → /me → all pass ✅


## Phase 3 — Chess.com Proxy

- [x] **S9** `internal/chesscom/client.go` — http.Client + methods
- [x] **S10** `internal/chesscom/handler.go` + routes wired in main
- [x] **S10b** Manual test: Magnus Carlsen profile returned correctly ✅

## Phase 4 — Analysis Pipeline

- [x] **S11** `internal/analysis/model.go` + `repository.go` + migration
- [x] **S12** `internal/analysis/stockfish.go` — UCI wrapper, spawn once per job
- [x] **S12b** Unit test: stockfish wrapper with a known FEN — PASS (depth 10, 1.8s for 2 positions)
- [x] **S13** `internal/analysis/gemini.go` — call Gemini, parse commentary JSON
- [x] **S13b** Manual test: Gemini with dummy move data — PASS (2.98s, 2 comments)
- [x] **S14** `internal/analysis/worker.go` — asynq worker: PGN → stockfish → gemini → save
- [x] **S14b** `internal/analysis/service.go` — enqueue job, return job ID
- [x] **S15** `internal/analysis/handler.go` + routes wired in main
- [x] **S15b** End-to-end test: PASS — 8-move Ruy Lopez analyzed in ~10s, commentary from Gemini

## Phase 5 — Wire + Ship

- [x] **S16** `cmd/server/main.go` — full wiring: config → db → worker → router → server + graceful shutdown
- [x] **S17** `Dockerfile` multi-stage + `docker-compose.yml` (app + postgres + redis)
- [x] **S17b** `.env.sample` with all vars documented
- [x] **S17c** Server boots, DB connects, asynq connects, all endpoints smoke-tested ✅

## Phase 6 — Analysis Quality + Performance

### Move enrichment
- [x] **F1** Phase detection per move (opening/middlegame/endgame)
- [x] **F2** Critical moment flagging (eval swing > 150cp)
- [x] **F3** Mate-in-N detection (from stockfish score mate values)
- [x] **F4** Lichess analysis URL for blunder/mistake positions
- [x] **F5** FEN per move (position after each half-move)
- [x] **F6** Eval history array for chart (N+1 centipawn values)

### Game summary enrichment
- [x] **F7** Opening detection (ECO code + name from PGN tags)
- [x] **F8** Best-move counts per side
- [x] **F9** Game score (average of both sides' accuracy, 0–100)
- [x] **F10** Critical moment count in summary

### Performance
- [x] **F11** Parallel Stockfish analysis (`AnalyzeGameParallel` — goroutine pool, up to 4 workers)
- [x] **F12** Two-pass dynamic depth (quick depth 10 all positions → deep depth 18 for critical swings)
- [x] **F13** Per-position `analyzeSingle` that spawns fresh Stockfish instance

### Streaming
- [x] **F14** SSE endpoint `POST /analysis/stream` — streams `move` events as analysis runs
- [x] **F15** `AnalyzeStream` worker method — emits ProgressEvents (move, commentary, done)
- [x] **F16** Commentary streamed per-comment after Gemini responds

### Gemini prompt improvements
- [x] **F17** Richer system prompt — chess concepts (fork, pin, skewer, outpost), opening names, varied language
- [x] **F18** Per-classification coaching rules (best→principle, inaccuracy→better move, blunder→refutation)

## Phase 7 — Upcoming Features

### Game intelligence
- [ ] **F19** Positional themes per move: fork / pin / skewer / discovered attack (via move classification heuristic)
- [ ] **F20** Opening book match beyond PGN tags — match first N positions against ECO openings table
- [ ] **F21** Puzzle export: positions where there was a missed tactic (blunder/mistake with tactical refutation)
- [ ] **F22** Time pressure analysis: correlate move quality with clock usage (from PGN `%clk` annotations)

### Study tools
- [ ] **F23** Personalized drill generation: extract blunder/mistake positions → generate practice puzzles
- [ ] **F24** Pattern frequency report: how often a player falls for forks vs. back-rank mates vs. pins
- [ ] **F25** Opening repertoire gap analysis: what openings does the player never reach good positions from?

### Infrastructure
- [ ] **F26** Analysis caching: hash(pgn + depth) → Redis → skip re-analysis for same game
- [ ] **F27** WebSocket alternative for streaming (for environments that don't support SSE)
- [ ] **F28** Rate limiting per user (max N analyses per hour)
- [ ] **F29** Analysis history pagination (currently returns all analyses, needs limit/offset)

### Frontend contract additions
- [ ] **F30** `moves[i].themes` array for tactic tags
- [ ] **F31** `summary.openingVariation` for sub-variation name
- [ ] **F32** `summary.endgameType` when phase=endgame (rook endgame, pawn endgame, etc.)

---

## Notes / Decisions Log

- Stockfish path read from `STOCKFISH_PATH` env var — no hardcoding
- Refresh cookie: `Secure` driven by `APP_ENV=production` flag
- Analysis results stored as JSONB in Postgres (not a separate table)
- Spawn stockfish ONCE per analysis job (sequential) OR N parallel instances for speed
- Two-pass depth: quick depth 10 first, deep depth 18 only for positions with >60cp eval swings
- `token_version` field on users table — increment on logout → old refresh tokens invalid
- Google OAuth: reuse `golang.org/x/oauth2` — no custom client per request
- PGN parsing: use `github.com/notnil/chess` (pure Go, no cgo)
- SSE streaming: `POST /analysis/stream` returns `text/event-stream`, each event is `data: {JSON}\n\n`
- Gemini prompt: detailed coaching rules, vary language, name tactics, 1-3 sentence max

---

## Blockers / Issues

- macOS ControlCenter owns port 5000 — default changed to 8080 in .env.sample
- Linux stockfish binary (old project) doesn't run on macOS — use `brew install stockfish`
- PGN tags must be on separate lines for notnil/chess to parse them correctly

## Phase 8 — Frontend Integration

- [x] **FE1** Fix baseURL: localhost:5000 → localhost:8080
- [x] **FE2** Fix token field: data.accessToken → data.access_token
- [x] **FE3** Fix /auth/profile → /auth/me
- [x] **FE4** Fix refresh: POST → GET /auth/refresh
- [x] **FE5** Fix logout: /logout → /auth/logout
- [x] **FE6** Fix Google OAuth URL to port 8080
- [x] **FE7** SSE streaming in Analysis.jsx: fetch + ReadableStream, progressive board updates
- [x] **FE8** Progress bar during streaming (done/total moves)
- [x] **FE9** Game summary card: accuracy bars, error counts per side
- [x] **FE10** Opening display (ECO + name from summary.opening)
- [x] **FE11** Classification badges on every move in history table
- [x] **FE12** SVG eval chart (sparkline) with current position marker
- [x] **FE13** Commentary streams incrementally from SSE
- [x] **FE14** Lichess link button for blunder/mistake positions
- [x] **FE15** Mate-in-N display on eval panel
- [x] **FE16** Critical moment ⚡ icon on board header
- [x] **FE17** Phase + centipawn loss shown with commentary
