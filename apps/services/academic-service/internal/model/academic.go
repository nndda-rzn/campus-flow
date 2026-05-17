package model

import "time"

type AcademicServiceItem struct {
	ID          string
	Code        string
	Name        string
	Description string
	IsActive    bool
}

type AcademicRequest struct {
	ID                string
	RequestNumber     string
	StudentUserID     string
	AcademicServiceID string
	ServiceCode       string
	ServiceName       string
	Title             string
	Description       string
	Status            string
	AcademicYearID    string
	AcademicYearCode  string
	CreatedAt         time.Time
	UpdatedAt         time.Time
	DueAt             *time.Time
	VerifiedAt        *time.Time
	ApprovedAt        *time.Time
	CompletedAt       *time.Time
}

type RequestStatusHistory struct {
	ID          string
	RequestID   string
	OldStatus   string
	NewStatus   string
	ActorUserID string
	Note        string
	CreatedAt   time.Time
}

// Announcement (FR-252).
type Announcement struct {
	ID           string
	Title        string
	Body         string
	Severity     string
	AuthorUserID string
	AuthorName   string
	TargetRoles  []string
	IsActive     bool
	StartsAt     time.Time
	EndsAt       *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
