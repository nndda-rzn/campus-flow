package model

import "time"

type User struct {
	ID           string
	FullName     string
	Email        string
	PasswordHash string
	Status       string
	Role         string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}