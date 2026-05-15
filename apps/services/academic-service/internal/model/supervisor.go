package model

import "time"

type Lecturer struct {
	ID                 string
	UserID             string
	NIDN               string
	FullName           string
	Email              string
	Status             string
	MaxSupervisorQuota int32
}

type SupervisorChoice struct {
	LecturerID   string
	LecturerName string
	Priority     int32
}

type SupervisorRequest struct {
	ID                   string
	RequestNumber        string
	StudentUserID        string
	TopicTitle           string
	TopicDescription     string
	Status               string
	AssignedLecturerID   string
	AssignedLecturerName string
	Choices              []SupervisorChoice
	CreatedAt            time.Time
	UpdatedAt            time.Time
}
