package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrAnnouncementNotFound = errors.New("announcement not found")
	ErrAnnouncementInvalid  = errors.New("invalid announcement payload")
)

func (s *AcademicService) ListAnnouncements(
	ctx context.Context,
	viewerRole string,
	includeInactive bool,
) ([]model.Announcement, error) {
	repo := repository.NewAnnouncementRepository(s.repo.DB())
	return repo.List(ctx, viewerRole, includeInactive)
}

func (s *AcademicService) CreateAnnouncement(
	ctx context.Context,
	a model.Announcement,
) (*model.Announcement, error) {
	a.Title = strings.TrimSpace(a.Title)
	a.Body = strings.TrimSpace(a.Body)
	a.Severity = strings.ToUpper(strings.TrimSpace(a.Severity))
	a.AuthorUserID = strings.TrimSpace(a.AuthorUserID)
	a.AuthorName = strings.TrimSpace(a.AuthorName)

	if a.Title == "" || a.Body == "" || a.AuthorUserID == "" {
		return nil, ErrAnnouncementInvalid
	}
	if a.Severity == "" {
		a.Severity = "INFO"
	}
	if !validSeverity(a.Severity) {
		return nil, ErrAnnouncementInvalid
	}
	if a.StartsAt.IsZero() {
		a.StartsAt = time.Now()
	}
	repo := repository.NewAnnouncementRepository(s.repo.DB())
	return repo.Create(ctx, a)
}

func (s *AcademicService) UpdateAnnouncement(
	ctx context.Context,
	id string,
	title string,
	body string,
	severity string,
	targetRoles []string,
	endsAt string,
) (*model.Announcement, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, ErrAnnouncementInvalid
	}
	severity = strings.ToUpper(strings.TrimSpace(severity))
	if severity != "" && !validSeverity(severity) {
		return nil, ErrAnnouncementInvalid
	}

	repo := repository.NewAnnouncementRepository(s.repo.DB())

	var endsAtArg *string
	if t := strings.TrimSpace(endsAt); t != "" {
		endsAtArg = &t
	}

	a, err := repo.Update(ctx, id, title, body, severity, targetRoles, endsAtArg)
	if errors.Is(err, repository.ErrAnnouncementNotFound) {
		return nil, ErrAnnouncementNotFound
	}
	return a, err
}

func (s *AcademicService) DeactivateAnnouncement(
	ctx context.Context,
	id string,
) (*model.Announcement, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, ErrAnnouncementInvalid
	}
	repo := repository.NewAnnouncementRepository(s.repo.DB())
	a, err := repo.Deactivate(ctx, id)
	if errors.Is(err, repository.ErrAnnouncementNotFound) {
		return nil, ErrAnnouncementNotFound
	}
	return a, err
}

func validSeverity(s string) bool {
	switch s {
	case "INFO", "WARNING", "CRITICAL", "SUCCESS":
		return true
	}
	return false
}
