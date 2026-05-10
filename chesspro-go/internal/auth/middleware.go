package auth

import (
	"context"
	"net/http"
	"strings"

	jwtpkg "github.com/iamrpm/chesspro-go/internal/jwt"
	"github.com/iamrpm/chesspro-go/internal/user"
)

type contextKey string

const UserContextKey contextKey = "user"

type Middleware struct {
	jwt   *jwtpkg.Manager
	users *user.Repository
}

func NewMiddleware(jwt *jwtpkg.Manager, users *user.Repository) *Middleware {
	return &Middleware{jwt: jwt, users: users}
}

func (m *Middleware) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			writeErr(w, http.StatusUnauthorized, "missing token")
			return
		}

		claims, err := m.jwt.VerifyAccessToken(strings.TrimPrefix(auth, "Bearer "))
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		u, err := m.users.FindByID(r.Context(), claims.Sub)
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "user not found")
			return
		}

		ctx := context.WithValue(r.Context(), UserContextKey, u)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func UserFromCtx(ctx context.Context) *user.User {
	u, _ := ctx.Value(UserContextKey).(*user.User)
	return u
}
