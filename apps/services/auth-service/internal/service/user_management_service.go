package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/auth-service/internal/model"
	"campus-flow/apps/services/auth-service/internal/repository"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidUserStatus = errors.New("invalid user status")
)

// ─── Admin user management ─────────────────────────────────────────────────

func (s *AuthService) ListUsers(
	ctx context.Context,
	roleFilter string,
	statusFilter string,
	search string,
) ([]model.User, error) {
	return s.userRepo.ListUsers(ctx, roleFilter, statusFilter, search)
}

func (s *AuthService) ListUsersByRole(
	ctx context.Context,
	role string,
) ([]model.User, error) {
	role = strings.TrimSpace(role)
	if role == "" {
		return nil, errors.New("role is required")
	}
	if !isAllowedRole(strings.ToUpper(role)) {
		return nil, ErrInvalidRole
	}
	return s.userRepo.ListByRole(ctx, role)
}

func (s *AuthService) GetUser(ctx context.Context, userID string) (*model.User, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, errors.New("user_id is required")
	}
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

func (s *AuthService) UpdateUser(
	ctx context.Context,
	userID string,
	actorUserID string,
	fullName string,
	email string,
) (*model.User, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, errors.New("user_id is required")
	}

	user, err := s.userRepo.UpdateUser(ctx, userID, actorUserID, fullName, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		if errors.Is(err, repository.ErrEmailDuplicate) {
			return nil, ErrEmailDuplicate
		}
		return nil, err
	}
	return user, nil
}

func (s *AuthService) SetUserStatus(
	ctx context.Context,
	userID string,
	actorUserID string,
	status string,
) (*model.User, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, errors.New("user_id is required")
	}

	user, err := s.userRepo.SetStatus(ctx, userID, actorUserID, status)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		if errors.Is(err, repository.ErrInvalidUserStatus) {
			return nil, ErrInvalidUserStatus
		}
		return nil, err
	}
	return user, nil
}

func (s *AuthService) AssignUserRole(
	ctx context.Context,
	userID string,
	actorUserID string,
	role string,
) (*model.User, error) {
	userID = strings.TrimSpace(userID)
	role = strings.ToUpper(strings.TrimSpace(role))
	if userID == "" || role == "" {
		return nil, errors.New("user_id and role are required")
	}
	if !isAllowedRole(role) {
		return nil, ErrInvalidRole
	}

	user, err := s.userRepo.AssignRole(ctx, userID, actorUserID, role)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		if errors.Is(err, repository.ErrRoleNotFound) {
			return nil, ErrInvalidRole
		}
		return nil, err
	}
	return user, nil
}
