package model

import "time"

type NoteTemplate struct {
	ID              string
	DepartmentID    string
	Category        string
	Title           string
	Body            string
	UsageCount      int32
	IsActive        bool
	CreatedByUserID string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
