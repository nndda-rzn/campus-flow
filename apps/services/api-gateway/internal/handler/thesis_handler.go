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

// --- Lecturer Progress Endpoints ---

// ListSupervisedProgress returns all supervised students with their progress
// GET /api/v1/lecturer/supervised-students/progress
func (h *ThesisHandler) ListSupervisedProgress(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	// Parse query params
	includeCompleted := r.URL.Query().Get("include_completed") == "true"
	stuckThresholdDays := int32(0)
	if days := r.URL.Query().Get("stuck_threshold_days"); days != "" {
		var d int
		if _, err := json.Number(days).Int64(); err == nil {
			d, _ = parseInt(days)
			stuckThresholdDays = int32(d)
		}
	}

	res, err := h.client.ListSupervisedProgress(r.Context(), &academicv1.ListSupervisedProgressRequest{
		LecturerUserId:     userID,
		IncludeCompleted:   includeCompleted,
		StuckThresholdDays: stuckThresholdDays,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to get supervised students progress"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"items": res.Students,
		},
	})
}

// GetStudentProgressDetail returns detailed progress for a specific student
// GET /api/v1/lecturer/supervised-students/{id}/progress
func (h *ThesisHandler) GetStudentProgressDetail(w http.ResponseWriter, r *http.Request, studentUserID string) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.GetStudentProgressDetail(r.Context(), &academicv1.GetStudentProgressDetailRequest{
		StudentUserId:  studentUserID,
		LecturerUserId: userID,
	})

	if err != nil {
		if strings.Contains(err.Error(), "NotFound") || strings.Contains(err.Error(), "not found") {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Student not found or not supervised by you"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to get student progress"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    res,
	})
}

// CompleteMilestone marks a milestone as completed by the lecturer
// POST /api/v1/lecturer/thesis-progress/{id}/complete
func (h *ThesisHandler) CompleteMilestone(w http.ResponseWriter, r *http.Request, progressID string) {
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
		Notes string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		// Allow empty body
		payload.Notes = ""
	}

	res, err := h.client.CompleteMilestone(r.Context(), &academicv1.CompleteMilestoneRequest{
		ProgressId:     progressID,
		LecturerUserId: userID,
		Notes:          payload.Notes,
	})

	if err != nil {
		if strings.Contains(err.Error(), "PermissionDenied") {
			writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: "You are not the supervisor of this student"})
			return
		}
		if strings.Contains(err.Error(), "NotFound") {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Progress not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to complete milestone"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Milestone marked as completed",
		Data:    res.Progress,
	})
}

// RouteLecturerSupervisedStudents routes /api/v1/lecturer/supervised-students/*
func (h *ThesisHandler) RouteLecturerSupervisedStudents(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/lecturer/supervised-students")
	
	// /api/v1/lecturer/supervised-students/progress
	if path == "/progress" || path == "/progress/" {
		h.ListSupervisedProgress(w, r)
		return
	}

	// /api/v1/lecturer/supervised-students/{id}/progress
	if strings.HasSuffix(path, "/progress") {
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) >= 2 && parts[1] == "progress" {
			h.GetStudentProgressDetail(w, r, parts[0])
			return
		}
	}

	writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Not found"})
}

// RouteLecturerThesisProgress routes /api/v1/lecturer/thesis-progress/*
func (h *ThesisHandler) RouteLecturerThesisProgress(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/lecturer/thesis-progress/")
	parts := strings.Split(path, "/")
	
	if len(parts) < 2 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "progress ID is required"})
		return
	}

	progressID := parts[0]
	action := parts[1]

	if action == "complete" {
		h.CompleteMilestone(w, r, progressID)
		return
	}

	writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Not found"})
}

// parseInt helper
func parseInt(s string) (int, error) {
	var result int
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, nil
		}
		result = result*10 + int(c-'0')
	}
	return result, nil
}
