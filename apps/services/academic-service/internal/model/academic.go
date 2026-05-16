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
	CreatedAt         time.Time
	UpdatedAt         time.Time
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
