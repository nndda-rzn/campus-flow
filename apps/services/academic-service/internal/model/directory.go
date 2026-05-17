package model

import "time"

// Department represents a program studi / department record.
type Department struct {
	ID        string
	Code      string
	Name      string
	CreatedAt time.Time
}

// Student represents a student profile in the directory.
type Student struct {
	ID             string
	UserID         string
	NIM            string
	FullName       string
	Email          string
	DepartmentID   string
	DepartmentName string
	Status         string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// LecturerProfile is the full lecturer record (richer than the existing
// Lecturer used by supervisor flows). Kept as a separate type so existing
// supervisor code keeps working while admin features access the full record.
type LecturerProfile struct {
	ID                 string
	UserID             string
	NIDN               string
	FullName           string
	Email              string
	DepartmentID       string
	DepartmentName     string
	Status             string
	MaxSupervisorQuota int32
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
