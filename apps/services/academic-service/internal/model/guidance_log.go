package model

import "time"

// GuidanceLogAttachment represents a file attached to a guidance log
type GuidanceLogAttachment struct {
	FileID         string    `json:"file_id"`
	Filename       string    `json:"filename"`
	UploadedBy     string    `json:"uploaded_by"`
	UploadedByName string    `json:"uploaded_by_name,omitempty"`
	UploadedAt     time.Time `json:"uploaded_at"`
}

// GuidanceLog represents a session between student and supervisor
type GuidanceLog struct {
	ID                  string     `json:"id"`
	StudentUserID       string     `json:"student_user_id"`
	SupervisorRequestID string     `json:"supervisor_request_id"`
	LecturerUserID      string     `json:"lecturer_user_id"`
	SessionDate         time.Time  `json:"session_date"`
	StartTime           *time.Time `json:"start_time"`
	EndTime             *time.Time `json:"end_time"`
	Topic               string     `json:"topic"`
	DiscussionSummary   string     `json:"discussion_summary"`
	NextAction          string     `json:"next_action"`
	Status              string     `json:"status"` // DRAFT, SUBMITTED, APPROVED, REVISION_REQUIRED
	SubmittedAt         *time.Time `json:"submitted_at"`
	SupervisorFeedback  string     `json:"supervisor_feedback"`
	ApprovedAt          *time.Time `json:"approved_at"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`

	// Derived fields
	StudentName  string `json:"student_name"`
	LecturerName string `json:"lecturer_name"`

	// Enhanced fields
	LecturerNotes string                  `json:"lecturer_notes,omitempty"`
	MilestoneID   *string                 `json:"milestone_id,omitempty"`
	MilestoneName string                  `json:"milestone_name,omitempty"`
	MilestoneCode string                  `json:"milestone_code,omitempty"`
	Attachments   []GuidanceLogAttachment `json:"attachments"`
}
