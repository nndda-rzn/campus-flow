package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrAcademicYearNotFound = errors.New("academic year not found")
	ErrAcademicYearInvalid  = errors.New("invalid academic year payload")
)

func (s *AcademicService) ListAcademicYears(ctx context.Context) ([]model.AcademicYear, error) {
	repo := repository.NewAcademicYearRepository(s.repo.DB())
	return repo.List(ctx)
}

func (s *AcademicService) GetActiveAcademicYear(ctx context.Context) (*model.AcademicYear, error) {
	repo := repository.NewAcademicYearRepository(s.repo.DB())
	y, err := repo.GetActive(ctx)
	if errors.Is(err, repository.ErrAcademicYearNotFound) {
		return nil, ErrAcademicYearNotFound
	}
	return y, err
}

func (s *AcademicService) CreateAcademicYear(
	ctx context.Context,
	code, name, startDate, endDate string,
	isActive bool,
) (*model.AcademicYear, error) {
	if strings.TrimSpace(code) == "" || strings.TrimSpace(name) == "" ||
		strings.TrimSpace(startDate) == "" || strings.TrimSpace(endDate) == "" {
		return nil, ErrAcademicYearInvalid
	}
	repo := repository.NewAcademicYearRepository(s.repo.DB())
	return repo.Create(ctx, code, name, startDate, endDate, isActive)
}

func (s *AcademicService) SetActiveAcademicYear(
	ctx context.Context,
	id string,
) (*model.AcademicYear, error) {
	if strings.TrimSpace(id) == "" {
		return nil, ErrAcademicYearInvalid
	}
	repo := repository.NewAcademicYearRepository(s.repo.DB())
	y, err := repo.SetActive(ctx, id)
	if errors.Is(err, repository.ErrAcademicYearNotFound) {
		return nil, ErrAcademicYearNotFound
	}
	return y, err
}

// ─── Scope ──────────────────────────────────────────────────────────────────

func (s *AcademicService) GetUserScope(
	ctx context.Context,
	userID string,
) ([]model.UserDepartmentScope, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, ErrInvalidInput
	}
	repo := repository.NewScopeRepository(s.repo.DB())
	return repo.ListByUserID(ctx, userID)
}

func (s *AcademicService) SetUserScope(
	ctx context.Context,
	userID string,
	departmentIDs []string,
) ([]model.UserDepartmentScope, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, ErrInvalidInput
	}
	repo := repository.NewScopeRepository(s.repo.DB())
	if err := repo.ReplaceForUser(ctx, userID, departmentIDs); err != nil {
		return nil, err
	}
	return repo.ListByUserID(ctx, userID)
}
