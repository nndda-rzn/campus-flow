package model

import "time"

type RefreshToken struct {
	ID        string
	UserID    string
	TokenHash string
	IsRevoked bool
	CreatedAt time.Time
	ExpiresAt time.Time
}