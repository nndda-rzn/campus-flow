package handler

import (
	"context"
	"errors"

	"campus-flow/apps/services/auth-service/internal/model"
	"campus-flow/apps/services/auth-service/internal/service"
	authv1 "campus-flow/proto/gen/auth/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func toUserItem(u *model.User) *authv1.UserItem {
	return &authv1.UserItem{
		Id:        u.ID,
		FullName:  u.FullName,
		Email:     u.Email,
		Role:      u.Role,
		Status:    u.Status,
		CreatedAt: u.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: u.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func mapUserError(err error) error {
	if errors.Is(err, service.ErrUserNotFound) {
		return status.Error(codes.NotFound, "user not found")
	}
	if errors.Is(err, service.ErrInvalidRole) {
		return status.Error(codes.InvalidArgument, "invalid role")
	}
	if errors.Is(err, service.ErrInvalidUserStatus) {
		return status.Error(codes.InvalidArgument, "invalid user status")
	}
	if errors.Is(err, service.ErrEmailDuplicate) {
		return status.Error(codes.AlreadyExists, "email already registered")
	}
	return status.Error(codes.Internal, err.Error())
}

func (h *AuthHandler) ListUsers(
	ctx context.Context,
	req *authv1.ListUsersRequest,
) (*authv1.ListUsersResponse, error) {
	users, err := h.authService.ListUsers(ctx, req.RoleFilter, req.StatusFilter, req.Search)
	if err != nil {
		return nil, mapUserError(err)
	}

	items := make([]*authv1.UserItem, 0, len(users))
	for _, u := range users {
		uCopy := u
		items = append(items, toUserItem(&uCopy))
	}
	return &authv1.ListUsersResponse{Users: items}, nil
}

func (h *AuthHandler) ListUsersByRole(
	ctx context.Context,
	req *authv1.ListUsersByRoleRequest,
) (*authv1.ListUsersResponse, error) {
	users, err := h.authService.ListUsersByRole(ctx, req.Role)
	if err != nil {
		return nil, mapUserError(err)
	}

	items := make([]*authv1.UserItem, 0, len(users))
	for _, u := range users {
		uCopy := u
		items = append(items, toUserItem(&uCopy))
	}
	return &authv1.ListUsersResponse{Users: items}, nil
}

func (h *AuthHandler) GetUser(
	ctx context.Context,
	req *authv1.GetUserRequest,
) (*authv1.UserItemResponse, error) {
	user, err := h.authService.GetUser(ctx, req.UserId)
	if err != nil {
		return nil, mapUserError(err)
	}
	return &authv1.UserItemResponse{User: toUserItem(user)}, nil
}

func (h *AuthHandler) UpdateUser(
	ctx context.Context,
	req *authv1.UpdateUserRequest,
) (*authv1.UserItemResponse, error) {
	// actorUserID is currently not provided by the proto; treat as empty for
	// audit fallback. The gateway can pass it via metadata in a future pass.
	user, err := h.authService.UpdateUser(ctx, req.UserId, "", req.FullName, req.Email)
	if err != nil {
		return nil, mapUserError(err)
	}
	return &authv1.UserItemResponse{User: toUserItem(user)}, nil
}

func (h *AuthHandler) SetUserStatus(
	ctx context.Context,
	req *authv1.SetUserStatusRequest,
) (*authv1.UserItemResponse, error) {
	user, err := h.authService.SetUserStatus(ctx, req.UserId, "", req.Status)
	if err != nil {
		return nil, mapUserError(err)
	}
	return &authv1.UserItemResponse{User: toUserItem(user)}, nil
}

func (h *AuthHandler) AssignUserRole(
	ctx context.Context,
	req *authv1.AssignUserRoleRequest,
) (*authv1.UserItemResponse, error) {
	user, err := h.authService.AssignUserRole(ctx, req.UserId, req.ActorUserId, req.Role)
	if err != nil {
		return nil, mapUserError(err)
	}
	return &authv1.UserItemResponse{User: toUserItem(user)}, nil
}
