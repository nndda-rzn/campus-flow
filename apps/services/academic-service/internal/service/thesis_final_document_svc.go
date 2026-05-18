package service

import (
	"context"
	"errors"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrThesisFinalDocNotFound     = errors.New("thesis final document not found")
	ErrInvalidDocumentTransition  = errors.New("invalid status transition")
	ErrNotDocumentLecturer        = errors.New("you are not the assigned lecturer for this document")
)

type ThesisFinalDocumentService struct {
	repo *repository.ThesisFinalDocumentRepository
}

func NewThesisFinalDocumentService(repo *repository.ThesisFinalDocumentRepository) *ThesisFinalDocumentService {
	return &ThesisFinalDocumentService{repo: repo}
}

func (s *ThesisFinalDocumentService) ListByLecturer(
	ctx context.Context,
	lecturerUserID, statusFilter string,
	page, pageSize int,
) ([]model.ThesisFinalDocument, int, error) {
	return s.repo.ListByLecturer(ctx, lecturerUserID, statusFilter, page, pageSize)
}

func (s *ThesisFinalDocumentService) GetByID(ctx context.Context, id string) (*model.ThesisFinalDocument, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrThesisFinalDocumentNotFound) {
			return nil, ErrThesisFinalDocNotFound
		}
		return nil, err
	}
	return doc, nil
}

func (s *ThesisFinalDocumentService) StartReview(ctx context.Context, id, lecturerUserID string) (*model.ThesisFinalDocument, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrThesisFinalDocumentNotFound) {
			return nil, ErrThesisFinalDocNotFound
		}
		return nil, err
	}

	if doc.LecturerUserID != lecturerUserID {
		return nil, ErrNotDocumentLecturer
	}

	if !CanTransition(ThesisFinalDocumentTransitions, doc.Status, model.TFDStatusUnderReview) {
		return nil, ErrInvalidDocumentTransition
	}

	if err := s.repo.UpdateStatus(ctx, id, model.TFDStatusUnderReview, "", ""); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}

func (s *ThesisFinalDocumentService) Approve(ctx context.Context, id, lecturerUserID, notes string) (*model.ThesisFinalDocument, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrThesisFinalDocumentNotFound) {
			return nil, ErrThesisFinalDocNotFound
		}
		return nil, err
	}

	if doc.LecturerUserID != lecturerUserID {
		return nil, ErrNotDocumentLecturer
	}

	if !CanTransition(ThesisFinalDocumentTransitions, doc.Status, model.TFDStatusApproved) {
		return nil, ErrInvalidDocumentTransition
	}

	if err := s.repo.UpdateStatus(ctx, id, model.TFDStatusApproved, notes, ""); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}

func (s *ThesisFinalDocumentService) RequestRevision(ctx context.Context, id, lecturerUserID, notes string) (*model.ThesisFinalDocument, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrThesisFinalDocumentNotFound) {
			return nil, ErrThesisFinalDocNotFound
		}
		return nil, err
	}

	if doc.LecturerUserID != lecturerUserID {
		return nil, ErrNotDocumentLecturer
	}

	if !CanTransition(ThesisFinalDocumentTransitions, doc.Status, model.TFDStatusRevisionRequested) {
		return nil, ErrInvalidDocumentTransition
	}

	if err := s.repo.UpdateStatus(ctx, id, model.TFDStatusRevisionRequested, notes, ""); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}

func (s *ThesisFinalDocumentService) Reject(ctx context.Context, id, lecturerUserID, reason string) (*model.ThesisFinalDocument, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrThesisFinalDocumentNotFound) {
			return nil, ErrThesisFinalDocNotFound
		}
		return nil, err
	}

	if doc.LecturerUserID != lecturerUserID {
		return nil, ErrNotDocumentLecturer
	}

	if !CanTransition(ThesisFinalDocumentTransitions, doc.Status, model.TFDStatusRejected) {
		return nil, ErrInvalidDocumentTransition
	}

	if err := s.repo.UpdateStatus(ctx, id, model.TFDStatusRejected, "", reason); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}
