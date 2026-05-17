package model

import "time"

type AcademicYear struct {
	ID        string
	Code      string
	Name      string
	StartDate time.Time
	EndDate   time.Time
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

type UserDepartmentScope struct {
	UserID         string
	DepartmentID   string
	DepartmentName string
	DepartmentCode string
	CreatedAt      time.Time
}
