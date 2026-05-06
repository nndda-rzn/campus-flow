package handler

import (
	"net/http"

	"campus-flow/apps/services/api-gateway/internal/middleware"
)

type MeHandler struct{}

func NewMeHandler() *MeHandler {
	return &MeHandler{}
}

type MeResponse struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

func (h *MeHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
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

	role, ok := middleware.GetRole(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user role",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "get current user success",
		Data: MeResponse{
			UserID: userID,
			Role:   role,
		},
	})
}