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

type DelegationHandler struct {
	academicClient *client.AcademicClient
}

func NewDelegationHandler(academicClient *client.AcademicClient) *DelegationHandler {
	return &DelegationHandler{academicClient: academicClient}
}

func (h *DelegationHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	includeExpired := r.URL.Query().Get("include_expired") == "true"

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListDelegations(ctx, &academicv1.ListDelegationsRequest{
		DelegatorUserId: userID,
		IncludeExpired:  includeExpired,
	})
	if err != nil {
		writeAdminError(w, err, "failed to list delegations")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list delegations success", Data: res})
}

type CreateDelegationHTTPBody struct {
	DelegateUserID string `json:"delegate_user_id"`
	DelegateName   string `json:"delegate_name"`
	Reason         string `json:"reason"`
	StartsAt       string `json:"starts_at"`
	EndsAt         string `json:"ends_at"`
}

func (h *DelegationHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	var body CreateDelegationHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}

	if strings.TrimSpace(body.DelegateUserID) == "" || strings.TrimSpace(body.DelegateName) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "delegate_user_id dan delegate_name wajib diisi"})
		return
	}
	if body.StartsAt == "" || body.EndsAt == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "starts_at dan ends_at wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.CreateDelegation(ctx, &academicv1.CreateDelegationRequest{
		DelegatorUserId: userID,
		DelegateUserId:  body.DelegateUserID,
		DelegateName:    body.DelegateName,
		Reason:          body.Reason,
		StartsAt:        body.StartsAt,
		EndsAt:          body.EndsAt,
	})
	if err != nil {
		writeAdminError(w, err, "failed to create delegation")
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Message: "delegation created", Data: res})
}

type RevokeDelegationHTTPBody struct {
	ID string `json:"id"`
}

func (h *DelegationHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	var body RevokeDelegationHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.ID) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "id wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.RevokeDelegation(ctx, &academicv1.RevokeDelegationRequest{
		Id:          body.ID,
		ActorUserId: userID,
	})
	if err != nil {
		writeAdminError(w, err, "failed to revoke delegation")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "delegation revoked", Data: res})
}

func (h *DelegationHandler) Check(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.CheckDelegation(ctx, &academicv1.CheckDelegationRequest{
		UserId: userID,
	})
	if err != nil {
		writeAdminError(w, err, "failed to check delegation")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "check delegation success", Data: res})
}
