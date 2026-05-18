package service

import (
	"context"
	"errors"
	"time"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrSlotInPast        = errors.New("cannot create slot in the past")
	ErrSlotOverlap       = errors.New("slot overlaps with existing slot")
	ErrNotSlotOwner      = errors.New("you are not the owner of this slot")
	ErrInvalidBookingAction = errors.New("invalid booking action for current status")
)

type ConsultationService struct {
	repo *repository.ConsultationRepository
}

func NewConsultationService(repo *repository.ConsultationRepository) *ConsultationService {
	return &ConsultationService{repo: repo}
}

// ─── Slots (Lecturer) ───────────────────────────────────────────────────────

func (s *ConsultationService) CreateSlot(ctx context.Context, slot *model.ConsultationSlot) (*model.ConsultationSlot, error) {
	// Validate slot is not in the past
	now := time.Now()
	slotDate := slot.SlotDate
	if slotDate.Before(now.Truncate(24 * time.Hour)) {
		return nil, ErrSlotInPast
	}

	// Check for overlap
	overlap, err := s.repo.CheckSlotOverlap(ctx, slot.LecturerUserID, slot.SlotDate, slot.StartTime, slot.EndTime, nil)
	if err != nil {
		return nil, err
	}
	if overlap {
		return nil, ErrSlotOverlap
	}

	return s.repo.CreateSlot(ctx, slot)
}

func (s *ConsultationService) UpdateSlot(ctx context.Context, slot *model.ConsultationSlot) error {
	// Check for overlap (excluding current slot)
	overlap, err := s.repo.CheckSlotOverlap(ctx, slot.LecturerUserID, slot.SlotDate, slot.StartTime, slot.EndTime, &slot.ID)
	if err != nil {
		return err
	}
	if overlap {
		return ErrSlotOverlap
	}

	return s.repo.UpdateSlot(ctx, slot)
}

func (s *ConsultationService) CancelSlot(ctx context.Context, slotID, lecturerUserID string) ([]model.ConsultationBooking, error) {
	// Cancel the slot
	err := s.repo.CancelSlot(ctx, slotID, lecturerUserID)
	if err != nil {
		return nil, err
	}

	// Cancel all bookings and return them for notification
	return s.repo.CancelAllBookingsForSlot(ctx, slotID)
}

func (s *ConsultationService) ListSlotsByLecturer(ctx context.Context, lecturerUserID string, startDate, endDate *time.Time, includeCancelled bool) ([]model.ConsultationSlot, error) {
	return s.repo.ListSlotsByLecturer(ctx, lecturerUserID, startDate, endDate, includeCancelled)
}

func (s *ConsultationService) GetSlotByID(ctx context.Context, id string) (*model.ConsultationSlot, error) {
	return s.repo.GetSlotByID(ctx, id)
}

// ─── Slots (Student) ────────────────────────────────────────────────────────

func (s *ConsultationService) ListAvailableSlotsForStudent(ctx context.Context, studentUserID string) ([]model.ConsultationSlot, error) {
	return s.repo.GetAvailableSlotsForStudent(ctx, studentUserID)
}

// ─── Bookings (Lecturer) ────────────────────────────────────────────────────

func (s *ConsultationService) ListBookingsByLecturer(ctx context.Context, lecturerUserID, statusFilter string) ([]model.ConsultationBooking, error) {
	return s.repo.ListBookingsByLecturer(ctx, lecturerUserID, statusFilter)
}

func (s *ConsultationService) ApproveBooking(ctx context.Context, bookingID, lecturerUserID, notes string) (*model.ConsultationBooking, error) {
	booking, err := s.repo.GetBookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}

	// Validate lecturer owns the slot
	slot, err := s.repo.GetSlotByID(ctx, booking.SlotID)
	if err != nil {
		return nil, err
	}
	if slot.LecturerUserID != lecturerUserID {
		return nil, ErrNotSlotOwner
	}

	// Validate status transition
	if booking.Status != model.BookingStatusPending {
		return nil, ErrInvalidBookingAction
	}

	var notesPtr *string
	if notes != "" {
		notesPtr = &notes
	}

	err = s.repo.UpdateBookingStatus(ctx, bookingID, model.BookingStatusApproved, notesPtr, nil)
	if err != nil {
		return nil, err
	}

	return s.repo.GetBookingByID(ctx, bookingID)
}

func (s *ConsultationService) RejectBooking(ctx context.Context, bookingID, lecturerUserID, notes string) (*model.ConsultationBooking, error) {
	booking, err := s.repo.GetBookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}

	// Validate lecturer owns the slot
	slot, err := s.repo.GetSlotByID(ctx, booking.SlotID)
	if err != nil {
		return nil, err
	}
	if slot.LecturerUserID != lecturerUserID {
		return nil, ErrNotSlotOwner
	}

	// Validate status transition
	if booking.Status != model.BookingStatusPending {
		return nil, ErrInvalidBookingAction
	}

	var notesPtr *string
	if notes != "" {
		notesPtr = &notes
	}

	err = s.repo.UpdateBookingStatus(ctx, bookingID, model.BookingStatusRejected, notesPtr, nil)
	if err != nil {
		return nil, err
	}

	return s.repo.GetBookingByID(ctx, bookingID)
}

func (s *ConsultationService) RescheduleBooking(ctx context.Context, bookingID, lecturerUserID, notes, proposedSlotID string) (*model.ConsultationBooking, error) {
	booking, err := s.repo.GetBookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}

	// Validate lecturer owns the slot
	slot, err := s.repo.GetSlotByID(ctx, booking.SlotID)
	if err != nil {
		return nil, err
	}
	if slot.LecturerUserID != lecturerUserID {
		return nil, ErrNotSlotOwner
	}

	// Validate status transition
	if booking.Status != model.BookingStatusPending {
		return nil, ErrInvalidBookingAction
	}

	// Validate proposed slot exists and belongs to same lecturer
	proposedSlot, err := s.repo.GetSlotByID(ctx, proposedSlotID)
	if err != nil {
		return nil, err
	}
	if proposedSlot.LecturerUserID != lecturerUserID {
		return nil, ErrNotSlotOwner
	}

	var notesPtr *string
	if notes != "" {
		notesPtr = &notes
	}

	err = s.repo.UpdateBookingStatus(ctx, bookingID, model.BookingStatusRescheduled, notesPtr, &proposedSlotID)
	if err != nil {
		return nil, err
	}

	return s.repo.GetBookingByID(ctx, bookingID)
}

// ─── Bookings (Student) ─────────────────────────────────────────────────────

func (s *ConsultationService) ListBookingsByStudent(ctx context.Context, studentUserID string) ([]model.ConsultationBooking, error) {
	return s.repo.ListBookingsByStudent(ctx, studentUserID)
}

func (s *ConsultationService) CreateBooking(ctx context.Context, slotID, studentUserID, topic string) (*model.ConsultationBooking, error) {
	// Validate student can book this slot
	err := s.repo.ValidateStudentCanBook(ctx, studentUserID, slotID)
	if err != nil {
		return nil, err
	}

	booking := &model.ConsultationBooking{
		SlotID:        slotID,
		StudentUserID: studentUserID,
		Topic:         topic,
	}

	return s.repo.CreateBooking(ctx, booking)
}

func (s *ConsultationService) CancelBooking(ctx context.Context, bookingID, studentUserID string) (*model.ConsultationBooking, error) {
	booking, err := s.repo.GetBookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}

	// Validate student owns the booking
	if booking.StudentUserID != studentUserID {
		return nil, repository.ErrNotYourBooking
	}

	// Validate status transition (can only cancel PENDING or RESCHEDULED)
	if booking.Status != model.BookingStatusPending && booking.Status != model.BookingStatusRescheduled {
		return nil, ErrInvalidBookingAction
	}

	err = s.repo.UpdateBookingStatus(ctx, bookingID, model.BookingStatusCancelled, nil, nil)
	if err != nil {
		return nil, err
	}

	return s.repo.GetBookingByID(ctx, bookingID)
}

func (s *ConsultationService) AcceptReschedule(ctx context.Context, bookingID, studentUserID string) (*model.ConsultationBooking, error) {
	booking, err := s.repo.GetBookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}

	// Validate student owns the booking
	if booking.StudentUserID != studentUserID {
		return nil, repository.ErrNotYourBooking
	}

	// Validate status is RESCHEDULED
	if booking.Status != model.BookingStatusRescheduled {
		return nil, ErrInvalidBookingAction
	}

	// Validate proposed slot exists
	if booking.ProposedSlotID == nil {
		return nil, ErrInvalidBookingAction
	}

	// Create new booking for proposed slot
	newBooking := &model.ConsultationBooking{
		SlotID:        *booking.ProposedSlotID,
		StudentUserID: studentUserID,
		Topic:         booking.Topic,
	}

	createdBooking, err := s.repo.CreateBooking(ctx, newBooking)
	if err != nil {
		return nil, err
	}

	// Mark old booking as cancelled
	_ = s.repo.UpdateBookingStatus(ctx, bookingID, model.BookingStatusCancelled, nil, nil)

	return s.repo.GetBookingByID(ctx, createdBooking.ID)
}
