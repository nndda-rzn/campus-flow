package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	academicv1 "campus-flow/proto/gen/academic/v1"
	"campus-flow/apps/services/api-gateway/internal/middleware"
)

type AcademicCalendarHandler struct {
	client academicv1.AcademicServiceClient
}

func NewAcademicCalendarHandler(client academicv1.AcademicServiceClient) *AcademicCalendarHandler {
	return &AcademicCalendarHandler{client: client}
}

func (h *AcademicCalendarHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	departmentID := r.URL.Query().Get("department_id")

	res, err := h.client.GetEvents(r.Context(), &academicv1.GetEventsRequest{
		StartDate:    startDate,
		EndDate:      endDate,
		DepartmentId: departmentID,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "Failed to get academic calendar events",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"items": res.Events,
		},
	})
}

func (h *AcademicCalendarHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
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
		Title          string   `json:"title"`
		EventType      string   `json:"event_type"`
		StartDate      string   `json:"start_date"`
		EndDate        string   `json:"end_date"`
		Description    string   `json:"description"`
		DepartmentID   string   `json:"department_id"`
		IsAllDay       bool     `json:"is_all_day"`
		TargetRoles    []string `json:"target_roles"`
		AcademicYearID string   `json:"academic_year_id"` // required for now, or could fetch active
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.CreateEvent(r.Context(), &academicv1.CreateEventRequest{
		AcademicYearId:  payload.AcademicYearID,
		DepartmentId:    payload.DepartmentID,
		Title:           payload.Title,
		Description:     payload.Description,
		EventType:       payload.EventType,
		StartDate:       payload.StartDate,
		EndDate:         payload.EndDate,
		IsAllDay:        payload.IsAllDay,
		TargetRoles:     payload.TargetRoles,
		CreatedByUserId: userID,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to create event"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "Event created successfully",
		Data:    res.Event,
	})
}

func (h *AcademicCalendarHandler) UpdateEvent(w http.ResponseWriter, r *http.Request, id string) {
	var payload struct {
		Title       string   `json:"title"`
		EventType   string   `json:"event_type"`
		StartDate   string   `json:"start_date"`
		EndDate     string   `json:"end_date"`
		Description string   `json:"description"`
		IsAllDay    bool     `json:"is_all_day"`
		TargetRoles []string `json:"target_roles"`
		IsActive    bool     `json:"is_active"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.UpdateEvent(r.Context(), &academicv1.UpdateEventRequest{
		Id:          id,
		Title:       payload.Title,
		Description: payload.Description,
		EventType:   payload.EventType,
		StartDate:   payload.StartDate,
		EndDate:     payload.EndDate,
		IsAllDay:    payload.IsAllDay,
		TargetRoles: payload.TargetRoles,
		IsActive:    payload.IsActive,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to update event"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Event updated successfully",
		Data:    res.Event,
	})
}

func (h *AcademicCalendarHandler) DeleteEvent(w http.ResponseWriter, r *http.Request, id string) {
	_, err := h.client.DeleteEvent(r.Context(), &academicv1.DeleteEventRequest{
		Id: id,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to delete event"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Event deleted successfully",
	})
}

func (h *AcademicCalendarHandler) RouteAdminEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		h.CreateEvent(w, r)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *AcademicCalendarHandler) RouteAdminEventByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/academic-calendar/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "event ID is required"})
		return
	}
	id := parts[0]

	if r.Method == http.MethodPut {
		h.UpdateEvent(w, r, id)
		return
	}
	if r.Method == http.MethodDelete {
		h.DeleteEvent(w, r, id)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}
