package service

import (
	"context"
	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

type FAQService struct {
	repo *repository.FAQRepository
}

func NewFAQService(repo *repository.FAQRepository) *FAQService {
	return &FAQService{repo: repo}
}

func (s *FAQService) GetCategories(ctx context.Context) ([]model.FAQCategory, error) {
	return s.repo.GetCategories(ctx)
}

func (s *FAQService) GetFAQs(ctx context.Context, categoryID string) ([]model.FAQ, error) {
	return s.repo.GetFAQs(ctx, categoryID)
}

func (s *FAQService) CreateFAQ(ctx context.Context, f *model.FAQ) (*model.FAQ, error) {
	return s.repo.CreateFAQ(ctx, f)
}

func (s *FAQService) UpdateFAQ(ctx context.Context, f *model.FAQ) error {
	return s.repo.UpdateFAQ(ctx, f)
}

func (s *FAQService) DeleteFAQ(ctx context.Context, id string) error {
	return s.repo.DeleteFAQ(ctx, id)
}
