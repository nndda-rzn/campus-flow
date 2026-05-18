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

func (h *ThesisHandler) RouteAdminMilestones(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		h.CreateMilestone(w, r)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *ThesisHandler) RouteAdminMilestoneByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/thesis-milestones/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "milestone ID is required"})
		return
	}
	id := parts[0]

	if r.Method == http.MethodPut {
		h.UpdateMilestone(w, r, id)
		return
	}
	if r.Method == http.MethodDelete {
		h.DeleteMilestone(w, r, id)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *ThesisHandler) CreateMilestone(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		DepartmentID  string `json:"department_id"`
		Code          string `json:"code"`
		Name          string `json:"name"`
		Description   string `json:"description"`
		SequenceOrder int32  `json:"sequence_order"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.CreateMilestone(r.Context(), &academicv1.CreateMilestoneRequest{
		DepartmentId:  payload.DepartmentID,
		Code:          payload.Code,
		Name:          payload.Name,
		Description:   payload.Description,
		SequenceOrder: payload.SequenceOrder,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to create milestone"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "Milestone created successfully",
		Data:    res.Milestone,
	})
}

func (h *ThesisHandler) UpdateMilestone(w http.ResponseWriter, r *http.Request, id string) {
	var payload struct {
		Name          string `json:"name"`
		Description   string `json:"description"`
		SequenceOrder int32  `json:"sequence_order"`
		IsActive      bool   `json:"is_active"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.UpdateMilestone(r.Context(), &academicv1.UpdateMilestoneRequest{
		Id:            id,
		Name:          payload.Name,
		Description:   payload.Description,
		SequenceOrder: payload.SequenceOrder,
		IsActive:      payload.IsActive,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to update milestone"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Milestone updated successfully",
		Data:    res.Milestone,
	})
}

func (h *ThesisHandler) DeleteMilestone(w http.ResponseWriter, r *http.Request, id string) {
	_, err := h.client.DeleteMilestone(r.Context(), &academicv1.DeleteMilestoneRequest{
		Id: id,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to delete milestone"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Milestone deleted successfully",
	})
}
