package config

import "os"

type Config struct {
	GRPCPort    string
	DatabaseURL string
}

func Load() Config {
	return Config{
		GRPCPort: ":50053",
		DatabaseURL: getEnv(
			"DATABASE_URL",
			"postgres://campusflow:campusflow_password@127.0.0.1:5432/file_db?sslmode=disable",
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
