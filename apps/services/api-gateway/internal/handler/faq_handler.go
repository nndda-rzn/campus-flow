package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	academicv1 "campus-flow/proto/gen/academic/v1"
)

type FAQHandler struct {
	client academicv1.AcademicServiceClient
}

func NewFAQHandler(client academicv1.AcademicServiceClient) *FAQHandler {
	return &FAQHandler{client: client}
}

func (h *FAQHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	res, err := h.client.GetCategories(r.Context(), &academicv1.GetCategoriesRequest{})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "Failed to get FAQ categories",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"items": res.Categories,
		},
	})
}

func (h *FAQHandler) GetFAQs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	categoryID := r.URL.Query().Get("category_id")

	res, err := h.client.GetFAQs(r.Context(), &academicv1.GetFAQsRequest{
		CategoryId: categoryID,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "Failed to get FAQs",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"items": res.Faqs,
		},
	})
}

func (h *FAQHandler) RouteAdminFAQs(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		h.CreateFAQ(w, r)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *FAQHandler) RouteAdminFAQByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/faqs/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "FAQ ID is required"})
		return
	}
	id := parts[0]

	if r.Method == http.MethodPut {
		h.UpdateFAQ(w, r, id)
		return
	}
	if r.Method == http.MethodDelete {
		h.DeleteFAQ(w, r, id)
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "Method not allowed"})
}

func (h *FAQHandler) CreateFAQ(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		CategoryID    string `json:"category_id"`
		Question      string `json:"question"`
		Answer        string `json:"answer"`
		SequenceOrder int32  `json:"sequence_order"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.CreateFAQ(r.Context(), &academicv1.CreateFAQRequest{
		CategoryId:    payload.CategoryID,
		Question:      payload.Question,
		Answer:        payload.Answer,
		SequenceOrder: payload.SequenceOrder,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to create FAQ"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "FAQ created successfully",
		Data:    res.Faq,
	})
}

func (h *FAQHandler) UpdateFAQ(w http.ResponseWriter, r *http.Request, id string) {
	var payload struct {
		CategoryID    string `json:"category_id"`
		Question      string `json:"question"`
		Answer        string `json:"answer"`
		SequenceOrder int32  `json:"sequence_order"`
		IsActive      bool   `json:"is_active"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}

	res, err := h.client.UpdateFAQ(r.Context(), &academicv1.UpdateFAQRequest{
		Id:            id,
		CategoryId:    payload.CategoryID,
		Question:      payload.Question,
		Answer:        payload.Answer,
		SequenceOrder: payload.SequenceOrder,
		IsActive:      payload.IsActive,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to update FAQ"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "FAQ updated successfully",
		Data:    res.Faq,
	})
}

func (h *FAQHandler) DeleteFAQ(w http.ResponseWriter, r *http.Request, id string) {
	_, err := h.client.DeleteFAQ(r.Context(), &academicv1.DeleteFAQRequest{
		Id: id,
	})

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Success: false, Message: "Failed to delete FAQ"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "FAQ deleted successfully",
	})
}
