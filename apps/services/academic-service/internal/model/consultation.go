package model

import "time"

// ConsultationSlot represents a time slot created by lecturer for student consultations
type ConsultationSlot struct {
	ID              string
	LecturerUserID  string
	LecturerName    string // joined from lecturers table
	SlotDate        time.Time
	StartTime       string // HH:MM format
	EndTime         string // HH:MM format
	MaxBookings     int
	CurrentBookings int // computed
	Location        *string
	Notes           *string
	IsCancelled     bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// ConsultationBookingStatus represents the status of a booking
type ConsultationBookingStatus string

const (
	BookingStatusPending     ConsultationBookingStatus = "PENDING"
	BookingStatusApproved    ConsultationBookingStatus = "APPROVED"
	BookingStatusRejected    ConsultationBookingStatus = "REJECTED"
	BookingStatusCancelled   ConsultationBookingStatus = "CANCELLED"
	BookingStatusRescheduled ConsultationBookingStatus = "RESCHEDULED"
)

// ConsultationBooking represents a student's booking for a consultation slot
type ConsultationBooking struct {
	ID              string
	SlotID          string
	StudentUserID   string
	StudentName     string // joined
	StudentNIM      string // joined
	Topic           string
	Status          ConsultationBookingStatus
	LecturerNotes   *string
	ProposedSlotID  *string
	ProposedSlot    *ConsultationSlot // joined when rescheduled
	CreatedAt       time.Time
	UpdatedAt       time.Time

	// Slot info (joined)
	SlotDate     time.Time
	StartTime    string
	EndTime      string
	Location     *string
	LecturerName string
}
