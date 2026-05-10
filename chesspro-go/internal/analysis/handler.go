package analysis

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/hibiken/asynq"
	"github.com/iamrpm/chesspro-go/internal/auth"
	"github.com/iamrpm/chesspro-go/internal/metrics"
)

type Handler struct {
	svc     *Service
	repo    *Repository
	worker  *Worker
}

func NewHandler(svc *Service, repo *Repository, worker *Worker) *Handler {
	return &Handler{svc: svc, repo: repo, worker: worker}
}

func (h *Handler) Mount(r chi.Router, mw *auth.Middleware) {
	r.Route("/analysis", func(r chi.Router) {
		r.Use(mw.Require)
		r.Post("/", h.Submit)         // async: returns id immediately, frontend polls
		r.Post("/stream", h.Stream)   // SSE: streams move-by-move results as analysis runs
		r.Get("/", h.List)
		r.Get("/{id}", h.Get)
		r.Get("/{id}/poll", h.Poll)   // long-poll: blocks until done (for frontend compat)
	})
}

// Submit enqueues an analysis job and returns immediately with the job id.
func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFromCtx(r.Context())
	if u == nil {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body struct {
		PGN  string `json:"pgn"`
		Sync bool   `json:"sync"` // if true, block until done (for legacy frontend)
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

	// Sync mode: create record without enqueuing, run inline, return result directly.
	if body.Sync {
		rec, err := h.svc.CreateRecord(r.Context(), u.ID, body.PGN)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "failed to create analysis")
			return
		}
		if err := h.worker.ProcessTask(r.Context(), mustTask(rec.ID)); err != nil {
			writeErr(w, http.StatusInternalServerError, "analysis failed")
			return
		}
		result, err := h.repo.FindByID(r.Context(), rec.ID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "failed to fetch result")
			return
		}
		writeJSON(w, http.StatusOK, result.Results)
		return
	}

	writeJSON(w, http.StatusAccepted, a)
}

// Poll blocks until the analysis is done or times out (max 5 min).
// Frontend can call GET /analysis/:id/poll instead of polling manually.
func (h *Handler) Poll(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFromCtx(r.Context())
	id := chi.URLParam(r, "id")

	deadline := time.Now().Add(5 * time.Minute)
	for time.Now().Before(deadline) {
		a, err := h.repo.FindByID(r.Context(), id)
		if err != nil {
			writeErr(w, http.StatusNotFound, "analysis not found")
			return
		}
		if a.UserID != u.ID {
			writeErr(w, http.StatusForbidden, "forbidden")
			return
		}
		if a.Status == StatusDone || a.Status == StatusError {
			writeJSON(w, http.StatusOK, a)
			return
		}
		select {
		case <-r.Context().Done():
			return
		case <-time.After(2 * time.Second):
		}
	}
	writeErr(w, http.StatusRequestTimeout, "analysis timed out")
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

// Stream handles POST /analysis/stream — runs analysis inline and streams
// Server-Sent Events so the frontend can update the board move-by-move.
// Each event: "data: {type, ...}\n\n"
// Event types: "progress" | "move" | "commentary" | "done" | "error"
func (h *Handler) Stream(w http.ResponseWriter, r *http.Request) {
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

	// SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // disable nginx buffering
	w.WriteHeader(http.StatusOK)

	flusher, canFlush := w.(http.Flusher)

	metrics.ActiveStreams.Inc()
	defer metrics.ActiveStreams.Dec()

	start := time.Now()
	ch := make(chan ProgressEvent, 64)
	go h.worker.AnalyzeStream(r.Context(), body.PGN, ch)

	outcome := "success"
	for event := range ch {
		if event.Type == "error" {
			outcome = "error"
		}
		data, err := json.Marshal(event)
		if err != nil {
			continue
		}
		fmt.Fprintf(w, "data: %s\n\n", data)
		if canFlush {
			flusher.Flush()
		}
	}
	metrics.AnalysisJobsTotal.WithLabelValues(outcome).Inc()
	metrics.AnalysisDuration.Observe(time.Since(start).Seconds())
}

func mustTask(analysisID string) *asynq.Task {
	t, _ := NewAnalysisTask(analysisID)
	return t
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
