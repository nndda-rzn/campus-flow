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

type AcademicHandler struct {
	academicClient *client.AcademicClient
}

func NewAcademicHandler(academicClient *client.AcademicClient) *AcademicHandler {
	return &AcademicHandler{
		academicClient: academicClient,
	}
}

type CreateAcademicRequestHTTPBody struct {
	ServiceCode string `json:"service_code"`
	Title       string `json:"title"`
	Description string `json:"description"`
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