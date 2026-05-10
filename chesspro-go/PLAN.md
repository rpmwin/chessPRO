# chesspro-go — Build Plan

Go rewrite of chesspro backend. Same features, fixed architecture.
Stack: Go + chi + Postgres + Redis + Asynq + Stockfish (exec) + Gemini API.

---

## Folder Structure

```
chesspro-go/
├── cmd/
│   └── server/
│       └── main.go              # entrypoint: wire everything, start HTTP
├── internal/
│   ├── config/
│   │   └── config.go            # load all env vars into a Config struct
│   ├── db/
│   │   └── postgres.go          # open pgx pool, ping on startup, fatal if fail
│   ├── user/
│   │   ├── model.go             # User struct (id, email, password_hash, google_id, avatar, name)
│   │   └── repository.go        # DB queries: FindByID, FindByEmail, FindByGoogleID, Create
│   ├── auth/
│   │   ├── handler.go           # HTTP handlers: signup, login, refresh, logout, google redirect, google callback, /me
│   │   ├── service.go           # business logic: hash password, compare, issue tokens
│   │   └── middleware.go        # Bearer JWT guard — sets user in ctx
│   ├── chesscom/
│   │   ├── handler.go           # HTTP handlers: profile, archives, games, stats
│   │   └── client.go            # chess.com API HTTP client with timeout + rate limit
│   ├── analysis/
│   │   ├── model.go             # Analysis struct (id, user_id, pgn, status, results, created_at)
│   │   ├── repository.go        # DB queries: Create, FindByID, FindByUser, UpdateStatus, SaveResults
│   │   ├── handler.go           # HTTP handlers: submit job, get status, get result, list user analyses
│   │   ├── service.go           # enqueue job via asynq, return job ID
│   │   ├── worker.go            # asynq worker: process analysis task
│   │   ├── stockfish.go         # UCI wrapper: spawn stockfish, send FEN, parse eval + bestmove
│   │   └── gemini.go            # call Gemini API with move evals, return commentary
│   └── jwt/
│       └── jwt.go               # generate + verify access (15m) and refresh (7d) tokens
├── migrations/
│   ├── 001_create_users.sql
│   └── 002_create_analyses.sql
├── .env.sample
├── CLAUDE.md
├── PLAN.md                      # this file
└── go.mod
```

---

## Step-by-Step Build Order

Each step = one working unit. Do not skip ahead.

### Phase 1 — Foundation

**Step 1: Project scaffold**
- `go mod init github.com/iamrpm/chesspro-go`
- create all folders (empty `.gitkeep` files where needed)
- create `go.mod` with no deps yet

**Step 2: Config**
- `internal/config/config.go`
- one `Config` struct with all fields: Port, DatabaseURL, RedisAddr, JWTAccessSecret, JWTRefreshSecret, GoogleClientID, GoogleClientSecret, GoogleRedirectURI, ClientHomeURL, GeminiAPIKey, StockfishPath
- load from env using `os.Getenv`, fatal if required fields missing
- no external library needed (or use `github.com/caarlos0/env` — lightweight)

**Step 3: Database**
- `internal/db/postgres.go`
- open `pgx/v5` pool
- ping on startup — if fail, `log.Fatal`
- write migrations: `migrations/001_create_users.sql`, `002_create_analyses.sql`
- run migrations manually with `psql` or wire `golang-migrate` (simple)

**Step 4: JWT utils**
- `internal/jwt/jwt.go`
- `GenerateAccessToken(userID, email string) string` — 15m expiry
- `GenerateRefreshToken(userID string) string` — 7d expiry
- `VerifyAccessToken(token string) (*Claims, error)`
- `VerifyRefreshToken(token string) (*Claims, error)`
- use `github.com/golang-jwt/jwt/v5`

---

### Phase 2 — Auth

**Step 5: User model + repository**
- `internal/user/model.go` — `User` struct matching DB schema
- `internal/user/repository.go` — `FindByID`, `FindByEmail`, `FindByGoogleID`, `Create`
- use raw `pgx` queries (no ORM)

**Step 6: Auth service**
- `internal/auth/service.go`
- `Signup(name, email, password)` — hash with bcrypt cost 12, create user, return tokens
- `Login(email, password)` — find user, compare hash, return tokens
- `RefreshTokens(refreshToken)` — verify, find user, issue new pair
- do NOT return hashed password in any response

**Step 7: Auth middleware**
- `internal/auth/middleware.go`
- read `Authorization: Bearer <token>` header
- verify access token, load user from DB, set in `context`
- return 401 on missing/invalid token

**Step 8: Auth handlers + routes**
- `internal/auth/handler.go`
- `POST /auth/signup` → signup
- `POST /auth/login` → login
- `GET  /auth/refresh` → read `jid` cookie, issue new tokens
- `POST /auth/logout` → clear `jid` cookie
- `GET  /auth/google` → redirect to Google OAuth URL
- `GET  /auth/google/callback` → exchange code, upsert user, issue tokens, redirect to frontend
- `GET  /auth/me` → protected, return current user (no password hash)
- refresh cookie: `HttpOnly`, `SameSite=Lax`, `Secure` from config (true in prod)

---

### Phase 3 — Chess.com Proxy

**Step 9: Chess.com client**
- `internal/chesscom/client.go`
- one `http.Client` with 10s timeout
- methods: `GetProfile(username)`, `GetArchives(username)`, `GetGames(archiveURL)`, `GetStats(username)`
- add `User-Agent` header (chess.com blocks requests without it)

**Step 10: Chess.com handlers + routes**
- `internal/chesscom/handler.go`
- `GET /chesscom/profile/:username`
- `GET /chesscom/archives/:username`
- `GET /chesscom/games/:username?archiveUrl=...`
- `GET /chesscom/stats/:username`
- proxy only — transform response slightly, forward errors cleanly

---

### Phase 4 — Analysis (the hard part)

**Step 11: Analysis DB model + migrations**
- `migrations/002_create_analyses.sql`
  ```sql
  CREATE TABLE analyses (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id),
    pgn        TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | error
    results    JSONB,
    error_msg  TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `internal/analysis/model.go` + `repository.go` — CRUD matching above schema

**Step 12: Stockfish UCI wrapper**
- `internal/analysis/stockfish.go`
- `AnalyzePosition(fen string, depth int) (eval int, bestMove string, err error)`
- spawn stockfish binary via `exec.Command` (path from config)
- send UCI init sequence: `uci` → wait `uciok`, `isready` → wait `readyok`
- send `position fen <fen>`, `go depth <depth>`
- read lines until `bestmove`, parse last `info` line for `score cp` / `score mate` + `pv`
- flip eval sign if black to move
- reuse one process per analysis job (not per move — spawn once, send all positions sequentially)

**Step 13: Gemini integration**
- `internal/analysis/gemini.go`
- `GetCommentary(moves []MoveResult) ([]Comment, error)`
- call `google.golang.org/genai` SDK
- same prompt as old backend but cleaner
- parse JSON array from response

**Step 14: Analysis worker**
- `internal/analysis/worker.go`
- register asynq task `analysis:run`
- payload: `{ analysis_id: uuid }`
- worker flow:
  1. load analysis from DB
  2. set status = `processing`
  3. parse PGN → list of FEN positions (use `notnil/chess` Go library or manual FEN stepping)
  4. for each position: call stockfish wrapper
  5. after all moves: call Gemini with results
  6. save results to DB as JSONB, set status = `done`
  7. on any error: set status = `error`, save error_msg

**Step 15: Analysis handlers + routes**
- `internal/analysis/handler.go`
- `POST /analysis` (protected) — accept PGN, create DB record, enqueue asynq job, return `{ id, status }`
- `GET  /analysis/:id` (protected) — return analysis record (status + results if done)
- `GET  /analysis` (protected) — list user's past analyses (id, status, created_at)

---

### Phase 5 — Wire + Run

**Step 16: Main entrypoint**
- `cmd/server/main.go`
- load config
- connect DB
- run migrations (or just log "run migrations manually")
- start asynq worker server in goroutine
- build chi router, mount all route groups
- start HTTP server on configured port
- handle SIGTERM/SIGINT for graceful shutdown

**Step 17: Docker + compose**
- `Dockerfile` — multi-stage: build Go binary, minimal runtime image
- `docker-compose.yml` — services: app, postgres, redis
- `.env.sample` — all vars documented

---

## API Endpoints Summary

```
POST   /auth/signup
POST   /auth/login
GET    /auth/refresh
POST   /auth/logout
GET    /auth/google
GET    /auth/google/callback
GET    /auth/me                     [protected]

GET    /chesscom/profile/:username
GET    /chesscom/archives/:username
GET    /chesscom/games/:username
GET    /chesscom/stats/:username

POST   /analysis                    [protected]  submit PGN → returns job id
GET    /analysis/:id                [protected]  get status + results
GET    /analysis                    [protected]  list user's analyses
```

---

## Key Libraries

| Purpose | Library |
|---------|---------|
| Router | `github.com/go-chi/chi/v5` |
| Postgres | `github.com/jackc/pgx/v5` |
| Migrations | `github.com/golang-migrate/migrate/v4` |
| JWT | `github.com/golang-jwt/jwt/v5` |
| Password hash | `golang.org/x/crypto/bcrypt` |
| Job queue | `github.com/hibiken/asynq` |
| Gemini SDK | `google.golang.org/genai` |
| PGN/chess | `github.com/notnil/chess` |
| Config | stdlib `os.Getenv` or `github.com/caarlos0/env/v11` |
| Google OAuth | `golang.org/x/oauth2` |

---

## Fixes vs Old JS Backend

| Old Bug | Fix in Go |
|---------|-----------|
| Stockfish spawned per-move | Spawn once per job, reuse process |
| Queue dead code (Bull) | Asynq wired end-to-end |
| Hardcoded stockfish path | Read from config/env |
| Analysis never saved to DB | Saved with status tracking |
| No analysis history | GET /analysis endpoints |
| Password in signup response | Never returned |
| `secure: false` cookie | Configurable from env |
| Debug console.logs in JWT | Removed |
| DB fail doesn't stop server | Fatal on startup |
| No refresh token revocation | Add `token_version` field to users (increment on logout) |
| CORS hardcoded | Read from config |
