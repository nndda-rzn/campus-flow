package service

import (
	"context"
	"time"
	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

type AcademicCalendarService struct {
	repo *repository.AcademicCalendarRepository
}

func NewAcademicCalendarService(repo *repository.AcademicCalendarRepository) *AcademicCalendarService {
	return &AcademicCalendarService{repo: repo}
}

func (s *AcademicCalendarService) GetEvents(ctx context.Context, startDate, endDate *time.Time, departmentID string) ([]model.AcademicCalendar, error) {
	return s.repo.GetEvents(ctx, startDate, endDate, departmentID)
}

func (s *AcademicCalendarService) CreateEvent(ctx context.Context, e *model.AcademicCalendar) (*model.AcademicCalendar, error) {
	return s.repo.CreateEvent(ctx, e)
}

func (s *AcademicCalendarService) UpdateEvent(ctx context.Context, e *model.AcademicCalendar) error {
	return s.repo.UpdateEvent(ctx, e)
}

func (s *AcademicCalendarService) DeleteEvent(ctx context.Context, id string) error {
	return s.repo.DeleteEvent(ctx, id)
}
