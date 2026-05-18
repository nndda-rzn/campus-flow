package handler

import (
	"context"
	"time"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ConsultationHandler struct {
	svc *service.ConsultationService
}

func NewConsultationHandler(svc *service.ConsultationService) *ConsultationHandler {
	return &ConsultationHandler{svc: svc}
}

// ─── Slots (Lecturer) ───────────────────────────────────────────────────────

func (h *ConsultationHandler) ListConsultationSlots(ctx context.Context, req *academicv1.ListConsultationSlotsRequest) (*academicv1.ListConsultationSlotsResponse, error) {
	var startDate, endDate *time.Time

	if req.StartDate != "" {
		t, err := time.Parse(time.DateOnly, req.StartDate)
		if err == nil {
			startDate = &t
		}
	}
	if req.EndDate != "" {
		t, err := time.Parse(time.DateOnly, req.EndDate)
		if err == nil {
			endDate = &t
		}
	}

	slots, err := h.svc.ListSlotsByLecturer(ctx, req.LecturerUserId, startDate, endDate, req.IncludeCancelled)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list slots: %v", err)
	}

	return &academicv1.ListConsultationSlotsResponse{
		Slots: h.mapSlotsToProto(slots),
	}, nil
}

func (h *ConsultationHandler) CreateConsultationSlot(ctx context.Context, req *academicv1.CreateConsultationSlotRequest) (*academicv1.ConsultationSlotResponse, error) {
	slotDate, err := time.Parse(time.DateOnly, req.SlotDate)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid slot_date format (YYYY-MM-DD expected)")
	}

	var location, notes *string
	if req.Location != "" {
		location = &req.Location
	}
	if req.Notes != "" {
		notes = &req.Notes
	}

	maxBookings := int(req.MaxBookings)
	if maxBookings <= 0 {
		maxBookings = 1
	}

	slot := &model.ConsultationSlot{
		LecturerUserID: req.LecturerUserId,
		SlotDate:       slotDate,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		MaxBookings:    maxBookings,
		Location:       location,
		Notes:          notes,
	}

	created, err := h.svc.CreateSlot(ctx, slot)
	if err != nil {
		if err == service.ErrSlotInPast {
			return nil, status.Errorf(codes.InvalidArgument, "cannot create slot in the past")
		}
		if err == service.ErrSlotOverlap {
			return nil, status.Errorf(codes.AlreadyExists, "slot overlaps with existing slot")
		}
		return nil, status.Errorf(codes.Internal, "failed to create slot: %v", err)
	}

	return &academicv1.ConsultationSlotResponse{
		Slot: h.mapSlotToProto(created),
	}, nil
}

func (h *ConsultationHandler) UpdateConsultationSlot(ctx context.Context, req *academicv1.UpdateConsultationSlotRequest) (*academicv1.ConsultationSlotResponse, error) {
	slotDate, err := time.Parse(time.DateOnly, req.SlotDate)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid slot_date format (YYYY-MM-DD expected)")
	}

	var location, notes *string
	if req.Location != "" {
		location = &req.Location
	}
	if req.Notes != "" {
		notes = &req.Notes
	}

	maxBookings := int(req.MaxBookings)
	if maxBookings <= 0 {
		maxBookings = 1
	}

	slot := &model.ConsultationSlot{
		ID:             req.Id,
		LecturerUserID: req.LecturerUserId,
		SlotDate:       slotDate,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		MaxBookings:    maxBookings,
		Location:       location,
		Notes:          notes,
	}

	err = h.svc.UpdateSlot(ctx, slot)
	if err != nil {
		if err == repository.ErrSlotNotFound {
			return nil, status.Errorf(codes.NotFound, "slot not found")
		}
		if err == service.ErrSlotOverlap {
			return nil, status.Errorf(codes.AlreadyExists, "slot overlaps with existing slot")
		}
		return nil, status.Errorf(codes.Internal, "failed to update slot: %v", err)
	}

	updated, _ := h.svc.GetSlotByID(ctx, req.Id)
	return &academicv1.ConsultationSlotResponse{
		Slot: h.mapSlotToProto(updated),
	}, nil
}

func (h *ConsultationHandler) CancelConsultationSlot(ctx context.Context, req *academicv1.CancelConsultationSlotRequest) (*academicv1.ConsultationSlotResponse, error) {
	_, err := h.svc.CancelSlot(ctx, req.Id, req.LecturerUserId)
	if err != nil {
		if err == repository.ErrSlotNotFound {
			return nil, status.Errorf(codes.NotFound, "slot not found")
		}
		return nil, status.Errorf(codes.Internal, "failed to cancel slot: %v", err)
	}

	// TODO: Send notifications to affected students

	slot, _ := h.svc.GetSlotByID(ctx, req.Id)
	return &academicv1.ConsultationSlotResponse{
		Slot: h.mapSlotToProto(slot),
	}, nil
}

// ─── Bookings (Lecturer) ────────────────────────────────────────────────────

func (h *ConsultationHandler) ListLecturerBookings(ctx context.Context, req *academicv1.ListLecturerBookingsRequest) (*academicv1.ListConsultationBookingsResponse, error) {
	bookings, err := h.svc.ListBookingsByLecturer(ctx, req.LecturerUserId, req.Status)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list bookings: %v", err)
	}

	return &academicv1.ListConsultationBookingsResponse{
		Bookings: h.mapBookingsToProto(bookings),
	}, nil
}

func (h *ConsultationHandler) ApproveBooking(ctx context.Context, req *academicv1.BookingActionRequest) (*academicv1.ConsultationBookingResponse, error) {
	booking, err := h.svc.ApproveBooking(ctx, req.BookingId, req.ActorUserId, req.Notes)
	if err != nil {
		return nil, h.mapBookingError(err)
	}

	return &academicv1.ConsultationBookingResponse{
		Booking: h.mapBookingToProto(booking),
	}, nil
}

func (h *ConsultationHandler) RejectBooking(ctx context.Context, req *academicv1.BookingActionRequest) (*academicv1.ConsultationBookingResponse, error) {
	booking, err := h.svc.RejectBooking(ctx, req.BookingId, req.ActorUserId, req.Notes)
	if err != nil {
		return nil, h.mapBookingError(err)
	}

	return &academicv1.ConsultationBookingResponse{
		Booking: h.mapBookingToProto(booking),
	}, nil
}

func (h *ConsultationHandler) RescheduleBooking(ctx context.Context, req *academicv1.RescheduleBookingRequest) (*academicv1.ConsultationBookingResponse, error) {
	booking, err := h.svc.RescheduleBooking(ctx, req.BookingId, req.ActorUserId, req.Notes, req.ProposedSlotId)
	if err != nil {
		return nil, h.mapBookingError(err)
	}

	return &academicv1.ConsultationBookingResponse{
		Booking: h.mapBookingToProto(booking),
	}, nil
}

// ─── Slots & Bookings (Student) ─────────────────────────────────────────────

func (h *ConsultationHandler) ListAvailableSlots(ctx context.Context, req *academicv1.ListAvailableSlotsRequest) (*academicv1.ListConsultationSlotsResponse, error) {
	slots, err := h.svc.ListAvailableSlotsForStudent(ctx, req.StudentUserId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list available slots: %v", err)
	}

	return &academicv1.ListConsultationSlotsResponse{
		Slots: h.mapSlotsToProto(slots),
	}, nil
}

func (h *ConsultationHandler) ListStudentBookings(ctx context.Context, req *academicv1.ListStudentBookingsRequest) (*academicv1.ListConsultationBookingsResponse, error) {
	bookings, err := h.svc.ListBookingsByStudent(ctx, req.StudentUserId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list bookings: %v", err)
	}

	return &academicv1.ListConsultationBookingsResponse{
		Bookings: h.mapBookingsToProto(bookings),
	}, nil
}

func (h *ConsultationHandler) CreateBooking(ctx context.Context, req *academicv1.CreateBookingRequest) (*academicv1.ConsultationBookingResponse, error) {
	booking, err := h.svc.CreateBooking(ctx, req.SlotId, req.StudentUserId, req.Topic)
	if err != nil {
		if err == repository.ErrSlotNotFound {
			return nil, status.Errorf(codes.NotFound, "slot not found")
		}
		if err == repository.ErrSlotFull {
			return nil, status.Errorf(codes.ResourceExhausted, "slot is fully booked")
		}
		if err == repository.ErrBookingTooLate {
			return nil, status.Errorf(codes.FailedPrecondition, "booking must be made at least 12 hours before slot")
		}
		if err == repository.ErrAlreadyBooked {
			return nil, status.Errorf(codes.AlreadyExists, "you have already booked this slot")
		}
		return nil, status.Errorf(codes.Internal, "failed to create booking: %v", err)
	}

	// Fetch full booking with joined data
	fullBooking, _ := h.svc.ListBookingsByStudent(ctx, req.StudentUserId)
	for _, b := range fullBooking {
		if b.ID == booking.ID {
			return &academicv1.ConsultationBookingResponse{
				Booking: h.mapBookingToProto(&b),
			}, nil
		}
	}

	return &academicv1.ConsultationBookingResponse{
		Booking: h.mapBookingToProto(booking),
	}, nil
}

func (h *ConsultationHandler) CancelBooking(ctx context.Context, req *academicv1.CancelBookingRequest) (*academicv1.ConsultationBookingResponse, error) {
	booking, err := h.svc.CancelBooking(ctx, req.BookingId, req.StudentUserId)
	if err != nil {
		if err == repository.ErrBookingNotFound {
			return nil, status.Errorf(codes.NotFound, "booking not found")
		}
		if err == repository.ErrNotYourBooking {
			return nil, status.Errorf(codes.PermissionDenied, "this booking does not belong to you")
		}
		if err == service.ErrInvalidBookingAction {
			return nil, status.Errorf(codes.FailedPrecondition, "cannot cancel booking with current status")
		}
		return nil, status.Errorf(codes.Internal, "failed to cancel booking: %v", err)
	}

	return &academicv1.ConsultationBookingResponse{
		Booking: h.mapBookingToProto(booking),
	}, nil
}

func (h *ConsultationHandler) AcceptReschedule(ctx context.Context, req *academicv1.AcceptRescheduleRequest) (*academicv1.ConsultationBookingResponse, error) {
	booking, err := h.svc.AcceptReschedule(ctx, req.BookingId, req.StudentUserId)
	if err != nil {
		if err == repository.ErrBookingNotFound {
			return nil, status.Errorf(codes.NotFound, "booking not found")
		}
		if err == repository.ErrNotYourBooking {
			return nil, status.Errorf(codes.PermissionDenied, "this booking does not belong to you")
		}
		if err == service.ErrInvalidBookingAction {
			return nil, status.Errorf(codes.FailedPrecondition, "booking is not in rescheduled status")
		}
		return nil, status.Errorf(codes.Internal, "failed to accept reschedule: %v", err)
	}

	return &academicv1.ConsultationBookingResponse{
		Booking: h.mapBookingToProto(booking),
	}, nil
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func (h *ConsultationHandler) mapSlotToProto(slot *model.ConsultationSlot) *academicv1.ConsultationSlot {
	if slot == nil {
		return nil
	}

	var location, notes string
	if slot.Location != nil {
		location = *slot.Location
	}
	if slot.Notes != nil {
		notes = *slot.Notes
	}

	return &academicv1.ConsultationSlot{
		Id:              slot.ID,
		LecturerUserId:  slot.LecturerUserID,
		LecturerName:    slot.LecturerName,
		SlotDate:        slot.SlotDate.Format(time.DateOnly),
		StartTime:       slot.StartTime,
		EndTime:         slot.EndTime,
		MaxBookings:     int32(slot.MaxBookings),
		CurrentBookings: int32(slot.CurrentBookings),
		Location:        location,
		Notes:           notes,
		IsCancelled:     slot.IsCancelled,
		CreatedAt:       slot.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       slot.UpdatedAt.Format(time.RFC3339),
	}
}

func (h *ConsultationHandler) mapSlotsToProto(slots []model.ConsultationSlot) []*academicv1.ConsultationSlot {
	result := make([]*academicv1.ConsultationSlot, 0, len(slots))
	for _, s := range slots {
		result = append(result, h.mapSlotToProto(&s))
	}
	return result
}

func (h *ConsultationHandler) mapBookingToProto(booking *model.ConsultationBooking) *academicv1.ConsultationBooking {
	if booking == nil {
		return nil
	}

	var lecturerNotes, proposedSlotID string
	if booking.LecturerNotes != nil {
		lecturerNotes = *booking.LecturerNotes
	}
	if booking.ProposedSlotID != nil {
		proposedSlotID = *booking.ProposedSlotID
	}

	var location string
	if booking.Location != nil {
		location = *booking.Location
	}

	return &academicv1.ConsultationBooking{
		Id:             booking.ID,
		SlotId:         booking.SlotID,
		StudentUserId:  booking.StudentUserID,
		StudentName:    booking.StudentName,
		StudentNim:     booking.StudentNIM,
		Topic:          booking.Topic,
		Status:         string(booking.Status),
		LecturerNotes:  lecturerNotes,
		ProposedSlotId: proposedSlotID,
		ProposedSlot:   h.mapSlotToProto(booking.ProposedSlot),
		CreatedAt:      booking.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      booking.UpdatedAt.Format(time.RFC3339),
		SlotDate:       booking.SlotDate.Format(time.DateOnly),
		StartTime:      booking.StartTime,
		EndTime:        booking.EndTime,
		Location:       location,
		LecturerName:   booking.LecturerName,
	}
}

func (h *ConsultationHandler) mapBookingsToProto(bookings []model.ConsultationBooking) []*academicv1.ConsultationBooking {
	result := make([]*academicv1.ConsultationBooking, 0, len(bookings))
	for _, b := range bookings {
		result = append(result, h.mapBookingToProto(&b))
	}
	return result
}

func (h *ConsultationHandler) mapBookingError(err error) error {
	if err == repository.ErrBookingNotFound {
		return status.Errorf(codes.NotFound, "booking not found")
	}
	if err == service.ErrNotSlotOwner {
		return status.Errorf(codes.PermissionDenied, "you are not the owner of this slot")
	}
	if err == service.ErrInvalidBookingAction {
		return status.Errorf(codes.FailedPrecondition, "invalid action for current booking status")
	}
	return status.Errorf(codes.Internal, "failed to process booking: %v", err)
}
