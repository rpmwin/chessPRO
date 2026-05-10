# ChessPRO Backend

The **ChessPRO Backend** is a Node.js/Express API that powers authentication, Chess.com data fetching, deep Stockfish analysis, and AI-powered coaching.

## Table of Contents

1. [Features](#features)
2. [Tech & Differentiators](#tech--differentiators)
3. [Architecture & Data Flow](#architecture--data-flow)
4. [Project Structure](#project-structure)
5. [API Endpoints](#api-endpoints)
6. [Worker Queue & Analysis Flow](#worker-queue--analysis-flow)
7. [Setup & Run](#setup--run)
8. [Env Variables](#env-variables)
9. [Deployment](#deployment)
10. [License](#license)

---

## Features

-   **JWT & Google OAuth 2.0** authentication
-   **Proxy** Chess.com profile, archives, games, and stats endpoints
-   **In-Memory** shallow eval for instant feedback
-   **Bull + Redis** for background deep analysis jobs
-   **Stockfish CLI** integration for depth‑20 per-move eval
-   **Google Gemini AI** coaching tips via JSON prompts

---

## Tech & Differentiators

| Layer    | Technology              | Benefit                                    |
| -------- | ----------------------- | ------------------------------------------ |
| Server   | Node.js + Express (ESM) | Modern JS, middleware flexibility          |
| Database | MongoDB + Mongoose      | Flexible schemas for users & analysis docs |
| Auth     | JWT + OAuth2            | Stateless, secure                          |
| Queue    | Bull + Redis            | Scalable background processing             |
| Analysis | Stockfish CLI           | Production-grade engine                    |
| AI Coach | @google/genai (Gemini)  | JSON-mode, schema compliance               |

---

## Architecture & Data Flow

1. **Client** hits `/profile/:user` → **Proxy** to Chess.com → returns JSON.
2. **Client** hits `/archives/:user` → returns list of archive URLs.
3. **Client** hits `/games/:user?archiveUrl=…` → returns game list.
4. **Client** posts PGN to `/analysis`:

    - **Auth middleware** verifies JWT.
    - **Controller** spawns Stockfish per move → collects eval + best move →
    - Bundles results array under `{ analysis: [...] }`.
    - Calls Google Gemini with system prompt → JSON tips.
    - Responds `{ analysis, commentary }`.

5. **Worker Queue** (optional for long jobs):
    - `analysisQueue.add(...)` → separate process picks up and persists in DB.

---

## Project Structure

```
src/
├── models/
│   ├── User.js
│   └── Analysis.js
├── controllers/
│   ├── auth.controller.js
│   ├── chesscom.controller.js
│   └── analysis.controller.js
├── routes/
│   ├── auth.route.js
│   ├── chesscom.route.js
│   └── analysis.route.js
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
├── queues/
│   └── analysisQueue.js
├── utils/
│   └── token.js
└── server.js
```

---

## API Endpoints

| Method | Path                           | Auth? | Description                      |
| ------ | ------------------------------ | ----- | -------------------------------- |
| POST   | `/auth/signup`                 | No    | Local signup                     |
| POST   | `/auth/login`                  | No    | Email/password login             |
| GET    | `/auth/oauth/google`           | No    | Google OAuth redirect            |
| GET    | `/chesscom/profile/:username`  | No    | Proxy Chess.com profile          |
| GET    | `/chesscom/archives/:username` | No    | List user archive URLs           |
| GET    | `/chesscom/games/:username`    | No    | Fetch games by archive URL       |
| GET    | `/chesscom/stats/:username`    | No    | Fetch stats                      |
| POST   | `/analysis`                    | Yes   | Deep Stockfish + Gemini coaching |

---

## Worker Queue & Analysis Flow

1. **Enqueue**: controller adds job to `analysisQueue`.
2. **Worker**:
    - Fetch PGN from job data.
    - Iterate moves → spawn Stockfish CLI.
    - Collect `info` + `bestmove` lines.
    - Build array of `{ moveNumber, eval, bestMove, depth }`.
    - Invoke Gemini → generate JSON tips.
    - Save results to MongoDB.

---

## Setup & Run

```bash
git clone <backend-repo-url>
cd backend
npm install
npm run dev
```

---

## Env Variables

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chessinsight
JWT_SECRET=supersecret
GEMINI_API_KEY=your_gemini_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
STOCKFISH_PATH=/usr/bin/stockfish
```

---

## Deployment

-   Ensure Redis + MongoDB + Stockfish binary are available.
-   Configure env vars in your host.
-   Run `npm start`.

---

