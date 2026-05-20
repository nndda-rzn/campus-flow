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

type NoteTemplateHandler struct {
	academicClient *client.AcademicClient
}

func NewNoteTemplateHandler(academicClient *client.AcademicClient) *NoteTemplateHandler {
	return &NoteTemplateHandler{academicClient: academicClient}
}

func (h *NoteTemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	departmentID := r.URL.Query().Get("department_id")
	category := r.URL.Query().Get("category")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListNoteTemplates(ctx, &academicv1.ListNoteTemplatesRequest{
		DepartmentId: departmentID,
		Category:     category,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to list note templates"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list note templates success", Data: res})
}

type CreateNoteTemplateHTTPBody struct {
	DepartmentID string `json:"department_id"`
	Category     string `json:"category"`
	Title        string `json:"title"`
	Body         string `json:"body"`
}

func (h *NoteTemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing user id"})
		return
	}

	var body CreateNoteTemplateHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Body) == "" || strings.TrimSpace(body.Category) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "title, body, dan category wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.CreateNoteTemplate(ctx, &academicv1.CreateNoteTemplateRequest{
		DepartmentId:    body.DepartmentID,
		Category:        body.Category,
		Title:           body.Title,
		Body:            body.Body,
		CreatedByUserId: userID,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to create note template"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Message: "note template created", Data: res})
}

type UpdateNoteTemplateHTTPBody struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Body     string `json:"body"`
	Category string `json:"category"`
}

func (h *NoteTemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body UpdateNoteTemplateHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if body.ID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "id wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.UpdateNoteTemplate(ctx, &academicv1.UpdateNoteTemplateRequest{
		Id:       body.ID,
		Title:    body.Title,
		Body:     body.Body,
		Category: body.Category,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to update note template"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "note template updated", Data: res})
}

type DeleteNoteTemplateHTTPBody struct {
	ID string `json:"id"`
}

func (h *NoteTemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body DeleteNoteTemplateHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if body.ID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "id wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	_, err := h.academicClient.Client.DeleteNoteTemplate(ctx, &academicv1.DeleteNoteTemplateRequest{
		Id: body.ID,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to delete note template"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "note template deleted"})
}

type IncrementUsageHTTPBody struct {
	ID string `json:"id"`
}

func (h *NoteTemplateHandler) IncrementUsage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body IncrementUsageHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if body.ID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "id wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.IncrementTemplateUsage(ctx, &academicv1.IncrementTemplateUsageRequest{
		Id: body.ID,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to increment usage"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "usage incremented", Data: res})
}
