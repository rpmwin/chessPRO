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

---

## Notes / Decisions Log

_Add notes here as you make decisions during build. Short bullets._

- Stockfish path read from `STOCKFISH_PATH` env var — no hardcoding
- Refresh cookie: `Secure` driven by `APP_ENV=production` flag
- Analysis results stored as JSONB in Postgres (not a separate table)
- Spawn stockfish ONCE per analysis job, send all FENs sequentially, quit at end
- `token_version` field on users table — increment on logout → old refresh tokens invalid
- Google OAuth: reuse `golang.org/x/oauth2` — no custom client per request
- PGN parsing: use `github.com/notnil/chess` (pure Go, no cgo)

---

## Blockers / Issues

_Track anything that stops progress._

- macOS ControlCenter owns port 5000 — default changed to 8080 in .env.sample
- Linux stockfish binary (old project) doesn't run on macOS — use `brew install stockfish`
