package auth

import (
	"github.com/go-chi/chi/v5"
)

func (h *Handler) Mount(r chi.Router, mw *Middleware) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/signup", h.Signup)
		r.Post("/login", h.Login)
		r.Get("/refresh", h.Refresh)
		r.Get("/google", h.GoogleRedirect)
		r.Get("/google/callback", h.GoogleCallback)

		r.Group(func(r chi.Router) {
			r.Use(mw.Require)
			r.Post("/logout", h.Logout)
			r.Get("/me", h.Me)
		})
	})
}
