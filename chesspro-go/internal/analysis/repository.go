package analysis

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("analysis not found")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, userID, pgn string) (*Analysis, error) {
	var a Analysis
	err := r.db.QueryRow(ctx, `
		INSERT INTO analyses (user_id, pgn)
		VALUES ($1, $2)
		RETURNING id, user_id, pgn, status, created_at, updated_at
	`, userID, pgn).Scan(&a.ID, &a.UserID, &a.PGN, &a.Status, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Repository) FindByID(ctx context.Context, id string) (*Analysis, error) {
	var a Analysis
	var resultsRaw []byte
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, pgn, status, results, error_msg, created_at, updated_at
		FROM analyses WHERE id = $1
	`, id).Scan(&a.ID, &a.UserID, &a.PGN, &a.Status, &resultsRaw, &a.ErrorMsg, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if resultsRaw != nil {
		var res Results
		if err := json.Unmarshal(resultsRaw, &res); err == nil {
			a.Results = &res
		}
	}
	return &a, nil
}

func (r *Repository) ListByUser(ctx context.Context, userID string) ([]*Analysis, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, pgn, status, created_at, updated_at
		FROM analyses WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Analysis
	for rows.Next() {
		var a Analysis
		if err := rows.Scan(&a.ID, &a.UserID, &a.PGN, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &a)
	}
	return list, rows.Err()
}

func (r *Repository) SetStatus(ctx context.Context, id string, status Status) error {
	_, err := r.db.Exec(ctx, `
		UPDATE analyses SET status = $1, updated_at = $2 WHERE id = $3
	`, status, time.Now(), id)
	return err
}

func (r *Repository) SaveResults(ctx context.Context, id string, results *Results) error {
	raw, err := json.Marshal(results)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `
		UPDATE analyses SET status = 'done', results = $1, updated_at = $2 WHERE id = $3
	`, raw, time.Now(), id)
	return err
}

func (r *Repository) SaveError(ctx context.Context, id, errMsg string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE analyses SET status = 'error', error_msg = $1, updated_at = $2 WHERE id = $3
	`, errMsg, time.Now(), id)
	return err
}
