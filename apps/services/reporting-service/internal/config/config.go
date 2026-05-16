package config

import "os"

type Config struct {
	GRPCPort    string
	DatabaseURL string
	RabbitMQURL string
}

func Load() Config {
	return Config{
		GRPCPort: ":50055",
		DatabaseURL: getEnv(
			"DATABASE_URL",
			"postgres://campusflow:campusflow_password@127.0.0.1:5432/reporting_db?sslmode=disable",
		),
		RabbitMQURL: getEnv(
			"RABBITMQ_URL",
			"amqp://campusflow:campusflow_password@127.0.0.1:5672/",
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
