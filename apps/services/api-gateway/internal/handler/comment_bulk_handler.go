package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/middleware"
	academicv1 "campus-flow/proto/gen/academic/v1"
)

type CommentHandler struct {
	academicClient *client.AcademicClient
}

func NewCommentHandler(academicClient *client.AcademicClient) *CommentHandler {
	return &CommentHandler{academicClient: academicClient}
}

func (h *CommentHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	requestType := strings.ToUpper(r.URL.Query().Get("request_type"))
	requestID := r.URL.Query().Get("request_id")
	if requestType == "" || requestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_type & request_id wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListRequestComments(ctx, &academicv1.ListRequestCommentsRequest{
		RequestType: requestType,
		RequestId:   requestID,
	})
	if err != nil {
		writeAdminError(w, err, "failed to list comments")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list comments success", Data: res})
}

type CreateCommentHTTPBody struct {
	RequestType string `json:"request_type"`
	RequestID   string `json:"request_id"`
	Body        string `json:"body"`
}

func (h *CommentHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	authorID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}
	authorRole, _ := middleware.GetRole(r.Context())

	var body CreateCommentHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.Body) == "" || strings.TrimSpace(body.RequestID) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_id dan body wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.CreateRequestComment(ctx, &academicv1.CreateRequestCommentRequest{
		RequestType:  strings.ToUpper(body.RequestType),
		RequestId:    body.RequestID,
		AuthorUserId: authorID,
		AuthorName:   "",
		AuthorRole:   authorRole,
		Body:         body.Body,
	})
	if err != nil {
		writeAdminError(w, err, "failed to create comment")
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Message: "create comment success", Data: res})
}

// ─── Bulk verify ────────────────────────────────────────────────────────────

type BulkVerifyAcademicHTTPBody struct {
	RequestIDs []string `json:"request_ids"`
	Note       string   `json:"note"`
}

type BulkVerifyHandler struct {
	academicClient *client.AcademicClient
}

func NewBulkVerifyHandler(academicClient *client.AcademicClient) *BulkVerifyHandler {
	return &BulkVerifyHandler{academicClient: academicClient}
}

func (h *BulkVerifyHandler) BulkVerifyAcademic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	actorID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	var body BulkVerifyAcademicHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if len(body.RequestIDs) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_ids wajib diisi"})
		return
	}
	if len(body.RequestIDs) > 100 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "maksimal 100 pengajuan per batch"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.BulkVerifyAcademicRequests(ctx, &academicv1.BulkVerifyAcademicRequestsRequest{
		RequestIds:  body.RequestIDs,
		ActorUserId: actorID,
		Note:        body.Note,
	})
	if err != nil {
		writeAdminError(w, err, "failed to bulk verify")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "bulk verify success", Data: res})
}

// ─── Bulk approve/reject (Kaprodi) ──────────────────────────────────────────

type BulkWorkflowHTTPBody struct {
	RequestIDs []string `json:"request_ids"`
	Note       string   `json:"note"`
}

type BulkWorkflowHandler struct {
	academicClient *client.AcademicClient
}

func NewBulkWorkflowHandler(academicClient *client.AcademicClient) *BulkWorkflowHandler {
	return &BulkWorkflowHandler{academicClient: academicClient}
}

func (h *BulkWorkflowHandler) BulkApprove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	actorID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	var body BulkWorkflowHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if len(body.RequestIDs) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_ids wajib diisi"})
		return
	}
	if len(body.RequestIDs) > 100 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "maksimal 100 pengajuan per batch"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.BulkApproveAcademicRequests(ctx, &academicv1.BulkApproveAcademicRequestsRequest{
		RequestIds:  body.RequestIDs,
		ActorUserId: actorID,
		Note:        body.Note,
	})
	if err != nil {
		writeAdminError(w, err, "failed to bulk approve")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "bulk approve success", Data: res})
}

func (h *BulkWorkflowHandler) BulkReject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	actorID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	var body BulkWorkflowHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if len(body.RequestIDs) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_ids wajib diisi"})
		return
	}
	if len(body.RequestIDs) > 100 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "maksimal 100 pengajuan per batch"})
		return
	}
	if strings.TrimSpace(body.Note) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "note wajib diisi untuk penolakan"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.BulkRejectAcademicRequests(ctx, &academicv1.BulkRejectAcademicRequestsRequest{
		RequestIds:  body.RequestIDs,
		ActorUserId: actorID,
		Note:        body.Note,
	})
	if err != nil {
		writeAdminError(w, err, "failed to bulk reject")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "bulk reject success", Data: res})
}
