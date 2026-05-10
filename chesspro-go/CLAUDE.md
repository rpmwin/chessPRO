# chesspro-go

Go rewrite of chesspro backend. See PLAN.md for full architecture and step-by-step build order.

## Stack

- **Language**: Go
- **Router**: chi v5
- **DB**: Postgres via pgx/v5 (no ORM)
- **Queue**: asynq (Redis-backed)
- **Auth**: JWT (access 15m + refresh 7d in HttpOnly cookie)
- **Chess engine**: Stockfish binary via exec.Command (UCI protocol)
- **AI**: Gemini via google.golang.org/genai SDK
- **PGN parsing**: github.com/notnil/chess

## Directory Layout

```
cmd/server/main.go          entrypoint
internal/config/            env loading
internal/db/                postgres pool
internal/user/              model + repo
internal/auth/              handlers, service, middleware
internal/chesscom/          proxy handlers + client
internal/analysis/          handlers, service, worker, stockfish, gemini
internal/jwt/               token generation + verification
migrations/                 SQL migration files
```

## Directives

- MUST use raw pgx queries — no GORM, no sqlx
- MUST read all config from env — never hardcode paths, secrets, URLs
- MUST fatal on startup if DB or required config missing
- MUST NOT return password_hash in any response
- MUST spawn stockfish once per analysis job, not per move
- MUST commit after every step in PLAN.md — one commit per step
- MUST write conventional commit messages: `feat:`, `fix:`, `chore:`, `refactor:`
- MUST NOT skip steps or implement ahead — follow PLAN.md order exactly
- MUST check PLAN.md before starting any work to know current step

## Env Vars (see .env.sample)

```
PORT
DATABASE_URL
REDIS_ADDR
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
CLIENT_HOME_URL
GEMINI_API_KEY
STOCKFISH_PATH
CORS_ORIGIN
```

## Running

```bash
# start dependencies
docker compose up -d postgres redis

# run migrations
psql $DATABASE_URL -f migrations/001_create_users.sql
psql $DATABASE_URL -f migrations/002_create_analyses.sql

# run server
go run ./cmd/server
```
