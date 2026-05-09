package chesscom

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	client *Client
}

func NewHandler(client *Client) *Handler {
	return &Handler{client: client}
}

func (h *Handler) Mount(r chi.Router) {
	r.Route("/chesscom", func(r chi.Router) {
		r.Get("/profile/{username}", h.Profile)
		r.Get("/archives/{username}", h.Archives)
		r.Get("/games/{username}", h.Games)
		r.Get("/stats/{username}", h.Stats)
	})
}

func (h *Handler) Profile(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	data, err := h.client.GetProfile(r.Context(), username)
	if h.handleErr(w, err) {
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *Handler) Archives(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	archives, err := h.client.GetArchives(r.Context(), username)
	if h.handleErr(w, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"archives": archives})
}

func (h *Handler) Games(w http.ResponseWriter, r *http.Request) {
	archiveURL := r.URL.Query().Get("archiveUrl")
	if archiveURL == "" {
		writeErr(w, http.StatusBadRequest, "missing archiveUrl query param")
		return
	}
	games, err := h.client.GetGames(r.Context(), archiveURL)
	if h.handleErr(w, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"games": games})
}

func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	data, err := h.client.GetStats(r.Context(), username)
	if h.handleErr(w, err) {
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *Handler) handleErr(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, ErrNotFound) {
		writeErr(w, http.StatusNotFound, "chess.com user not found")
		return true
	}
	writeErr(w, http.StatusBadGateway, "chess.com API error")
	return true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
