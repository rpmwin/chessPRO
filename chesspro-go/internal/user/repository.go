package user

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("user not found")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

type CreateParams struct {
	Email        *string
	PasswordHash *string
	GoogleID     *string
	AvatarURL    *string
	Name         string
}

func (r *Repository) Create(ctx context.Context, p CreateParams) (*User, error) {
	var u User
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, google_id, avatar_url, name)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, email, name, avatar_url, google_id, token_version, created_at, updated_at
	`, p.Email, p.PasswordHash, p.GoogleID, p.AvatarURL, p.Name).Scan(
		&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.GoogleID,
		&u.TokenVersion, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) FindByID(ctx context.Context, id string) (*User, error) {
	var u User
	err := r.db.QueryRow(ctx, `
		SELECT id, email, name, avatar_url, google_id, token_version, created_at, updated_at
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.GoogleID,
		&u.TokenVersion, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, *string, error) {
	var u User
	var passwordHash *string
	err := r.db.QueryRow(ctx, `
		SELECT id, email, name, avatar_url, google_id, token_version, password_hash, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.GoogleID,
		&u.TokenVersion, &passwordHash, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, ErrNotFound
	}
	return &u, passwordHash, err
}

func (r *Repository) FindByGoogleID(ctx context.Context, googleID string) (*User, error) {
	var u User
	err := r.db.QueryRow(ctx, `
		SELECT id, email, name, avatar_url, google_id, token_version, created_at, updated_at
		FROM users WHERE google_id = $1
	`, googleID).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.GoogleID,
		&u.TokenVersion, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *Repository) IncrementTokenVersion(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET token_version = token_version + 1 WHERE id = $1`, id)
	return err
}
