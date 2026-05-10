CREATE TABLE IF NOT EXISTS analyses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pgn         TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    results     JSONB,
    error_msg   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses(user_id);
