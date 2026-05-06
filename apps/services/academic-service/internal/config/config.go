package config

import "os"

type Config struct {
	GRPCPort    string
	DatabaseURL string
}

func Load() Config {
	return Config{
		GRPCPort: ":50052",
		DatabaseURL: getEnv(
			"DATABASE_URL",
			"postgres://campusflow:campusflow_password@localhost:5432/academic_db?sslmode=disable",
		),
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}