# ChessPRO Frontend

The **ChessPRO Frontend** is a React-based single-page application that allows users to:

-   **Authenticate** via Google OAuth or email/password.
-   **Search** for Chess.com profiles.
-   **Browse** infinite-scroll game archives with mini-boards.
-   **Analyze** games in-browser with Stockfish.
-   **Receive AI Coaching Tips** via Google Gemini.

## Table of Contents

1. [Features](#features)
2. [Tech & Differentiators](#tech--differentiators)
3. [User Flow](#user-flow)
4. [Project Structure](#project-structure)
5. [Setup & Run](#setup--run)
6. [Routes & Components](#routes--components)
7. [Environment Variables](#environment-variables)
8. [Build & Deploy](#build--deploy)
9. [License](#license)

---

## Features

1. **Secure Authentication**

    - Google OAuth 2.0
    - Email/password with JWT

2. **Profile Lookup**

    - Fetches avatar, rating stats, join date, league, followers.

3. **Game Archive**

    - Infinite scroll through monthly archives.
    - Mini React‑Chessboard previews show final positions.

4. **In‑Browser Analysis**

    - Stockfish WebAssembly via a Worker for instant shallow eval.

5. **Deep Server Analysis + AI Tips**
    - Backend spawns Stockfish CLI for deep eval per move.
    - Google Gemini 1.5 Flash generates one‑sentence coaching tips.

---

## Tech & Differentiators

| Layer           | Technology                           | Why It Matters                         |
| --------------- | ------------------------------------ | -------------------------------------- |
| Framework       | React + Vite                         | Fast HMR, modern ESM modules           |
| Routing         | React Router v6                      | Nested routes, protected routes        |
| State & Auth    | Context API + localStorage + JWT     | Lightweight, no Redux overhead         |
| Styles          | Tailwind CSS                         | Utility classes, rapid styling         |
| Board Rendering | react-chessboard + chess.js          | Highly-configurable boards & logic     |
| Notifications   | react-hot-toast                      | Non-blocking alerts                    |
| HTTP Client     | Axios                                | Interceptors for auth, base URL        |
| Analysis Engine | Web Worker + Stockfish WASM fallback | Instant local eval without server hit  |
| AI Coach        | @google/genai Gemini 1.5‑flash       | JSON‑mode tips via system instructions |

---

## User Flow

1. **Landing Page**

    - Introduce ChessInsight → “Search a Player”.

2. **Signup/Login**

    - Google OAuth or local form → receive JWT.

3. **SearchPage**

    - Enter Chess.com username → validation → redirect to ProfilePage.

4. **ProfilePage**

    - Shows avatar, stats, “View Games” button.

5. **GamesPage**

    - Loads archives → infinite scroll → mini-boards.

6. **AnalysisPage**
    - Click “Analyze” → loads PGN → local Stockfish eval begins → background fetch to `/analysis` → deep eval + AI tips arrive → UI updates arrows & commentary.

---

## Project Structure

```
src/
├── api/
│   └── axios.js             # axios instance with interceptors
├── components/              # reusable UI pieces
│   ├── ProfileCard.jsx
│   ├── GamesList.jsx
│   ├── ProtectedRoute.jsx
│   └── EvaluationBar.jsx
├── context/
│   └── AuthContext.jsx      # auth state, login, logout
├── pages/
│   ├── Home.jsx
│   ├── SearchPage.jsx
│   ├── ProfilePage.jsx
│   ├── GamesPage.jsx
│   └── AnalysisPage.jsx
├── Engine.js                # Web Worker wrapper for Stockfish WASM
├── index.css                # global styles + Tailwind imports
└── main.jsx                 # mounts React + Router
```

---

## Setup & Run

```bash
git clone <frontend-repo-url>
cd frontend
npm install
```

### Environment Variables

Create `.env`:

```
VITE_API_URL=http://localhost:5000
```

### Start Dev Server

```bash
npm run dev
```

Open http://localhost:5173

---

## Routes & Key Components

| Route                | Component    | Purpose                                 |
| -------------------- | ------------ | --------------------------------------- |
| `/`                  | Home.jsx     | Landing + CTA                           |
| `/signup`, `/login`  | Signup/Login | Auth forms                              |
| `/` (protected)      | SearchPage   | Username input                          |
| `/profile/:username` | ProfilePage  | Display user info, stats                |
| `/profile/:u/games`  | GamesPage    | Infinite-scroll game archives           |
| `/analysis`          | AnalysisPage | Board, history, local & server analysis |

---

## Build & Deploy

```bash
npm run build
```

Deploy `dist/` to Netlify, Vercel, or any static host.

---
