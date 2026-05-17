package config

import (
	"os"
	"time"
)

type Config struct {
	GRPCPort        string
	DatabaseURL     string
	RabbitMQURL     string
	JWTSecret       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

func Load() Config {
	return Config{
		GRPCPort: ":50051",
		DatabaseURL: getEnv(
			"DATABASE_URL",
			"postgres://campusflow:campusflow_password@127.0.0.1:5432/auth_db?sslmode=disable",
		),
		RabbitMQURL: getEnv(
			"RABBITMQ_URL",
			"amqp://campusflow:campusflow_password@127.0.0.1:5672/",
		),
		JWTSecret:       getEnv("JWT_SECRET", "campusflow_dev_secret_change_me"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
