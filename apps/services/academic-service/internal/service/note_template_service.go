package service

import (
	"context"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

type NoteTemplateService struct {
	repo *repository.NoteTemplateRepository
}

func NewNoteTemplateService(repo *repository.NoteTemplateRepository) *NoteTemplateService {
	return &NoteTemplateService{repo: repo}
}

func (s *NoteTemplateService) List(ctx context.Context, departmentID, category string) ([]model.NoteTemplate, error) {
	return s.repo.List(ctx, departmentID, category)
}

func (s *NoteTemplateService) Create(ctx context.Context, departmentID, category, title, body, createdByUserID string) (*model.NoteTemplate, error) {
	t := &model.NoteTemplate{
		DepartmentID:    departmentID,
		Category:        category,
		Title:           title,
		Body:            body,
		CreatedByUserID: createdByUserID,
	}
	return s.repo.Create(ctx, t)
}

func (s *NoteTemplateService) Update(ctx context.Context, id, title, body, category string) (*model.NoteTemplate, error) {
	return s.repo.Update(ctx, id, title, body, category)
}

func (s *NoteTemplateService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *NoteTemplateService) IncrementUsage(ctx context.Context, id string) (*model.NoteTemplate, error) {
	return s.repo.IncrementUsage(ctx, id)
}
