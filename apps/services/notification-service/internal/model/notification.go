package model

import (
	"time"
)

type Notification struct {
	ID         string
	UserID     string
	Title      string
	Message    string
	Type       string
	EntityType string
	EntityID   string
	IsRead     bool
	CreatedAt  time.Time
	ReadAt     *time.Time
}