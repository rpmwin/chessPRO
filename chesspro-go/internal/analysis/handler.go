package analysis

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/iamrpm/chesspro-go/internal/auth"
)

type Handler struct {
	svc  *Service
	repo *Repository
}

func NewHandler(svc *Service, repo *Repository) *Handler {
	return &Handler{svc: svc, repo: repo}
}

func (h *Handler) Mount(r chi.Router, mw *auth.Middleware) {
	r.Route("/analysis", func(r chi.Router) {
		r.Use(mw.Require)
		r.Post("/", h.Submit)
		r.Get("/", h.List)
		r.Get("/{id}", h.Get)
	})
}

func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFromCtx(r.Context())
	if u == nil {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body struct {
		PGN string `json:"pgn"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.PGN == "" {
		writeErr(w, http.StatusBadRequest, "pgn is required")
		return
	}

	a, err := h.svc.Submit(r.Context(), u.ID, body.PGN)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to submit analysis")
		return
	}
	writeJSON(w, http.StatusAccepted, a)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFromCtx(r.Context())
	id := chi.URLParam(r, "id")

	a, err := h.repo.FindByID(r.Context(), id)
	if errors.Is(err, ErrNotFound) {
		writeErr(w, http.StatusNotFound, "analysis not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to fetch analysis")
		return
	}
	if a.UserID != u.ID {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFromCtx(r.Context())

	list, err := h.repo.ListByUser(r.Context(), u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to list analyses")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"analyses": list})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
