package config

import "os"

type Config struct {
	GRPCPort    string
	DatabaseURL string
	RabbitMQURL string
}

func Load() Config {
	return Config{
		GRPCPort: ":50052",
		DatabaseURL: getEnv(
			"DATABASE_URL",
			"postgres://campusflow:campusflow_password@localhost:5432/academic_db?sslmode=disable",
		),
		RabbitMQURL: getEnv(
			"RABBITMQ_URL",
			"amqp://campusflow:campusflow_password@localhost:5672/",
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