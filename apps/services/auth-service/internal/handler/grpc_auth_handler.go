package handler

import (
	"context"

	authv1 "campus-flow/proto/gen/auth/v1"
)

type AuthHandler struct {
	authv1.UnimplementedAuthServiceServer
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) Register(ctx context.Context, req *authv1.RegisterRequest) (*authv1.RegisterResponse, error) {
	return &authv1.RegisterResponse{
		UserId:   "dummy-user-id",
		FullName: req.FullName,
		Email:    req.Email,
		Role:     req.Role,
	}, nil
}

func (h *AuthHandler) Login(ctx context.Context, req *authv1.LoginRequest) (*authv1.LoginResponse, error) {
	return &authv1.LoginResponse{
		AccessToken:  "dummy-access-token",
		RefreshToken: "dummy-refresh-token",
		User: &authv1.UserProfile{
			UserId:   "dummy-user-id",
			FullName: "Demo User",
			Email:    req.Email,
			Role:     "MAHASISWA",
		},
	}, nil
}

func (h *AuthHandler) RefreshToken(ctx context.Context, req *authv1.RefreshTokenRequest) (*authv1.RefreshTokenResponse, error) {
	return &authv1.RefreshTokenResponse{
		AccessToken:  "new-dummy-access-token",
		RefreshToken: "new-dummy-refresh-token",
	}, nil
}

func (h *AuthHandler) ValidateToken(ctx context.Context, req *authv1.ValidateTokenRequest) (*authv1.ValidateTokenResponse, error) {
	return &authv1.ValidateTokenResponse{
		Valid:  true,
		UserId: "dummy-user-id",
		Role:   "MAHASISWA",
	}, nil
}

func (h *AuthHandler) Logout(ctx context.Context, req *authv1.LogoutRequest) (*authv1.LogoutResponse, error) {
	return &authv1.LogoutResponse{
		Success: true,
	}, nil
}