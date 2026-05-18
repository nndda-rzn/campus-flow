package handler

import (
	"context"
	"time"

	"campus-flow/apps/services/academic-service/internal/service"
	"campus-flow/apps/services/academic-service/internal/model"
	academicv1 "campus-flow/proto/gen/academic/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type FAQHandler struct {
	svc *service.FAQService
}

func NewFAQHandler(svc *service.FAQService) *FAQHandler {
	return &FAQHandler{svc: svc}
}

func (h *FAQHandler) GetCategories(ctx context.Context, req *academicv1.GetCategoriesRequest) (*academicv1.GetCategoriesResponse, error) {
	categories, err := h.svc.GetCategories(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get FAQ categories: %v", err)
	}

	res := &academicv1.GetCategoriesResponse{}
	for _, c := range categories {
		res.Categories = append(res.Categories, &academicv1.FAQCategoryItem{
			Id:            c.ID,
			Name:          c.Name,
			Description:   c.Description,
			Icon:          c.Icon,
			SequenceOrder: int32(c.SequenceOrder),
			IsActive:      c.IsActive,
			CreatedAt:     c.CreatedAt.Format(time.RFC3339),
		})
	}
	return res, nil
}

func (h *FAQHandler) GetFAQs(ctx context.Context, req *academicv1.GetFAQsRequest) (*academicv1.GetFAQsResponse, error) {
	faqs, err := h.svc.GetFAQs(ctx, req.CategoryId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get FAQs: %v", err)
	}

	res := &academicv1.GetFAQsResponse{}
	for _, f := range faqs {
		res.Faqs = append(res.Faqs, &academicv1.FAQItem{
			Id:            f.ID,
			CategoryId:    f.CategoryID,
			Question:      f.Question,
			Answer:        f.Answer,
			SequenceOrder: int32(f.SequenceOrder),
			IsActive:      f.IsActive,
			ViewCount:     int32(f.ViewCount),
			CreatedAt:     f.CreatedAt.Format(time.RFC3339),
			UpdatedAt:     f.UpdatedAt.Format(time.RFC3339),
			CategoryName:  f.CategoryName,
		})
	}
	return res, nil
}
