package handler

import (
	"net/http"

	academicv1 "campus-flow/proto/gen/academic/v1"
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
