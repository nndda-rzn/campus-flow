package model

type AcademicRequestSnapshot struct {
	RequestID       string
	RequestNumber   string
	StudentUserID   string
	ServiceCode     string
	ServiceName     string
	Title           string
	Status          string
	SourceEventID   string
	SourceEventType string
}

type StatusCount struct {
	Status string
	Total  int64
}

type AcademicDashboard struct {
	TotalRequests     int64
	SubmittedRequests int64
	VerifiedRequests  int64
	ApprovedRequests  int64
	RejectedRequests  int64
	CompletedRequests int64
	StatusCounts      []StatusCount
}