package handler

import (
	"context"
	"errors"

	"campus-flow/apps/services/auth-service/internal/service"
	authv1 "campus-flow/proto/gen/auth/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthHandler struct {
	authv1.UnimplementedAuthServiceServer
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(ctx context.Context, req *authv1.RegisterRequest) (*authv1.RegisterResponse, error) {
	user, err := h.authService.Register(
		ctx,
		req.FullName,
		req.Email,
		req.Password,
		req.Role,
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidRole) {
			return nil, status.Error(codes.InvalidArgument, "invalid role")
		}

		if errors.Is(err, service.ErrEmailDuplicate) {
			return nil, status.Error(codes.AlreadyExists, "email already registered")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.RegisterResponse{
		UserId:   user.ID,
		FullName: user.FullName,
		Email:    user.Email,
		Role:     user.Role,
	}, nil
}

func (h *AuthHandler) Login(ctx context.Context, req *authv1.LoginRequest) (*authv1.LoginResponse, error) {
	user, accessToken, refreshToken, err := h.authService.Login(
		ctx,
		req.Email,
		req.Password,
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredential) {
			return nil, status.Error(codes.Unauthenticated, "invalid email or password")
		}

		if errors.Is(err, service.ErrUserInactive) {
			return nil, status.Error(codes.PermissionDenied, "user inactive")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: &authv1.UserProfile{
			UserId:   user.ID,
			FullName: user.FullName,
			Email:    user.Email,
			Role:     user.Role,
		},
	}, nil
}

func (h *AuthHandler) RefreshToken(ctx context.Context, req *authv1.RefreshTokenRequest) (*authv1.RefreshTokenResponse, error) {
	accessToken, refreshToken, err := h.authService.RefreshToken(ctx, req.RefreshToken)
	if err != nil {
		if errors.Is(err, service.ErrInvalidToken) {
			return nil, status.Error(codes.Unauthenticated, "invalid refresh token")
		}

		if errors.Is(err, service.ErrUserInactive) {
			return nil, status.Error(codes.PermissionDenied, "user inactive")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.RefreshTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (h *AuthHandler) ValidateToken(ctx context.Context, req *authv1.ValidateTokenRequest) (*authv1.ValidateTokenResponse, error) {
	user, err := h.authService.ValidateToken(ctx, req.AccessToken)
	if err != nil {
		if errors.Is(err, service.ErrInvalidToken) {
			return &authv1.ValidateTokenResponse{
				Valid: false,
			}, nil
		}

		if errors.Is(err, service.ErrUserInactive) {
			return nil, status.Error(codes.PermissionDenied, "user inactive")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.ValidateTokenResponse{
		Valid:  true,
		UserId: user.ID,
		Role:   user.Role,
	}, nil
}

func (h *AuthHandler) Logout(ctx context.Context, req *authv1.LogoutRequest) (*authv1.LogoutResponse, error) {
	err := h.authService.Logout(ctx, req.RefreshToken)
	if err != nil {
		if errors.Is(err, service.ErrInvalidToken) {
			return nil, status.Error(codes.Unauthenticated, "invalid refresh token")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.LogoutResponse{
		Success: true,
	}, nil
}

func (h *AuthHandler) ChangePassword(
	ctx context.Context,
	req *authv1.ChangePasswordRequest,
) (*authv1.ChangePasswordResponse, error) {
	err := h.authService.ChangePassword(
		ctx,
		req.UserId,
		req.CurrentPassword,
		req.NewPassword,
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredential) {
			return nil, status.Error(codes.Unauthenticated, "current password incorrect")
		}
		if errors.Is(err, service.ErrPasswordTooShort) {
			return nil, status.Error(codes.InvalidArgument, "new password must be at least 8 characters")
		}
		if errors.Is(err, service.ErrSamePassword) {
			return nil, status.Error(codes.InvalidArgument, "new password must differ from current")
		}
		if errors.Is(err, service.ErrUserNotFound) {
			return nil, status.Error(codes.NotFound, "user not found")
		}
		if errors.Is(err, service.ErrUserInactive) {
			return nil, status.Error(codes.PermissionDenied, "user inactive")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.ChangePasswordResponse{Success: true}, nil
}
