package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/middleware"
	authv1 "campus-flow/proto/gen/auth/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type MeHandler struct {
	authClient *client.AuthClient
}

func NewMeHandler(authClient *client.AuthClient) *MeHandler {
	return &MeHandler{authClient: authClient}
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

type ChangePasswordHTTPBody struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *MeHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
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

	var body ChangePasswordHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	if body.CurrentPassword == "" || body.NewPassword == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "current_password dan new_password wajib diisi",
		})
		return
	}
	if len(body.NewPassword) < 8 {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "new password minimal 8 karakter",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	_, err := h.authClient.Client.ChangePassword(ctx, &authv1.ChangePasswordRequest{
		UserId:          userID,
		CurrentPassword: body.CurrentPassword,
		NewPassword:     body.NewPassword,
	})
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			writeJSON(w, http.StatusBadGateway, APIResponse{
				Success: false,
				Message: "failed to change password",
			})
			return
		}
		switch st.Code() {
		case codes.Unauthenticated:
			writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: st.Message()})
		case codes.InvalidArgument:
			writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: st.Message()})
		case codes.NotFound:
			writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: st.Message()})
		case codes.PermissionDenied:
			writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: st.Message()})
		default:
			writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to change password"})
		}
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "password changed",
	})
}