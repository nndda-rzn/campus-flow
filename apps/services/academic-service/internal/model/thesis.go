package model

import "time"

// ThesisMilestone represents a milestone definition per department
type ThesisMilestone struct {
	ID            string    `json:"id"`
	DepartmentID  string    `json:"department_id"`
	Code          string    `json:"code"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	SequenceOrder int       `json:"sequence_order"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// ThesisProgress represents a student's progress on a specific milestone
type ThesisProgress struct {
	ID                  string     `json:"id"`
	StudentUserID       string     `json:"student_user_id"`
	SupervisorRequestID string     `json:"supervisor_request_id"`
	MilestoneID         string     `json:"milestone_id"`
	Status              string     `json:"status"` // NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED
	TargetDate          *time.Time `json:"target_date"`
	CompletedAt         *time.Time `json:"completed_at"`
	Notes               string     `json:"notes"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`

	// Derived fields
	MilestoneName string `json:"milestone_name"`
	MilestoneCode string `json:"milestone_code"`
	SequenceOrder int    `json:"sequence_order"`
}
