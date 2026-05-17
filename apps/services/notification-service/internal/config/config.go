package config

import "os"

type Config struct {
	GRPCPort        string
	DatabaseURL     string
	RabbitMQURL     string
	AuthServiceAddr string
}

func Load() Config {
	return Config{
		GRPCPort: ":50054",
		DatabaseURL: getEnv(
			"DATABASE_URL",
			"postgres://campusflow:campusflow_password@127.0.0.1:5432/notification_db?sslmode=disable",
		),
		RabbitMQURL: getEnv(
			"RABBITMQ_URL",
			"amqp://campusflow:campusflow_password@127.0.0.1:5672/",
		),
		AuthServiceAddr: getEnv("AUTH_SERVICE_ADDR", "127.0.0.1:50051"),
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
