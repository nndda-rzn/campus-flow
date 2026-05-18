package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	academicv1 "campus-flow/proto/gen/academic/v1"
	"campus-flow/apps/services/api-gateway/internal/middleware"
)

type ConsultationHandler struct {
	client academicv1.AcademicServiceClient
}

func NewConsultationHandler(client academicv1.AcademicServiceClient) *ConsultationHandler {
	return &ConsultationHandler{client: client}
}

// ─── Lecturer Slots ─────────────────────────────────────────────────────────

func (h *ConsultationHandler) ListLecturerSlots(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.ListConsultationSlots(r.Context(), &academicv1.ListConsultationSlotsRequest{
		LecturerUserId:   userID,
		StartDate:        r.URL.Query().Get("start_date"),
		EndDate:          r.URL.Query().Get("end_date"),
		IncludeCancelled: r.URL.Query().Get("include_cancelled") == "true",
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to list slots"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]interface{}{"items": res.Slots},
	})
}

func (h *ConsultationHandler) CreateSlot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	var payload struct {
		SlotDate    string `json:"slot_date"`
		StartTime   string `json:"start_time"`
		EndTime     string `json:"end_time"`
		MaxBookings int32  `json:"max_bookings"`
		Location    string `json:"location"`
		Notes       string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.CreateConsultationSlot(r.Context(), &academicv1.CreateConsultationSlotRequest{
		LecturerUserId: userID,
		SlotDate:       payload.SlotDate,
		StartTime:      payload.StartTime,
		EndTime:        payload.EndTime,
		MaxBookings:    payload.MaxBookings,
		Location:       payload.Location,
		Notes:          payload.Notes,
	})

	if err != nil {
		if strings.Contains(err.Error(), "InvalidArgument") {
			writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid slot data"})
			return
		}
		if strings.Contains(err.Error(), "AlreadyExists") {
			writeJSON(w, http.StatusConflict, APIResponse{Success: false, Message: "Slot overlaps with existing slot"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to create slot"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "Slot created successfully",
		Data:    res.Slot,
	})
}

func (h *ConsultationHandler) RouteLecturerSlotByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/lecturer/consultation-slots/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "slot ID is required"})
		return
	}
	slotID := parts[0]

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	switch r.Method {
	case http.MethodPut:
		h.updateSlot(w, r, slotID, userID)
	case http.MethodDelete:
		h.cancelSlot(w, r, slotID, userID)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
	}
}

func (h *ConsultationHandler) updateSlot(w http.ResponseWriter, r *http.Request, slotID, userID string) {
	var payload struct {
		SlotDate    string `json:"slot_date"`
		StartTime   string `json:"start_time"`
		EndTime     string `json:"end_time"`
		MaxBookings int32  `json:"max_bookings"`
		Location    string `json:"location"`
		Notes       string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.UpdateConsultationSlot(r.Context(), &academicv1.UpdateConsultationSlotRequest{
		Id:             slotID,
		LecturerUserId: userID,
		SlotDate:       payload.SlotDate,
		StartTime:      payload.StartTime,
		EndTime:        payload.EndTime,
		MaxBookings:    payload.MaxBookings,
		Location:       payload.Location,
		Notes:          payload.Notes,
	})

	if err != nil {
		if strings.Contains(err.Error(), "NotFound") {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Slot not found"})
			return
		}
		if strings.Contains(err.Error(), "AlreadyExists") {
			writeJSON(w, http.StatusConflict, APIResponse{Success: false, Message: "Slot overlaps with existing slot"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to update slot"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Slot updated successfully",
		Data:    res.Slot,
	})
}

func (h *ConsultationHandler) cancelSlot(w http.ResponseWriter, r *http.Request, slotID, userID string) {
	res, err := h.client.CancelConsultationSlot(r.Context(), &academicv1.CancelConsultationSlotRequest{
		Id:             slotID,
		LecturerUserId: userID,
	})

	if err != nil {
		if strings.Contains(err.Error(), "NotFound") {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Slot not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to cancel slot"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Slot cancelled successfully",
		Data:    res.Slot,
	})
}

// ─── Lecturer Bookings ──────────────────────────────────────────────────────

func (h *ConsultationHandler) ListLecturerBookings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.ListLecturerBookings(r.Context(), &academicv1.ListLecturerBookingsRequest{
		LecturerUserId: userID,
		Status:         r.URL.Query().Get("status"),
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to list bookings"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]interface{}{"items": res.Bookings},
	})
}

func (h *ConsultationHandler) RouteLecturerBookingAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/lecturer/consultation-bookings/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "booking ID and action required"})
		return
	}
	bookingID := parts[0]
	action := parts[1]

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	switch action {
	case "approve":
		h.approveBooking(w, r, bookingID, userID)
	case "reject":
		h.rejectBooking(w, r, bookingID, userID)
	case "reschedule":
		h.rescheduleBooking(w, r, bookingID, userID)
	default:
		writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Unknown action"})
	}
}

func (h *ConsultationHandler) approveBooking(w http.ResponseWriter, r *http.Request, bookingID, userID string) {
	var payload struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&payload)

	res, err := h.client.ApproveBooking(r.Context(), &academicv1.BookingActionRequest{
		BookingId:   bookingID,
		ActorUserId: userID,
		Notes:       payload.Notes,
	})

	if err != nil {
		h.handleBookingError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Booking approved",
		Data:    res.Booking,
	})
}

func (h *ConsultationHandler) rejectBooking(w http.ResponseWriter, r *http.Request, bookingID, userID string) {
	var payload struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&payload)

	res, err := h.client.RejectBooking(r.Context(), &academicv1.BookingActionRequest{
		BookingId:   bookingID,
		ActorUserId: userID,
		Notes:       payload.Notes,
	})

	if err != nil {
		h.handleBookingError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Booking rejected",
		Data:    res.Booking,
	})
}

func (h *ConsultationHandler) rescheduleBooking(w http.ResponseWriter, r *http.Request, bookingID, userID string) {
	var payload struct {
		Notes          string `json:"notes"`
		ProposedSlotID string `json:"proposed_slot_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	if payload.ProposedSlotID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "proposed_slot_id is required"})
		return
	}

	res, err := h.client.RescheduleBooking(r.Context(), &academicv1.RescheduleBookingRequest{
		BookingId:      bookingID,
		ActorUserId:    userID,
		Notes:          payload.Notes,
		ProposedSlotId: payload.ProposedSlotID,
	})

	if err != nil {
		h.handleBookingError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Reschedule proposed",
		Data:    res.Booking,
	})
}

// ─── Student Slots ──────────────────────────────────────────────────────────

func (h *ConsultationHandler) ListAvailableSlots(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.ListAvailableSlots(r.Context(), &academicv1.ListAvailableSlotsRequest{
		StudentUserId: userID,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to list available slots"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]interface{}{"items": res.Slots},
	})
}

// ─── Student Bookings ───────────────────────────────────────────────────────

func (h *ConsultationHandler) ListStudentBookings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.ListStudentBookings(r.Context(), &academicv1.ListStudentBookingsRequest{
		StudentUserId: userID,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to list bookings"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]interface{}{"items": res.Bookings},
	})
}

func (h *ConsultationHandler) CreateBooking(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	var payload struct {
		SlotID string `json:"slot_id"`
		Topic  string `json:"topic"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	if payload.SlotID == "" || payload.Topic == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "slot_id and topic are required"})
		return
	}

	res, err := h.client.CreateBooking(r.Context(), &academicv1.CreateBookingRequest{
		SlotId:        payload.SlotID,
		StudentUserId: userID,
		Topic:         payload.Topic,
	})

	if err != nil {
		if strings.Contains(err.Error(), "NotFound") {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Slot not found"})
			return
		}
		if strings.Contains(err.Error(), "ResourceExhausted") {
			writeJSON(w, http.StatusConflict, APIResponse{Success: false, Message: "Slot is fully booked"})
			return
		}
		if strings.Contains(err.Error(), "FailedPrecondition") {
			writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Booking must be made at least 12 hours before slot"})
			return
		}
		if strings.Contains(err.Error(), "AlreadyExists") {
			writeJSON(w, http.StatusConflict, APIResponse{Success: false, Message: "You have already booked this slot"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to create booking"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "Booking created successfully",
		Data:    res.Booking,
	})
}

func (h *ConsultationHandler) RouteStudentBookingByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/student/consultation-bookings/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "booking ID is required"})
		return
	}
	bookingID := parts[0]

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	// Check for action
	if len(parts) >= 2 {
		action := parts[1]
		if action == "accept-reschedule" && r.Method == http.MethodPost {
			h.acceptReschedule(w, r, bookingID, userID)
			return
		}
	}

	// DELETE = cancel
	if r.Method == http.MethodDelete {
		h.cancelBooking(w, r, bookingID, userID)
		return
	}

	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *ConsultationHandler) cancelBooking(w http.ResponseWriter, r *http.Request, bookingID, userID string) {
	res, err := h.client.CancelBooking(r.Context(), &academicv1.CancelBookingRequest{
		BookingId:     bookingID,
		StudentUserId: userID,
	})

	if err != nil {
		if strings.Contains(err.Error(), "NotFound") {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Booking not found"})
			return
		}
		if strings.Contains(err.Error(), "PermissionDenied") {
			writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: "This booking does not belong to you"})
			return
		}
		if strings.Contains(err.Error(), "FailedPrecondition") {
			writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Cannot cancel booking with current status"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to cancel booking"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Booking cancelled",
		Data:    res.Booking,
	})
}

func (h *ConsultationHandler) acceptReschedule(w http.ResponseWriter, r *http.Request, bookingID, userID string) {
	res, err := h.client.AcceptReschedule(r.Context(), &academicv1.AcceptRescheduleRequest{
		BookingId:     bookingID,
		StudentUserId: userID,
	})

	if err != nil {
		if strings.Contains(err.Error(), "NotFound") {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Booking not found"})
			return
		}
		if strings.Contains(err.Error(), "PermissionDenied") {
			writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: "This booking does not belong to you"})
			return
		}
		if strings.Contains(err.Error(), "FailedPrecondition") {
			writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Booking is not in rescheduled status"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to accept reschedule"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Reschedule accepted, new booking created",
		Data:    res.Booking,
	})
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func (h *ConsultationHandler) handleBookingError(w http.ResponseWriter, err error) {
	if strings.Contains(err.Error(), "NotFound") {
		writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Booking not found"})
		return
	}
	if strings.Contains(err.Error(), "PermissionDenied") {
		writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: "You are not the owner of this slot"})
		return
	}
	if strings.Contains(err.Error(), "FailedPrecondition") {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid action for current booking status"})
		return
	}
	writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to process booking"})
}
