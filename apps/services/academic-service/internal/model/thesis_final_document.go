package model

import "time"

// ThesisFinalDocument represents a final thesis document submitted for lecturer review
type ThesisFinalDocument struct {
	ID                  string     `json:"id"`
	SupervisorRequestID string     `json:"supervisor_request_id"`
	StudentUserID       string     `json:"student_user_id"`
	LecturerUserID      string     `json:"lecturer_user_id"`

	DocumentType string `json:"document_type"` // PROPOSAL | DRAFT | FINAL | REVISED_FINAL
	Title        string `json:"title"`
	FileID       string `json:"file_id"`
	Filename     string `json:"filename"`
	Version      int    `json:"version"`

	Status string `json:"status"` // SUBMITTED | UNDER_REVIEW | APPROVED | REVISION_REQUESTED | REJECTED

	SubmittedAt time.Time  `json:"submitted_at"`
	ReviewedAt  *time.Time `json:"reviewed_at"`
	ApprovedAt  *time.Time `json:"approved_at"`

	LecturerNotes   string `json:"lecturer_notes"`
	RejectionReason string `json:"rejection_reason"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Derived fields
	StudentName  string `json:"student_name"`
	StudentNIM   string `json:"student_nim"`
	LecturerName string `json:"lecturer_name"`
	TopicTitle   string `json:"topic_title"`
}

// Document type constants
const (
	DocTypeProposal     = "PROPOSAL"
	DocTypeDraft        = "DRAFT"
	DocTypeFinal        = "FINAL"
	DocTypeRevisedFinal = "REVISED_FINAL"
)

// Status constants
const (
	TFDStatusSubmitted          = "SUBMITTED"
	TFDStatusUnderReview        = "UNDER_REVIEW"
	TFDStatusApproved           = "APPROVED"
	TFDStatusRevisionRequested  = "REVISION_REQUESTED"
	TFDStatusRejected           = "REJECTED"
)
