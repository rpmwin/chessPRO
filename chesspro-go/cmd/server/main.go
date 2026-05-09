package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/hibiken/asynq"
	"github.com/iamrpm/chesspro-go/internal/analysis"
	"github.com/iamrpm/chesspro-go/internal/auth"
	"github.com/iamrpm/chesspro-go/internal/chesscom"
	"github.com/iamrpm/chesspro-go/internal/config"
	"github.com/iamrpm/chesspro-go/internal/db"
	jwtpkg "github.com/iamrpm/chesspro-go/internal/jwt"
	"github.com/iamrpm/chesspro-go/internal/user"
)

func main() {
	cfg := config.Load()

	// DB
	pool := db.Connect(cfg.DatabaseURL)
	defer pool.Close()

	// Repos
	userRepo := user.NewRepository(pool)
	analysisRepo := analysis.NewRepository(pool)

	// JWT
	jwtMgr := jwtpkg.NewManager(cfg.JWTAccessSecret, cfg.JWTRefreshSecret)

	// Auth
	authSvc := auth.NewService(userRepo, jwtMgr)
	authMw := auth.NewMiddleware(jwtMgr, userRepo)
	authHandler := auth.NewHandler(authSvc, cfg)

	// Chess.com proxy
	chesscomHandler := chesscom.NewHandler(chesscom.NewClient())

	// Asynq client (for enqueuing jobs)
	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: cfg.RedisAddr})
	defer asynqClient.Close()

	// Gemini
	ctx := context.Background()
	geminiClient, err := analysis.NewGeminiClient(ctx, cfg.GeminiAPIKey)
	if err != nil {
		log.Fatalf("gemini init: %v", err)
	}

	// Stockfish
	sf := analysis.NewStockfish(cfg.StockfishPath)

	// Analysis
	analysisSvc := analysis.NewService(analysisRepo, asynqClient)
	analysisHandler := analysis.NewHandler(analysisSvc, analysisRepo)
	analysisWorker := analysis.NewWorker(analysisRepo, sf, geminiClient)

	// Asynq worker server
	asynqSrv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.RedisAddr},
		asynq.Config{Concurrency: 2},
	)
	mux := asynq.NewServeMux()
	mux.HandleFunc(analysis.TaskTypeAnalysis, analysisWorker.ProcessTask)
	go func() {
		if err := asynqSrv.Run(mux); err != nil {
			log.Printf("asynq server stopped: %v", err)
		}
	}()

	// Router
	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(corsMiddleware(cfg.CORSOrigin))

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "chesspro-go is running")
	})

	authHandler.Mount(r, authMw)
	chesscomHandler.Mount(r)
	analysisHandler.Mount(r, authMw)

	// 404 catch-all
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintln(w, `{"error":"not found"}`)
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 120 * time.Second, // long for analysis endpoint
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("server listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-quit
	log.Println("shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	asynqSrv.Shutdown()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
	log.Println("bye")
}

func corsMiddleware(origin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
