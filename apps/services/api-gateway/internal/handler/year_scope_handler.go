package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	academicv1 "campus-flow/proto/gen/academic/v1"
)

type AcademicYearHandler struct {
	academicClient *client.AcademicClient
}

func NewAcademicYearHandler(academicClient *client.AcademicClient) *AcademicYearHandler {
	return &AcademicYearHandler{academicClient: academicClient}
}

func (h *AcademicYearHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListAcademicYears(ctx, &academicv1.ListAcademicYearsRequest{})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to list academic years"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list academic years success", Data: res})
}

func (h *AcademicYearHandler) GetActive(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.GetActiveAcademicYear(ctx, &academicv1.GetActiveAcademicYearRequest{})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "no active academic year"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "active academic year", Data: res})
}

type CreateAcademicYearHTTPBody struct {
	Code      string `json:"code"`
	Name      string `json:"name"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	IsActive  bool   `json:"is_active"`
}

func (h *AcademicYearHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	var body CreateAcademicYearHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.Code) == "" || strings.TrimSpace(body.Name) == "" ||
		strings.TrimSpace(body.StartDate) == "" || strings.TrimSpace(body.EndDate) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "code, name, start_date, end_date wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.CreateAcademicYear(ctx, &academicv1.CreateAcademicYearRequest{
		Code:      body.Code,
		Name:      body.Name,
		StartDate: body.StartDate,
		EndDate:   body.EndDate,
		IsActive:  body.IsActive,
	})
	if err != nil {
		writeAdminError(w, err, "failed to create academic year")
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Message: "create academic year success", Data: res})
}

type SetActiveAcademicYearHTTPBody struct {
	ID string `json:"id"`
}

func (h *AcademicYearHandler) SetActive(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	var body SetActiveAcademicYearHTTPBody
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

	res, err := h.academicClient.Client.SetActiveAcademicYear(ctx, &academicv1.SetActiveAcademicYearRequest{Id: body.ID})
	if err != nil {
		writeAdminError(w, err, "failed to set active academic year")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "set active academic year success", Data: res})
}

// ─── Scope handlers ─────────────────────────────────────────────────────────

type ScopeHandler struct {
	academicClient *client.AcademicClient
}

func NewScopeHandler(academicClient *client.AcademicClient) *ScopeHandler {
	return &ScopeHandler{academicClient: academicClient}
}

func (h *ScopeHandler) GetUserScope(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	userID := r.URL.Query().Get("user_id")
	if strings.TrimSpace(userID) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id wajib diisi"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.GetUserScope(ctx, &academicv1.GetUserScopeRequest{UserId: userID})
	if err != nil {
		writeAdminError(w, err, "failed to get user scope")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "get user scope success", Data: res})
}

type SetUserScopeHTTPBody struct {
	UserID        string   `json:"user_id"`
	DepartmentIDs []string `json:"department_ids"`
}

func (h *ScopeHandler) SetUserScope(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	var body SetUserScopeHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.UserID) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id wajib diisi"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.SetUserScope(ctx, &academicv1.SetUserScopeRequest{
		UserId:        body.UserID,
		DepartmentIds: body.DepartmentIDs,
	})
	if err != nil {
		writeAdminError(w, err, "failed to set user scope")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "set user scope success", Data: res})
}
