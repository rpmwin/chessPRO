package auth

import (
	"context"
	"errors"

	jwtpkg "github.com/iamrpm/chesspro-go/internal/jwt"
	"github.com/iamrpm/chesspro-go/internal/user"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailInUse      = errors.New("email already in use")
	ErrInvalidCreds    = errors.New("invalid credentials")
	ErrInvalidToken    = errors.New("invalid or expired token")
	ErrTokenVersionMismatch = errors.New("token has been invalidated")
)

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

type Service struct {
	users *user.Repository
	jwt   *jwtpkg.Manager
}

func NewService(users *user.Repository, jwt *jwtpkg.Manager) *Service {
	return &Service{users: users, jwt: jwt}
}

func (s *Service) Signup(ctx context.Context, name, email, password string) (*user.User, *TokenPair, error) {
	existing, _, err := s.users.FindByEmail(ctx, email)
	if err == nil && existing != nil {
		return nil, nil, ErrEmailInUse
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return nil, nil, err
	}

	hashStr := string(hash)
	emailStr := email
	u, err := s.users.Create(ctx, user.CreateParams{
		Name:         name,
		Email:        &emailStr,
		PasswordHash: &hashStr,
	})
	if err != nil {
		return nil, nil, err
	}

	pair, err := s.issueTokens(u)
	if err != nil {
		return nil, nil, err
	}
	return u, pair, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (*user.User, *TokenPair, error) {
	u, hash, err := s.users.FindByEmail(ctx, email)
	if errors.Is(err, user.ErrNotFound) || hash == nil {
		return nil, nil, ErrInvalidCreds
	}
	if err != nil {
		return nil, nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*hash), []byte(password)); err != nil {
		return nil, nil, ErrInvalidCreds
	}

	pair, err := s.issueTokens(u)
	if err != nil {
		return nil, nil, err
	}
	return u, pair, nil
}

func (s *Service) RefreshTokens(ctx context.Context, refreshToken string) (*user.User, *TokenPair, error) {
	claims, err := s.jwt.VerifyRefreshToken(refreshToken)
	if err != nil {
		return nil, nil, ErrInvalidToken
	}

	u, err := s.users.FindByID(ctx, claims.Sub)
	if errors.Is(err, user.ErrNotFound) {
		return nil, nil, ErrInvalidToken
	}
	if err != nil {
		return nil, nil, err
	}

	if u.TokenVersion != claims.TokenVersion {
		return nil, nil, ErrTokenVersionMismatch
	}

	pair, err := s.issueTokens(u)
	if err != nil {
		return nil, nil, err
	}
	return u, pair, nil
}

func (s *Service) Logout(ctx context.Context, userID string) error {
	return s.users.IncrementTokenVersion(ctx, userID)
}

func (s *Service) UpsertGoogleUser(ctx context.Context, googleID, email, name, avatarURL string) (*user.User, *TokenPair, error) {
	u, err := s.users.FindByGoogleID(ctx, googleID)
	if errors.Is(err, user.ErrNotFound) {
		u, err = s.users.Create(ctx, user.CreateParams{
			Name:      name,
			Email:     &email,
			GoogleID:  &googleID,
			AvatarURL: &avatarURL,
		})
		if err != nil {
			return nil, nil, err
		}
	} else if err != nil {
		return nil, nil, err
	}
	pair, err := s.issueTokens(u)
	if err != nil {
		return nil, nil, err
	}
	return u, pair, nil
}

func (s *Service) issueTokens(u *user.User) (*TokenPair, error) {
	email := ""
	if u.Email != nil {
		email = *u.Email
	}
	access, err := s.jwt.GenerateAccessToken(u.ID, email)
	if err != nil {
		return nil, err
	}
	refresh, err := s.jwt.GenerateRefreshToken(u.ID, u.TokenVersion)
	if err != nil {
		return nil, err
	}
	return &TokenPair{AccessToken: access, RefreshToken: refresh}, nil
}
