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
	notificationv1 "campus-flow/proto/gen/notification/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AcademicHandler struct {
	academicClient     *client.AcademicClient
	notificationClient *client.NotificationClient
}

func NewAcademicHandler(
	academicClient *client.AcademicClient,
	notificationClient *client.NotificationClient,
) *AcademicHandler {
	return &AcademicHandler{
		academicClient:     academicClient,
		notificationClient: notificationClient,
	}
}

type CreateAcademicRequestHTTPBody struct {
	ServiceCode string `json:"service_code"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type WorkflowActionHTTPBody struct {
	RequestID string `json:"request_id"`
	Note      string `json:"note"`
}

func (h *AcademicHandler) ListAcademicServices(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListAcademicServices(ctx, &academicv1.ListAcademicServicesRequest{})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to call academic service",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "list academic services success",
		Data:    res,
	})
}

func (h *AcademicHandler) StudentAcademicRequests(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListMyAcademicRequests(w, r)
	case http.MethodPost:
		h.CreateAcademicRequest(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
	}
}

func (h *AcademicHandler) CreateAcademicRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	var body CreateAcademicRequestHTTPBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	if body.ServiceCode == "" || body.Title == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "service_code and title are required",
		})
		return
	}

	// BE-03-04: Validasi panjang title max 255 karakter
	if len([]rune(body.Title)) > 255 {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "judul pengajuan maksimal 255 karakter",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.CreateAcademicRequest(ctx, &academicv1.CreateAcademicRequestRequest{
		StudentUserId: userID,
		ServiceCode:   body.ServiceCode,
		Title:         body.Title,
		Description:   body.Description,
	})

	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to create academic request",
		})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "create academic request success",
		Data:    res,
	})
}

func (h *AcademicHandler) ListMyAcademicRequests(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListMyAcademicRequests(ctx, &academicv1.ListMyAcademicRequestsRequest{
		StudentUserId: userID,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to list academic requests",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "list my academic requests success",
		Data:    res,
	})
}

func (h *AcademicHandler) ListAllAcademicRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))

	// BE-01: Baca query params pagination
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	limit := 20

	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListAllAcademicRequests(ctx, &academicv1.ListAllAcademicRequestsRequest{
		StatusFilter: statusFilter,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to list academic requests",
		})
		return
	}

	// BE-01: Pagination di memory
	allRequests := res.Requests
	total := len(allRequests)
	totalPages := (total + limit - 1) / limit

	start := (page - 1) * limit
	end := start + limit
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}
	pagedRequests := allRequests[start:end]

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "list all academic requests success",
		Data: map[string]interface{}{
			"requests":    pagedRequests,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
	})
}

func (h *AcademicHandler) VerifyAcademicRequest(w http.ResponseWriter, r *http.Request) {
	h.workflowAction(w, r, "verify")
}

func (h *AcademicHandler) ApproveAcademicRequest(w http.ResponseWriter, r *http.Request) {
	h.workflowAction(w, r, "approve")
}

func (h *AcademicHandler) RejectAcademicRequest(w http.ResponseWriter, r *http.Request) {
	h.workflowAction(w, r, "reject")
}

func (h *AcademicHandler) CompleteAcademicRequest(w http.ResponseWriter, r *http.Request) {
	h.workflowAction(w, r, "complete")
}

func (h *AcademicHandler) CancelAcademicRequest(w http.ResponseWriter, r *http.Request) {
	h.workflowAction(w, r, "cancel")
}

func (h *AcademicHandler) RequestRevisionAcademicRequest(w http.ResponseWriter, r *http.Request) {
	h.workflowAction(w, r, "request-revision")
}

func (h *AcademicHandler) SubmitAcademicRequest(w http.ResponseWriter, r *http.Request) {
	h.workflowAction(w, r, "submit")
}

type UpdateAcademicRequestHTTPBody struct {
	RequestID   string `json:"request_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

func (h *AcademicHandler) UpdateAcademicRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	var body UpdateAcademicRequestHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	body.RequestID = strings.TrimSpace(body.RequestID)
	body.Title = strings.TrimSpace(body.Title)
	body.Description = strings.TrimSpace(body.Description)

	if body.RequestID == "" || body.Title == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "request_id and title are required",
		})
		return
	}

	if len([]rune(body.Title)) > 255 {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "judul pengajuan maksimal 255 karakter",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.UpdateAcademicRequest(ctx, &academicv1.UpdateAcademicRequestRequest{
		RequestId:   body.RequestID,
		ActorUserId: userID,
		Title:       body.Title,
		Description: body.Description,
	})
	if err != nil {
		writeWorkflowError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "update academic request success",
		Data:    res,
	})
}

func (h *AcademicHandler) workflowAction(w http.ResponseWriter, r *http.Request, action string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	var body WorkflowActionHTTPBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	if body.RequestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "request_id is required",
		})
		return
	}

	// Note enforcement at the gateway: revision must include a note. Backend
	// enforces this too, but failing fast at the edge gives a clearer 400.
	if (action == "request-revision" || action == "reject") && strings.TrimSpace(body.Note) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "note is required for this action",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	grpcReq := &academicv1.WorkflowActionRequest{
		RequestId:   body.RequestID,
		ActorUserId: userID,
		Note:        body.Note,
	}

	var (
		res *academicv1.AcademicRequestResponse
		err error
	)

	switch action {
	case "verify":
		res, err = h.academicClient.Client.VerifyAcademicRequest(ctx, grpcReq)
	case "approve":
		res, err = h.academicClient.Client.ApproveAcademicRequest(ctx, grpcReq)
	case "reject":
		res, err = h.academicClient.Client.RejectAcademicRequest(ctx, grpcReq)
	case "complete":
		res, err = h.academicClient.Client.CompleteAcademicRequest(ctx, grpcReq)
	case "cancel":
		res, err = h.academicClient.Client.CancelAcademicRequest(ctx, grpcReq)
	case "submit":
		res, err = h.academicClient.Client.SubmitAcademicRequest(ctx, grpcReq)
	case "request-revision":
		res, err = h.academicClient.Client.RequestRevisionAcademicRequest(ctx, grpcReq)
	default:
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid workflow action",
		})
		return
	}

	if err != nil {
		writeWorkflowError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "workflow action success",
		Data:    res,
	})
}

// writeWorkflowError translates gRPC status codes from the academic service
// into appropriate HTTP responses.
func writeWorkflowError(w http.ResponseWriter, err error) {
	st, ok := status.FromError(err)
	if !ok {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to process workflow action",
		})
		return
	}

	switch st.Code() {
	case codes.InvalidArgument:
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: st.Message()})
	case codes.NotFound:
		writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: st.Message()})
	case codes.PermissionDenied:
		writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: st.Message()})
	case codes.FailedPrecondition:
		writeJSON(w, http.StatusConflict, APIResponse{Success: false, Message: st.Message()})
	default:
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to process workflow action",
		})
	}
}

func (h *AcademicHandler) createNotificationSilently(
	ctx context.Context,
	userID string,
	title string,
	message string,
	notificationType string,
	entityType string,
	entityID string,
) {
	if h.notificationClient == nil {
		return
	}

	notifyCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	_, _ = h.notificationClient.Client.CreateNotification(notifyCtx, &notificationv1.CreateNotificationRequest{
		UserId:     userID,
		Title:      title,
		Message:    message,
		Type:       notificationType,
		EntityType: entityType,
		EntityId:   entityID,
	})
}

func buildAcademicWorkflowNotification(action string, status string) (string, string, string) {
	switch action {
	case "verify":
		return "Pengajuan sudah diverifikasi",
			"Pengajuan layanan akademik Anda sudah diverifikasi oleh Admin Prodi.",
			"INFO"
	case "approve":
		return "Pengajuan disetujui",
			"Pengajuan layanan akademik Anda sudah disetujui oleh Kaprodi.",
			"SUCCESS"
	case "reject":
		return "Pengajuan ditolak",
			"Pengajuan layanan akademik Anda ditolak. Silakan periksa catatan pengajuan.",
			"WARNING"
	case "complete":
		return "Pengajuan selesai",
			"Pengajuan layanan akademik Anda sudah selesai diproses.",
			"SUCCESS"
	default:
		return "Status pengajuan diperbarui",
			"Status pengajuan layanan akademik Anda berubah menjadi " + status + ".",
			"INFO"
	}
}

// BE-02-04: GET /api/v1/academic-requests/{id}
func (h *AcademicHandler) GetAcademicRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	// Extract {id} dari URL path: /api/v1/academic-requests/{id}
	path := r.URL.Path
	requestID := strings.TrimPrefix(path, "/api/v1/academic-requests/")
	requestID = strings.TrimSpace(requestID)

	if requestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_id is required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.GetAcademicRequest(ctx, &academicv1.GetAcademicRequestRequest{
		RequestId: requestID,
	})
	if err != nil {
		st, ok := status.FromError(err)
		if ok && st.Code() == codes.NotFound {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "pengajuan tidak ditemukan"})
			return
		}
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to get academic request"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "get academic request success",
		Data:    res,
	})
}

// RouteAcademicRequestByID dispatches requests under /api/v1/academic-requests/{id}[/...].
// Supported routes:
//   - GET /api/v1/academic-requests/{id}          → GetAcademicRequest
//   - GET /api/v1/academic-requests/{id}/history  → GetAcademicRequestHistory
func (h *AcademicHandler) RouteAcademicRequestByID(w http.ResponseWriter, r *http.Request) {
	const prefix = "/api/v1/academic-requests/"
	rest := strings.TrimPrefix(r.URL.Path, prefix)
	// rest is now "{id}" or "{id}/history" or "{id}/something-else"

	parts := strings.SplitN(rest, "/", 2)
	requestID := strings.TrimSpace(parts[0])

	if requestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "request_id is required"})
		return
	}

	subPath := ""
	if len(parts) == 2 {
		subPath = parts[1]
	}

	switch subPath {
	case "history":
		h.getAcademicRequestHistory(w, r, requestID)
	case "":
		h.getAcademicRequestByID(w, r, requestID)
	default:
		writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "endpoint not found"})
	}
}

func (h *AcademicHandler) getAcademicRequestByID(w http.ResponseWriter, r *http.Request, requestID string) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.GetAcademicRequest(ctx, &academicv1.GetAcademicRequestRequest{
		RequestId: requestID,
	})
	if err != nil {
		st, ok := status.FromError(err)
		if ok && st.Code() == codes.NotFound {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "pengajuan tidak ditemukan"})
			return
		}
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to get academic request"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "get academic request success",
		Data:    res,
	})
}

// BE-02-02: GET /api/v1/academic-requests/{id}/history
func (h *AcademicHandler) getAcademicRequestHistory(w http.ResponseWriter, r *http.Request, requestID string) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.GetAcademicRequestHistory(ctx, &academicv1.GetAcademicRequestHistoryRequest{
		RequestId: requestID,
	})
	if err != nil {
		st, ok := status.FromError(err)
		if ok && st.Code() == codes.NotFound {
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: "pengajuan tidak ditemukan"})
			return
		}
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to get academic request history"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "get academic request history success",
		Data:    res,
	})
}
