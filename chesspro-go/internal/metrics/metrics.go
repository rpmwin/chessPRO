package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	RequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "chesspro_http_requests_total",
		Help: "Total HTTP requests by method, path, and status.",
	}, []string{"method", "path", "status"})

	RequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "chesspro_http_request_duration_seconds",
		Help:    "HTTP request latency.",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "path"})

	AnalysisJobsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "chesspro_analysis_jobs_total",
		Help: "Total analysis jobs by outcome (success/error).",
	}, []string{"outcome"})

	AnalysisDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "chesspro_analysis_duration_seconds",
		Help:    "End-to-end analysis job duration.",
		Buckets: []float64{5, 10, 20, 30, 60, 120, 180},
	})

	ActiveStreams = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "chesspro_active_analysis_streams",
		Help: "Number of currently open SSE analysis streams.",
	})
)

// Handler returns the Prometheus HTTP handler for /metrics.
func Handler() http.Handler {
	return promhttp.Handler()
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// Middleware records request count and latency per route.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w, status: 200}
		start := time.Now()
		next.ServeHTTP(rec, r)
		dur := time.Since(start).Seconds()

		path := r.URL.Path
		status := strconv.Itoa(rec.status)

		RequestsTotal.WithLabelValues(r.Method, path, status).Inc()
		RequestDuration.WithLabelValues(r.Method, path).Observe(dur)
	})
}
