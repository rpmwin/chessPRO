package config

import (
	"log"
	"os"
)

type Config struct {
	Port               string
	DatabaseURL        string
	RedisAddr          string
	JWTAccessSecret    string
	JWTRefreshSecret   string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string
	ClientHomeURL      string
	GeminiAPIKey       string
	StockfishPath      string
	CORSOrigin         string
	AppEnv             string // "production" enables secure cookies
}

func Load() *Config {
	cfg := &Config{
		Port:               getEnv("PORT", "5000"),
		DatabaseURL:        required("DATABASE_URL"),
		RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
		JWTAccessSecret:    required("JWT_ACCESS_SECRET"),
		JWTRefreshSecret:   required("JWT_REFRESH_SECRET"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:  getEnv("GOOGLE_REDIRECT_URI", ""),
		ClientHomeURL:      getEnv("CLIENT_HOME_URL", "http://localhost:5173"),
		GeminiAPIKey:       required("GEMINI_API_KEY"),
		StockfishPath:      required("STOCKFISH_PATH"),
		CORSOrigin:         getEnv("CORS_ORIGIN", "http://localhost:5173"),
		AppEnv:             getEnv("APP_ENV", "development"),
	}
	return cfg
}

func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

func required(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
