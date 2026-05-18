package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/middleware"
	academicv1 "campus-flow/proto/gen/academic/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ThesisFinalDocumentHandler struct {
	academicClient *client.AcademicClient
}

func NewThesisFinalDocumentHandler(academicClient *client.AcademicClient) *ThesisFinalDocumentHandler {
	return &ThesisFinalDocumentHandler{academicClient: academicClient}
}

type FinalDocumentActionHTTPBody struct {
	DocumentID string `json:"document_id"`
	Notes      string `json:"notes"`
}

func (h *ThesisFinalDocumentHandler) ListLecturerFinalDocuments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "unauthorized"})
		return
	}

	statusFilter := r.URL.Query().Get("status_filter")
	page := parseIntDefault(r.URL.Query().Get("page"), 1, 1, 10000)
	pageSize := parseIntDefault(r.URL.Query().Get("page_size"), 20, 1, 100)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListLecturerFinalDocuments(ctx, &academicv1.ListLecturerFinalDocumentsRequest{
		LecturerUserId: userID,
		StatusFilter:   statusFilter,
		Page:           int32(page),
		PageSize:       int32(pageSize),
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to list final documents"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list final documents success", Data: res})
}

func (h *ThesisFinalDocumentHandler) GetFinalDocument(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	documentID := strings.TrimPrefix(r.URL.Path, "/api/v1/lecturer/final-documents/")
	documentID = strings.TrimSuffix(documentID, "/")
	if documentID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "document_id required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.GetThesisFinalDocument(ctx, &academicv1.GetThesisFinalDocumentRequest{DocumentId: documentID})
	if err != nil {
		st, ok := status.FromError(err)
		if ok && st.Code() == codes.NotFound {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "document not found"})
			return
		}
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to get document"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "get document success", Data: res})
}

func (h *ThesisFinalDocumentHandler) StartReview(w http.ResponseWriter, r *http.Request) {
	h.handleAction(w, r, func(ctx context.Context, req *academicv1.FinalDocumentActionRequest) (*academicv1.ThesisFinalDocumentResponse, error) {
		return h.academicClient.Client.StartFinalDocumentReview(ctx, req)
	}, "start review")
}

func (h *ThesisFinalDocumentHandler) Approve(w http.ResponseWriter, r *http.Request) {
	h.handleAction(w, r, func(ctx context.Context, req *academicv1.FinalDocumentActionRequest) (*academicv1.ThesisFinalDocumentResponse, error) {
		return h.academicClient.Client.ApproveFinalDocument(ctx, req)
	}, "approve")
}

func (h *ThesisFinalDocumentHandler) RequestRevision(w http.ResponseWriter, r *http.Request) {
	h.handleAction(w, r, func(ctx context.Context, req *academicv1.FinalDocumentActionRequest) (*academicv1.ThesisFinalDocumentResponse, error) {
		return h.academicClient.Client.RequestRevisionFinalDocument(ctx, req)
	}, "request revision")
}

func (h *ThesisFinalDocumentHandler) Reject(w http.ResponseWriter, r *http.Request) {
	h.handleAction(w, r, func(ctx context.Context, req *academicv1.FinalDocumentActionRequest) (*academicv1.ThesisFinalDocumentResponse, error) {
		return h.academicClient.Client.RejectFinalDocument(ctx, req)
	}, "reject")
}

func (h *ThesisFinalDocumentHandler) handleAction(
	w http.ResponseWriter,
	r *http.Request,
	rpcFn func(context.Context, *academicv1.FinalDocumentActionRequest) (*academicv1.ThesisFinalDocumentResponse, error),
	actionLabel string,
) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "unauthorized"})
		return
	}

	var body FinalDocumentActionHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}

	if body.DocumentID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "document_id required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := rpcFn(ctx, &academicv1.FinalDocumentActionRequest{
		DocumentId:     body.DocumentID,
		LecturerUserId: userID,
		Notes:          body.Notes,
	})
	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			switch st.Code() {
			case codes.NotFound:
				writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "document not found"})
				return
			case codes.PermissionDenied:
				writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: st.Message()})
				return
			case codes.FailedPrecondition:
				writeJSON(w, http.StatusConflict, APIResponse{Success: false, Message: st.Message()})
				return
			}
		}
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to " + actionLabel})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: actionLabel + " success", Data: res})
}

func parseIntDefault(s string, def, min, max int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < min || v > max {
		return def
	}
	return v
}
