package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"campus-flow/apps/services/auth-service/internal/mail"
	"campus-flow/apps/services/auth-service/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrResetTokenInvalid = errors.New("invalid or expired reset token")
)

const (
	passwordResetTTL = 30 * time.Minute
	defaultResetBase = "http://localhost:3000/reset-password"
)

// SetPasswordResetDeps wires the password reset repository and mail sender
// into the existing AuthService. Done via setter rather than constructor so
// existing call sites don't need to change.
func (s *AuthService) SetPasswordResetDeps(
	resetRepo *repository.PasswordResetRepository,
	mailer mail.Sender,
) {
	s.resetRepo = resetRepo
	// mail.Sender satisfies the local mailSender interface (Send signature
	// is identical), so we can assign directly.
	s.mailer = mailer
}

// ForgotPassword issues a single-use reset token and emails it. Always
// returns nil error so the response is enumeration-safe (the API won't
// confirm whether an email exists).
func (s *AuthService) ForgotPassword(
	ctx context.Context,
	email, resetURLBase string,
) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil
	}

	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		// Pretend success — we don't reveal account existence.
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil
		}
		return err
	}

	// Generate 32 raw bytes -> 64 hex chars. Hash with SHA-256 for storage.
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return err
	}
	rawToken := hex.EncodeToString(rawBytes)
	hashBytes := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hashBytes[:])

	if s.resetRepo == nil {
		return errors.New("password reset not configured")
	}
	if err := s.resetRepo.CreateToken(ctx, user.ID, tokenHash, time.Now().Add(passwordResetTTL)); err != nil {
		return err
	}

	base := strings.TrimSpace(resetURLBase)
	if base == "" {
		base = defaultResetBase
	}
	link := fmt.Sprintf("%s?token=%s", base, rawToken)

	if s.mailer != nil {
		body := fmt.Sprintf(
			"Halo %s,\n\nKami menerima permintaan reset password untuk akun CampusFlow Anda.\n\nKlik tautan berikut untuk membuat password baru (berlaku 30 menit):\n%s\n\nJika Anda tidak meminta reset, abaikan email ini.\n\nSalam,\nTim CampusFlow",
			user.FullName, link,
		)
		_ = s.mailer.Send(ctx, user.Email, "Reset Password CampusFlow", body)
	}

	return nil
}

// ResetPassword consumes a valid token and writes the new password. Revokes
// every refresh token for the user so other sessions are invalidated.
func (s *AuthService) ResetPassword(
	ctx context.Context,
	token, newPassword string,
) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return ErrResetTokenInvalid
	}
	if len(newPassword) < 8 {
		return ErrPasswordTooShort
	}

	if s.resetRepo == nil {
		return errors.New("password reset not configured")
	}

	hashBytes := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hashBytes[:])

	rec, err := s.resetRepo.FindValidToken(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, repository.ErrResetTokenNotFound) {
			return ErrResetTokenInvalid
		}
		return err
	}

	user, err := s.userRepo.FindByID(ctx, rec.UserID)
	if err != nil {
		return err
	}
	if user.Status != "ACTIVE" {
		return ErrUserInactive
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.userRepo.UpdatePassword(ctx, user.ID, string(hashed)); err != nil {
		return err
	}

	// Mark this token used + purge any other outstanding tokens for the user.
	_ = s.resetRepo.MarkUsed(ctx, rec.ID)
	_ = s.resetRepo.PurgeUserTokens(ctx, user.ID)

	// Invalidate every active refresh token (other devices must re-login).
	_ = s.tokenRepo.RevokeAllForUser(ctx, user.ID)

	return nil
}
