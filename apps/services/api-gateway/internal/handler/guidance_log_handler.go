package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	academicv1 "campus-flow/proto/gen/academic/v1"
	"campus-flow/apps/services/api-gateway/internal/middleware"
)

type GuidanceLogHandler struct {
	client academicv1.AcademicServiceClient
}

func NewGuidanceLogHandler(client academicv1.AcademicServiceClient) *GuidanceLogHandler {
	return &GuidanceLogHandler{client: client}
}

func (h *GuidanceLogHandler) RouteStudentGuidanceLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		h.getLogsByStudent(w, r)
		return
	}
	if r.Method == http.MethodPost {
		h.createLog(w, r)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *GuidanceLogHandler) RouteStudentGuidanceLogByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/student/guidance-logs/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "log ID is required"})
		return
	}
	id := parts[0]

	if len(parts) == 2 && parts[1] == "submit" && r.Method == http.MethodPost {
		h.submitLog(w, r, id)
		return
	}

	if r.Method == http.MethodPut {
		h.updateLog(w, r, id)
		return
	}
	if r.Method == http.MethodDelete {
		h.deleteLog(w, r, id)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *GuidanceLogHandler) RouteLecturerGuidanceLogByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/lecturer/guidance-logs/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "log ID is required"})
		return
	}
	id := parts[0]

	if len(parts) >= 2 {
		action := parts[1]
		if action == "approve" && r.Method == http.MethodPost {
			h.approveLog(w, r, id)
			return
		}
		if action == "request-revision" && r.Method == http.MethodPost {
			h.requestRevisionLog(w, r, id)
			return
		}
		if action == "notes" && r.Method == http.MethodPut {
			h.updateLogNotes(w, r, id)
			return
		}
		if action == "attachments" {
			if r.Method == http.MethodPost {
				h.attachFileToLog(w, r, id)
				return
			}
			if r.Method == http.MethodDelete && len(parts) == 3 {
				fileID := parts[2]
				h.removeAttachment(w, r, id, fileID)
				return
			}
		}
	}
	
	if r.Method == http.MethodGet {
		h.getLogByID(w, r, id)
		return
	}

	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *GuidanceLogHandler) getLogsByStudent(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.GetLogsByStudent(r.Context(), &academicv1.GetLogsByStudentRequest{
		StudentUserId: userID,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to get guidance logs"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"items": res.Logs,
		},
	})
}

func (h *GuidanceLogHandler) GetLogsByLecturer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.GetLogsByLecturer(r.Context(), &academicv1.GetLogsByLecturerRequest{
		LecturerUserId: userID,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to get guidance logs"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"items": res.Logs,
		},
	})
}

func (h *GuidanceLogHandler) getLogByID(w http.ResponseWriter, r *http.Request, id string) {
	res, err := h.client.GetLogByID(r.Context(), &academicv1.GetLogByIDRequest{
		Id: id,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to get guidance log"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    res.Log,
	})
}

func (h *GuidanceLogHandler) createLog(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	var payload struct {
		SupervisorRequestID string `json:"supervisor_request_id"`
		LecturerUserID      string `json:"lecturer_user_id"`
		SessionDate         string `json:"session_date"`
		StartTime           string `json:"start_time"`
		EndTime             string `json:"end_time"`
		Topic               string `json:"topic"`
		DiscussionSummary   string `json:"discussion_summary"`
		NextAction          string `json:"next_action"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.CreateLog(r.Context(), &academicv1.CreateLogRequest{
		StudentUserId:       userID,
		SupervisorRequestId: payload.SupervisorRequestID,
		LecturerUserId:      payload.LecturerUserID,
		SessionDate:         payload.SessionDate,
		StartTime:           payload.StartTime,
		EndTime:             payload.EndTime,
		Topic:               payload.Topic,
		DiscussionSummary:   payload.DiscussionSummary,
		NextAction:          payload.NextAction,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to create guidance log"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "Guidance log created successfully",
		Data:    res.Log,
	})
}

func (h *GuidanceLogHandler) updateLog(w http.ResponseWriter, r *http.Request, id string) {
	var payload struct {
		SessionDate       string `json:"session_date"`
		StartTime         string `json:"start_time"`
		EndTime           string `json:"end_time"`
		Topic             string `json:"topic"`
		DiscussionSummary string `json:"discussion_summary"`
		NextAction        string `json:"next_action"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.UpdateLog(r.Context(), &academicv1.UpdateLogRequest{
		Id:                id,
		SessionDate:       payload.SessionDate,
		StartTime:         payload.StartTime,
		EndTime:           payload.EndTime,
		Topic:             payload.Topic,
		DiscussionSummary: payload.DiscussionSummary,
		NextAction:        payload.NextAction,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to update guidance log"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Guidance log updated successfully",
		Data:    res.Log,
	})
}

func (h *GuidanceLogHandler) deleteLog(w http.ResponseWriter, r *http.Request, id string) {
	_, err := h.client.DeleteLog(r.Context(), &academicv1.DeleteLogRequest{
		Id: id,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to delete guidance log"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Guidance log deleted successfully",
	})
}

// ─── Enhanced Guidance Log ──────────────────────────────────────────────────

func (h *GuidanceLogHandler) updateLogNotes(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	var payload struct {
		LecturerNotes string `json:"lecturer_notes"`
		MilestoneID   string `json:"milestone_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.UpdateLogNotes(r.Context(), &academicv1.UpdateGuidanceLogNotesRequest{
		LogId:          id,
		LecturerUserId: userID,
		LecturerNotes:  payload.LecturerNotes,
		MilestoneId:    payload.MilestoneID,
	})

	if err != nil {
		if strings.Contains(err.Error(), "PermissionDenied") {
			writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: "You are not authorized to update notes for this log"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to update guidance log notes"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Guidance log notes updated successfully",
		Data:    res.Log,
	})
}

func (h *GuidanceLogHandler) attachFileToLog(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	var payload struct {
		FileID   string `json:"file_id"`
		Filename string `json:"filename"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.AttachFileToLog(r.Context(), &academicv1.AttachFileToLogRequest{
		LogId:      id,
		FileId:     payload.FileID,
		UploadedBy: userID,
		Filename:   payload.Filename,
	})

	if err != nil {
		if strings.Contains(err.Error(), "PermissionDenied") {
			writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: "You are not authorized to attach files to this log"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to attach file to guidance log"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "File attached successfully",
		Data:    res.Log,
	})
}

func (h *GuidanceLogHandler) removeAttachment(w http.ResponseWriter, r *http.Request, id, fileID string) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
		return
	}

	res, err := h.client.RemoveAttachment(r.Context(), &academicv1.RemoveAttachmentRequest{
		LogId:       id,
		FileId:      fileID,
		ActorUserId: userID,
	})

	if err != nil {
		if strings.Contains(err.Error(), "PermissionDenied") {
			writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: "You are not authorized to remove this attachment"})
			return
		}
		if strings.Contains(err.Error(), "NotFound") {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "Attachment not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to remove attachment"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Attachment removed successfully",
		Data:    res.Log,
	})
}

func (h *GuidanceLogHandler) submitLog(w http.ResponseWriter, r *http.Request, id string) {
	res, err := h.client.UpdateLog(r.Context(), &academicv1.UpdateLogRequest{
		Id:     id,
		Status: "SUBMITTED",
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to submit guidance log"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Guidance log submitted successfully",
		Data:    res.Log,
	})
}

func (h *GuidanceLogHandler) approveLog(w http.ResponseWriter, r *http.Request, id string) {
	var payload struct {
		Feedback string `json:"feedback"`
	}

	// OK if body is empty or fails to decode, feedback is optional
	_ = json.NewDecoder(r.Body).Decode(&payload)

	res, err := h.client.UpdateLog(r.Context(), &academicv1.UpdateLogRequest{
		Id:                 id,
		Status:             "APPROVED",
		SupervisorFeedback: payload.Feedback,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to approve guidance log"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Guidance log approved successfully",
		Data:    res.Log,
	})
}

func (h *GuidanceLogHandler) requestRevisionLog(w http.ResponseWriter, r *http.Request, id string) {
	var payload struct {
		Feedback string `json:"feedback"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || strings.TrimSpace(payload.Feedback) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Feedback is required for requesting revision"})
		return
	}

	res, err := h.client.UpdateLog(r.Context(), &academicv1.UpdateLogRequest{
		Id:                 id,
		Status:             "REVISION_REQUIRED",
		SupervisorFeedback: payload.Feedback,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to request revision for guidance log"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "Revision requested successfully",
		Data:    res.Log,
	})
}
