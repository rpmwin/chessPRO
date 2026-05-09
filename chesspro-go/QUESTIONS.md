# Open Questions

Things I need from you but am not blocked on right now.
Answer when you have time — I'll leave sensible defaults until then.

---

## Pending

- **Q1**: ~~Stockfish binary location on your machine?~~ **RESOLVED**
  → Installed via `brew install stockfish`. Path: `/opt/homebrew/bin/stockfish`.
  Linux binary in old project won't work on macOS (wrong arch).

- **Q2**: Google OAuth — do you have CLIENT_ID/SECRET for chesspro?
  → Left blank in .env.sample. Google OAuth endpoints will 500 until filled. All other endpoints work without it.

- **Q3**: Postgres running locally or need Docker only?
  → Wiring Docker Compose so both work. Set `DATABASE_URL` in .env to switch.

- **Q4**: Analysis depth — old backend used `depth 12`. Keep or increase?
  → Using `depth 15` (better quality, still fast enough). Can make it configurable later.

---

## Resolved

(none yet)
