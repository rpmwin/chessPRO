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
- [ ] **S8b** Manual test: signup → login → refresh → /me → logout

## Phase 3 — Chess.com Proxy

- [x] **S9** `internal/chesscom/client.go` — http.Client + methods
- [x] **S10** `internal/chesscom/handler.go` + routes wired in main
- [ ] **S10b** Manual test: profile, archives, games, stats endpoints (after main is wired)

## Phase 4 — Analysis Pipeline

- [ ] **S11** `internal/analysis/model.go` + `repository.go` + migration
- [ ] **S12** `internal/analysis/stockfish.go` — UCI wrapper, spawn once per job
- [ ] **S12b** Unit test: stockfish wrapper with a known FEN
- [ ] **S13** `internal/analysis/gemini.go` — call Gemini, parse commentary JSON
- [ ] **S13b** Manual test: Gemini with dummy move data
- [ ] **S14** `internal/analysis/worker.go` — asynq worker: PGN → stockfish → gemini → save
- [ ] **S14b** `internal/analysis/service.go` — enqueue job, return job ID
- [ ] **S15** `internal/analysis/handler.go` + routes wired in main
- [ ] **S15b** End-to-end test: POST /analysis with real PGN, poll status, check result

## Phase 5 — Wire + Ship

- [ ] **S16** `cmd/server/main.go` — full wiring: config → db → worker → router → server + graceful shutdown
- [ ] **S17** `Dockerfile` multi-stage + `docker-compose.yml` (app + postgres + redis)
- [ ] **S17b** `.env.sample` with all vars documented
- [ ] **S17c** `docker compose up` smoke test — server boots, DB connects, queue connects

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

(none yet)
