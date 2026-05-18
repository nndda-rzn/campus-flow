package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	academicv1 "campus-flow/proto/gen/academic/v1"
	"campus-flow/apps/services/api-gateway/internal/middleware"
)

type ThesisHandler struct {
	client academicv1.AcademicServiceClient
}

func NewThesisHandler(client academicv1.AcademicServiceClient) *ThesisHandler {
	return &ThesisHandler{client: client}
}

func (h *ThesisHandler) GetMilestonesByDepartment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	departmentID := r.URL.Query().Get("department_id")
	if departmentID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "department_id is required"})
		return
	}

	res, err := h.client.GetMilestonesByDepartment(r.Context(), &academicv1.GetMilestonesByDepartmentRequest{
		DepartmentId: departmentID,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to get milestones"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"items": res.Milestones,
		},
	})
}

func (h *ThesisHandler) GetProgressByStudent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.GetProgressByStudent(r.Context(), &academicv1.GetProgressByStudentRequest{
		StudentUserId: userID,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to get thesis progress"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"items": res.Progress,
		},
	})
}

func (h *ThesisHandler) RouteThesisProgressByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/student/thesis-progress/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "progress ID is required"})
		return
	}
	id := parts[0]

	if r.Method == http.MethodPut {
		h.updateProgress(w, r, id)
		return
	}

	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *ThesisHandler) updateProgress(w http.ResponseWriter, r *http.Request, id string) {
	var payload struct {
		Notes      string `json:"notes"`
		TargetDate string `json:"target_date"`
		Status     string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.UpdateProgress(r.Context(), &academicv1.UpdateProgressRequest{
		Id:         id,
		Notes:      payload.Notes,
		TargetDate: payload.TargetDate,
		Status:     payload.Status,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to update thesis progress"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Progress updated successfully",
		Data:    res.Progress,
	})
}
