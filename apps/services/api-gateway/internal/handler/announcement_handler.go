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

type AnnouncementHandler struct {
	academicClient *client.AcademicClient
}

func NewAnnouncementHandler(academicClient *client.AcademicClient) *AnnouncementHandler {
	return &AnnouncementHandler{academicClient: academicClient}
}

func (h *AnnouncementHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	role, _ := middleware.GetRole(r.Context())
	includeInactive := strings.EqualFold(r.URL.Query().Get("include_inactive"), "true")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListAnnouncements(ctx, &academicv1.ListAnnouncementsRequest{
		ViewerRole:      role,
		IncludeInactive: includeInactive,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to list announcements"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list announcements success", Data: res})
}

type CreateAnnouncementHTTPBody struct {
	Title       string   `json:"title"`
	Body        string   `json:"body"`
	Severity    string   `json:"severity"`
	TargetRoles []string `json:"target_roles"`
	StartsAt    string   `json:"starts_at"`
	EndsAt      string   `json:"ends_at"`
}

func (h *AnnouncementHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	authorID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	var body CreateAnnouncementHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Body) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "title dan body wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.CreateAnnouncement(ctx, &academicv1.CreateAnnouncementRequest{
		Title:        body.Title,
		Body:         body.Body,
		Severity:     body.Severity,
		AuthorUserId: authorID,
		AuthorName:   "", // optional, frontend can fill via /me; left empty server-side
		TargetRoles:  body.TargetRoles,
		StartsAt:     body.StartsAt,
		EndsAt:       body.EndsAt,
	})
	if err != nil {
		writeAdminError(w, err, "failed to create announcement")
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Message: "create announcement success", Data: res})
}

type UpdateAnnouncementHTTPBody struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Body        string   `json:"body"`
	Severity    string   `json:"severity"`
	TargetRoles []string `json:"target_roles"`
	EndsAt      string   `json:"ends_at"`
}

func (h *AnnouncementHandler) Update(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body UpdateAnnouncementHTTPBody
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

	res, err := h.academicClient.Client.UpdateAnnouncement(ctx, &academicv1.UpdateAnnouncementRequest{
		Id:          body.ID,
		Title:       body.Title,
		Body:        body.Body,
		Severity:    body.Severity,
		TargetRoles: body.TargetRoles,
		EndsAt:      body.EndsAt,
	})
	if err != nil {
		writeAdminError(w, err, "failed to update announcement")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "update announcement success", Data: res})
}

type DeactivateAnnouncementHTTPBody struct {
	ID string `json:"id"`
}

func (h *AnnouncementHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	var body DeactivateAnnouncementHTTPBody
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

	res, err := h.academicClient.Client.DeactivateAnnouncement(ctx, &academicv1.DeactivateAnnouncementRequest{
		Id: body.ID,
	})
	if err != nil {
		writeAdminError(w, err, "failed to deactivate announcement")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "deactivate announcement success", Data: res})
}
