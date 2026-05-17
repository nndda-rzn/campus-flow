// Package mail provides a minimal abstraction over outbound email so that
// auth-service can send password-reset links without depending on a specific
// SMTP provider. In development the stub implementation logs the email body
// to stdout. In production, set the SMTP_* env vars to switch to real
// delivery.
package mail

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

// Sender is the contract every implementation must satisfy.
type Sender interface {
	Send(ctx context.Context, to, subject, body string) error
}

// Config is read from environment by NewFromEnv. Empty SMTP_HOST falls back
// to a stub sender which just logs the message — useful for local dev so
// signup / forgot-password flows can be tested end-to-end without any
// outbound network setup.
type Config struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

// NewFromEnv builds a Sender from environment variables:
//
//	SMTP_HOST     (empty → stub)
//	SMTP_PORT     (default 587)
//	SMTP_USERNAME
//	SMTP_PASSWORD
//	MAIL_FROM     (default "no-reply@campusflow.local")
func NewFromEnv() Sender {
	cfg := Config{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     orDefault(os.Getenv("SMTP_PORT"), "587"),
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     orDefault(os.Getenv("MAIL_FROM"), "no-reply@campusflow.local"),
	}
	if cfg.Host == "" {
		log.Println("auth: SMTP_HOST not set — using stub mail sender (logs to stdout)")
		return &stubSender{from: cfg.From}
	}
	log.Printf("auth: SMTP sender configured (host=%s port=%s from=%s)", cfg.Host, cfg.Port, cfg.From)
	return &smtpSender{cfg: cfg}
}

func orDefault(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}

// ─── Stub ──────────────────────────────────────────────────────────────────

type stubSender struct {
	from string
}

func (s *stubSender) Send(_ context.Context, to, subject, body string) error {
	log.Printf("=== STUB MAIL ===")
	log.Printf("From: %s", s.from)
	log.Printf("To:   %s", to)
	log.Printf("Subj: %s", subject)
	log.Printf("Body: %s", body)
	log.Printf("=================")
	return nil
}

// ─── SMTP ──────────────────────────────────────────────────────────────────

type smtpSender struct {
	cfg Config
}

func (s *smtpSender) Send(_ context.Context, to, subject, body string) error {
	addr := s.cfg.Host + ":" + s.cfg.Port

	var auth smtp.Auth
	if s.cfg.Username != "" {
		auth = smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	}

	msg := []byte(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\n\r\n%s",
		s.cfg.From, to, subject, body,
	))

	return smtp.SendMail(addr, auth, s.cfg.From, []string{to}, msg)
}
