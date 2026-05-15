package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
	
	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/middleware"
	academicv1 "campus-flow/proto/gen/academic/v1"
)

type SupervisorHandler struct {
	academicClient *client.AcademicClient
}

func NewSupervisorHandler(academicClient *client.AcademicClient) *SupervisorHandler {
	return &SupervisorHandler{
		academicClient: academicClient,
	}
}

type CreateSupervisorRequestHTTPBody struct {
	TopicTitle       string   `json:"topic_title"`
	TopicDescription string   `json:"topic_description"`
	LecturerIDs      []string `json:"lecturer_ids"`
}

type SupervisorActionHTTPBody struct {
	RequestID string `json:"request_id"`
	Note      string `json:"note"`
}

type AssignSupervisorHTTPBody struct {
	RequestID  string `json:"request_id"`
	LecturerID string `json:"lecturer_id"`
	Note       string `json:"note"`
}

func (h *SupervisorHandler) ListLecturers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	
	res, err := h.academicClient.Client.ListLecturers(ctx, &academicv1.ListLecturersRequest{})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to list lecturers"})
		return
	}
	
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list lecturers success", Data: res})
}

func (h *SupervisorHandler) StudentSupervisorRequests(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListMySupervisorRequests(w, r)
	case http.MethodPost:
		h.CreateSupervisorRequest(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
	}
}

func (h *SupervisorHandler) CreateSupervisorRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}
	
	var body CreateSupervisorRequestHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	
	if body.TopicTitle == "" || len(body.LecturerIDs) == 0 {
		writeJSON(
			w,
			http.StatusBadRequest,
			APIResponse{Success: false, Message: "topic_title and lecturer_ids are required"},
		)
		return
	}
	
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	
	res, err := h.academicClient.Client.CreateSupervisorRequest(
		ctx, &academicv1.CreateSupervisorRequestRequest{
			StudentUserId:    userID,
			TopicTitle:       body.TopicTitle,
			TopicDescription: body.TopicDescription,
			LecturerIds:      body.LecturerIDs,
		},
	)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to create supervisor request"})
		return
	}
	
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Message: "create supervisor request success", Data: res})
}

func (h *SupervisorHandler) ListMySupervisorRequests(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}
	
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	
	res, err := h.academicClient.Client.ListMySupervisorRequests(
		ctx, &academicv1.ListMySupervisorRequestsRequest{
			StudentUserId: userID,
		},
	)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to list supervisor requests"})
		return
	}
	
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list supervisor requests success", Data: res})
}

func (h *SupervisorHandler) ListLecturerSupervisorRequests(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}
	
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	
	res, err := h.academicClient.Client.ListLecturerSupervisorRequests(
		ctx, &academicv1.ListLecturerSupervisorRequestsRequest{
			LecturerUserId: userID,
		},
	)
	if err != nil {
		writeJSON(
			w,
			http.StatusBadGateway,
			APIResponse{Success: false, Message: "failed to list lecturer supervisor requests"},
		)
		return
	}
	
	writeJSON(
		w,
		http.StatusOK,
		APIResponse{Success: true, Message: "list lecturer supervisor requests success", Data: res},
	)
}

func (h *SupervisorHandler) VerifySupervisorRequest(w http.ResponseWriter, r *http.Request) {
	h.supervisorAction(w, r, "verify")
}

func (h *SupervisorHandler) AcceptSupervisorRequest(w http.ResponseWriter, r *http.Request) {
	h.supervisorAction(w, r, "accept")
}

func (h *SupervisorHandler) RejectSupervisorRequest(w http.ResponseWriter, r *http.Request) {
	h.supervisorAction(w, r, "reject")
}

func (h *SupervisorHandler) supervisorAction(w http.ResponseWriter, r *http.Request, action string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}
	
	var body SupervisorActionHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	
	if body.RequestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_id is required"})
		return
	}
	
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	
	grpcReq := &academicv1.SupervisorWorkflowActionRequest{
		RequestId:   body.RequestID,
		ActorUserId: userID,
		Note:        body.Note,
	}
	
	var (
		res *academicv1.SupervisorRequestResponse
		err error
	)
	
	switch action {
	case "verify":
		res, err = h.academicClient.Client.VerifySupervisorRequest(ctx, grpcReq)
	case "accept":
		res, err = h.academicClient.Client.AcceptSupervisorRequest(ctx, grpcReq)
	case "reject":
		res, err = h.academicClient.Client.RejectSupervisorRequest(ctx, grpcReq)
	}
	
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to process supervisor action"})
		return
	}
	
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "supervisor action success", Data: res})
}

func (h *SupervisorHandler) AssignSupervisor(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}
	
	var body AssignSupervisorHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	
	if body.RequestID == "" || body.LecturerID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_id and lecturer_id are required"})
		return
	}
	
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	
	res, err := h.academicClient.Client.AssignSupervisor(
		ctx, &academicv1.AssignSupervisorRequest{
			RequestId:   body.RequestID,
			ActorUserId: userID,
			LecturerId:  body.LecturerID,
			Note:        body.Note,
		},
	)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to assign supervisor"})
		return
	}
	
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "assign supervisor success", Data: res})
}
