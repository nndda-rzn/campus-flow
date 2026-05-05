package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"campus-flow/apps/services/auth-service/internal/model"
	"campus-flow/apps/services/auth-service/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredential = errors.New("invalid credential")
	ErrInvalidRole       = errors.New("invalid role")
	ErrUserInactive      = errors.New("user inactive")
)

type AuthService struct {
	userRepo *repository.UserRepository
}

func NewAuthService(userRepo *repository.UserRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
	}
}

func (s *AuthService) Register(
	ctx context.Context,
	fullName string,
	email string,
	password string,
	role string,
) (*model.User, error) {
	fullName = strings.TrimSpace(fullName)
	email = strings.ToLower(strings.TrimSpace(email))
	role = normalizeRole(role)

	if fullName == "" || email == "" || password == "" {
		return nil, errors.New("full name, email, and password are required")
	}

	if role == "" {
		role = "MAHASISWA"
	}

	if !isAllowedRole(role) {
		return nil, ErrInvalidRole
	}

	passwordHashBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.CreateUserWithRole(
		ctx,
		fullName,
		email,
		string(passwordHashBytes),
		role,
	)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *AuthService) Login(
	ctx context.Context,
	email string,
	password string,
) (*model.User, string, string, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, "", "", ErrInvalidCredential
		}

		return nil, "", "", err
	}

	if user.Status != "ACTIVE" {
		return nil, "", "", ErrUserInactive
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, "", "", ErrInvalidCredential
	}

	// Sementara masih dummy token.
	// JWT asli akan dibuat di tahap berikutnya.
	accessToken := fmt.Sprintf("temporary-access-token-%s", user.ID)
	refreshToken := fmt.Sprintf("temporary-refresh-token-%s", user.ID)

	return user, accessToken, refreshToken, nil
}

func normalizeRole(role string) string {
	return strings.ToUpper(strings.TrimSpace(role))
}

func isAllowedRole(role string) bool {
	allowedRoles := map[string]bool{
		"SUPER_ADMIN": true,
		"ADMIN_PRODI": true,
		"MAHASISWA":   true,
		"DOSEN":       true,
		"KAPRODI":     true,
		"TATA_USAHA":  true,
	}

	return allowedRoles[role]
}