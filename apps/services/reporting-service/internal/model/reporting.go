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

type SupervisorRequestSnapshot struct {
	RequestID       string
	RequestNumber   string
	StudentUserID   string
	TopicTitle      string
	Status          string
	LecturerID      string
	LecturerUserID  string
	SourceEventID   string
	SourceEventType string
}

type StatusCount struct {
	Status string
	Total  int64
}

type DashboardFilter struct {
	StartDate string // ISO date YYYY-MM-DD, optional
	EndDate   string
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

type SupervisorDashboard struct {
	TotalRequests     int64
	SubmittedRequests int64
	VerifiedRequests  int64
	AssignedRequests  int64
	AcceptedRequests  int64
	RejectedRequests  int64
	CompletedRequests int64
	StatusCounts      []StatusCount
}

type LecturerWorkloadItem struct {
	LecturerID     string
	LecturerUserID string
	LecturerName   string
	ActiveCount    int64 // ASSIGNED + ACCEPTED + COMPLETED
	AssignedCount  int64
	AcceptedCount  int64
	CompletedCount int64
	RejectedCount  int64
}

type DailyCount struct {
	Date  string
	Count int64
}

type AdminOperationalDashboard struct {
	PendingVerificationCount int64
	SLAAtRiskCount           int64
	SLABreachedCount         int64
	AvgVerificationTimeHours float64
	WeeklyThroughput         int64
	RequestsByDay            []DailyCount
}

type SLAAtRiskItem struct {
	RequestID      string
	RequestNumber  string
	Title          string
	StudentUserID  string
	Status         string
	DueAt          string
	CreatedAt      string
	HoursRemaining float64
}

type TrendDataPoint struct {
	Period         string
	SubmittedCount int64
	VerifiedCount  int64
	ApprovedCount  int64
	CompletedCount int64
	RejectedCount  int64
}

type ProcessingTimeReport struct {
	AvgSubmissionToVerificationHours float64
	AvgVerificationToApprovalHours   float64
	AvgApprovalToCompletionHours     float64
	AvgTotalProcessingHours          float64
	P90TotalHours                    float64
}
