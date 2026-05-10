# ChessPRO

Real-time chess analysis platform. Upload or paste a PGN, get move-by-move Stockfish evaluation streamed live with Gemini AI coaching tips, accuracy scores, and an eval chart.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Go, chi v5, pgx/v5, asynq |
| Frontend | React (Vite), Tailwind CSS |
| Engine | Stockfish (UCI, parallel workers) |
| AI | Google Gemini |
| DB | PostgreSQL |
| Queue | Redis (asynq) |
| Auth | JWT (access 15m + refresh 7d cookie) + Google OAuth |
| Infra | Docker, k3s, Helm, GitHub Actions, Prometheus, Grafana |

## Repo Layout

```
chesspro/
├── chesspro-go/          # Go backend
│   ├── cmd/server/       # entrypoint
│   ├── internal/
│   │   ├── analysis/     # Stockfish + Gemini + SSE streaming
│   │   ├── auth/         # JWT + Google OAuth handlers
│   │   ├── chesscom/     # Chess.com API proxy
│   │   ├── config/       # env-based config
│   │   ├── db/           # pgx pool
│   │   ├── jwt/          # token signing/verification
│   │   ├── metrics/      # Prometheus instrumentation
│   │   └── user/         # user model + repo
│   ├── migrations/       # SQL schema
│   ├── Dockerfile
│   └── docker-compose.yml  # local dev (postgres + redis)
│
├── chessPRO/chess-frontend/  # React frontend
│   ├── src/
│   │   ├── components/   # page components
│   │   ├── context/      # AuthContext
│   │   ├── api/          # axios instance
│   │   └── Engine.js     # Stockfish WASM wrapper
│   ├── Dockerfile        # multi-stage nginx build
│   └── nginx.conf
│
├── helm/chesspro/        # Helm chart for k3s deployment
├── infra/
│   ├── prometheus/       # scrape config
│   └── grafana/          # datasource + dashboard provisioning
├── .github/workflows/    # CI/CD: test → build → push → helm deploy
└── docker-compose.prod.yml  # full production stack
```

## Local Development

### Prerequisites
- Go 1.24+
- Node 20+
- Docker (for postgres + redis)
- Stockfish binary (`brew install stockfish` on macOS)

### Backend

```bash
cd chesspro-go
cp .env.sample .env        # fill in secrets
docker compose up -d       # start postgres + redis
go run ./cmd/server
# → http://localhost:8080
```

### Frontend

```bash
cd chessPRO/chess-frontend
npm install
npm run dev
# → http://localhost:5173
```

## Production Deploy (k3s)

Images are built and pushed to GHCR on every push to `main` via GitHub Actions.

```bash
# Manual deploy / first time
helm upgrade --install chesspro ./helm/chesspro \
  --namespace chesspro --create-namespace \
  --set backend.env.DATABASE_URL="..." \
  --set backend.env.JWT_ACCESS_SECRET="..." \
  --set backend.env.GEMINI_API_KEY="..." \
  --wait
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | 32-byte random hex |
| `JWT_REFRESH_SECRET` | 32-byte random hex |
| `GEMINI_API_KEY` | Google AI Studio key |
| `KUBECONFIG` | base64-encoded k3s kubeconfig |

### Required GitHub Variables

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://api.chesspro.example.com` |
| `REDIS_ADDR` | `redis:6379` |
| `CORS_ORIGIN` | `https://chesspro.example.com` |

## API Endpoints

```
GET  /                      health check
GET  /metrics               Prometheus metrics

POST /auth/signup
POST /auth/login
GET  /auth/me
GET  /auth/refresh
POST /auth/logout
GET  /auth/google
GET  /auth/google/callback

GET  /chesscom/archives/:username
GET  /chesscom/games/:username

POST /analysis/stream       SSE — Stockfish + Gemini streaming analysis
POST /analysis              sync analysis (small games)
GET  /analysis/:id          fetch stored result
```

## Monitoring

Prometheus scrapes `/metrics` every 15s. Grafana auto-provisions the datasource.

Key metrics:
- `chesspro_http_requests_total` — request count by method/path/status
- `chesspro_http_request_duration_seconds` — latency histogram
- `chesspro_analysis_jobs_total` — analysis success/error counts
- `chesspro_analysis_duration_seconds` — end-to-end analysis time
- `chesspro_active_analysis_streams` — live SSE connections
