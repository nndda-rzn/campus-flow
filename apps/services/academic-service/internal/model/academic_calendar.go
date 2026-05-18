package model

import "time"

// AcademicCalendar represents an event in the academic year
type AcademicCalendar struct {
	ID             string    `json:"id"`
	AcademicYearID string    `json:"academic_year_id"`
	DepartmentID   *string   `json:"department_id"` // null means all departments
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	EventType      string    `json:"event_type"` // UTS, UAS, REGISTRATION, HOLIDAY, DEADLINE, SEMINAR, OTHER
	StartDate      time.Time `json:"start_date"`
	EndDate        time.Time `json:"end_date"`
	IsAllDay       bool      `json:"is_all_day"`
	TargetRoles    []string  `json:"target_roles"`
	IsActive       bool      `json:"is_active"`
	CreatedByUserID string   `json:"created_by_user_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
