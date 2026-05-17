package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"campus-flow/apps/services/auth-service/internal/model"
	"campus-flow/apps/services/auth-service/internal/repository"
	tokenutil "campus-flow/apps/services/auth-service/internal/token"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredential = errors.New("invalid credential")
	ErrInvalidRole       = errors.New("invalid role")
	ErrEmailDuplicate    = errors.New("email already registered")
	ErrUserInactive      = errors.New("user inactive")
	ErrInvalidToken      = errors.New("invalid token")
	ErrPasswordTooShort  = errors.New("password too short")
	ErrSamePassword      = errors.New("new password must differ from current")
)

type AuthService struct {
	userRepo        *repository.UserRepository
	tokenRepo       *repository.TokenRepository
	resetRepo       *repository.PasswordResetRepository
	mailer          mailSender
	jwtSecret       string
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

// mailSender is a tiny interface so we don't have to import the mail package
// here; the password_reset_service.go file uses the mail.Sender directly.
type mailSender interface {
	Send(ctx context.Context, to, subject, body string) error
}

func NewAuthService(
	userRepo *repository.UserRepository,
	tokenRepo *repository.TokenRepository,
	jwtSecret string,
	accessTokenTTL time.Duration,
	refreshTokenTTL time.Duration,
) *AuthService {
	return &AuthService{
		userRepo:        userRepo,
		tokenRepo:       tokenRepo,
		jwtSecret:       jwtSecret,
		accessTokenTTL:  accessTokenTTL,
		refreshTokenTTL: refreshTokenTTL,
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
		if errors.Is(err, repository.ErrEmailDuplicate) {
			return nil, ErrEmailDuplicate
		}
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

	accessToken, err := tokenutil.GenerateAccessToken(user, s.jwtSecret, s.accessTokenTTL)
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := tokenutil.GenerateRefreshToken()
	if err != nil {
		return nil, "", "", err
	}

	refreshTokenHash := tokenutil.HashRefreshToken(refreshToken)
	refreshTokenExpiresAt := time.Now().Add(s.refreshTokenTTL).Format("2006-01-02 15:04:05")

	if err := s.tokenRepo.CreateRefreshToken(ctx, user.ID, refreshTokenHash, refreshTokenExpiresAt); err != nil {
		return nil, "", "", err
	}

	// Best-effort login audit. We never block authentication on audit failure.
	if err := s.userRepo.LogLogin(ctx, user.ID, "", ""); err != nil {
		// log but do not return — audit must never break sign-in
		_ = err
	}

	return user, accessToken, refreshToken, nil
}

func (s *AuthService) RefreshToken(
	ctx context.Context,
	refreshToken string,
) (string, string, error) {
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return "", "", ErrInvalidToken
	}

	refreshTokenHash := tokenutil.HashRefreshToken(refreshToken)

	storedToken, err := s.tokenRepo.FindValidRefreshToken(ctx, refreshTokenHash)
	if err != nil {
		if errors.Is(err, repository.ErrRefreshTokenNotFound) {
			return "", "", ErrInvalidToken
		}

		return "", "", err
	}

	user, err := s.userRepo.FindByID(ctx, storedToken.UserID)
	if err != nil {
		return "", "", err
	}

	if user.Status != "ACTIVE" {
		return "", "", ErrUserInactive
	}

	if err := s.tokenRepo.RevokeRefreshTokenByHash(ctx, refreshTokenHash); err != nil {
		return "", "", err
	}

	newAccessToken, err := tokenutil.GenerateAccessToken(user, s.jwtSecret, s.accessTokenTTL)
	if err != nil {
		return "", "", err
	}

	newRefreshToken, err := tokenutil.GenerateRefreshToken()
	if err != nil {
		return "", "", err
	}

	newRefreshTokenHash := tokenutil.HashRefreshToken(newRefreshToken)
	newRefreshTokenExpiresAt := time.Now().Add(s.refreshTokenTTL).Format("2006-01-02 15:04:05")

	if err := s.tokenRepo.CreateRefreshToken(ctx, user.ID, newRefreshTokenHash, newRefreshTokenExpiresAt); err != nil {
		return "", "", err
	}

	return newAccessToken, newRefreshToken, nil
}

func (s *AuthService) ValidateToken(
	ctx context.Context,
	accessToken string,
) (*model.User, error) {
	accessToken = strings.TrimSpace(accessToken)
	if accessToken == "" {
		return nil, ErrInvalidToken
	}

	claims, err := tokenutil.ValidateAccessToken(accessToken, s.jwtSecret)
	if err != nil {
		return nil, ErrInvalidToken
	}

	user, err := s.userRepo.FindByID(ctx, claims.Subject)
	if err != nil {
		return nil, err
	}

	if user.Status != "ACTIVE" {
		return nil, ErrUserInactive
	}

	return user, nil
}

func (s *AuthService) Logout(
	ctx context.Context,
	refreshToken string,
) error {
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return ErrInvalidToken
	}

	refreshTokenHash := tokenutil.HashRefreshToken(refreshToken)

	return s.tokenRepo.RevokeRefreshTokenByHash(ctx, refreshTokenHash)
}

// ChangePassword verifies the current password then updates to the new one.
// All existing refresh tokens for the user are revoked so other sessions are
// invalidated.
func (s *AuthService) ChangePassword(
	ctx context.Context,
	userID string,
	currentPassword string,
	newPassword string,
) error {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return errors.New("user_id is required")
	}
	if len(newPassword) < 8 {
		return ErrPasswordTooShort
	}
	if currentPassword == newPassword {
		return ErrSamePassword
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	if user.Status != "ACTIVE" {
		return ErrUserInactive
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredential
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.userRepo.UpdatePassword(ctx, userID, string(hashed)); err != nil {
		return err
	}

	if err := s.tokenRepo.RevokeAllForUser(ctx, userID); err != nil {
		// Non-fatal: at worst, old sessions stay alive until expiry.
		_ = err
	}

	return nil
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
