package db

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(databaseURL string) *pgxpool.Pool {
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("unable to create DB pool: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("unable to reach DB: %v", err)
	}
	log.Println("connected to postgres")
	return pool
}
