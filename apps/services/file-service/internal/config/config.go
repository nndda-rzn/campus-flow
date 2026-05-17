package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	GRPCPort        string
	DatabaseURL     string
	RabbitMQURL     string
	MaxFileSize     int64
	AllowedMimeType map[string]bool
}

func Load() Config {
	return Config{
		GRPCPort: ":50053",
		DatabaseURL: getEnv(
			"DATABASE_URL",
			"postgres://campusflow:campusflow_password@127.0.0.1:5432/file_db?sslmode=disable",
		),
		RabbitMQURL: getEnv(
			"RABBITMQ_URL",
			"amqp://campusflow:campusflow_password@127.0.0.1:5672/",
		),
		MaxFileSize:     getEnvInt64("MAX_FILE_SIZE_BYTES", 10*1024*1024), // 10 MB
		AllowedMimeType: parseMimeWhitelist(getEnv("ALLOWED_MIME_TYPES", defaultMimeWhitelist)),
	}
}

// defaultMimeWhitelist covers the formats CampusFlow accepts for student
// supporting documents and Tata Usaha final documents.
const defaultMimeWhitelist = "" +
	"application/pdf," +
	"application/msword," +
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
	"image/jpeg,image/png"

func parseMimeWhitelist(raw string) map[string]bool {
	out := make(map[string]bool)
	for _, item := range strings.Split(raw, ",") {
		item = strings.ToLower(strings.TrimSpace(item))
		if item == "" {
			continue
		}
		out[item] = true
	}
	return out
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func getEnvInt64(key string, fallback int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
