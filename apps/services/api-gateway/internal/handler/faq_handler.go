package handler

import (
	"net/http"

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
