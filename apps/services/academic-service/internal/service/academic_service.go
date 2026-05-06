package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrInvalidInput             = errors.New("invalid input")
	ErrAcademicServiceNotFound = errors.New("academic service not found")
	ErrAcademicRequestNotFound = errors.New("academic request not found")
)

type AcademicService struct {
	repo *repository.AcademicRepository
}

func NewAcademicService(repo *repository.AcademicRepository) *AcademicService {
	return &AcademicService{
		repo: repo,
	}
}

func (s *AcademicService) ListAcademicServices(ctx context.Context) ([]model.AcademicServiceItem, error) {
	return s.repo.ListAcademicServices(ctx)
}

func (s *AcademicService) CreateAcademicRequest(
	ctx context.Context,
	studentUserID string,
	serviceCode string,
	title string,
	description string,
) (*model.AcademicRequest, error) {
	studentUserID = strings.TrimSpace(studentUserID)
	serviceCode = strings.ToUpper(strings.TrimSpace(serviceCode))
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)

	if studentUserID == "" || serviceCode == "" || title == "" {
		return nil, ErrInvalidInput
	}

	req, err := s.repo.CreateAcademicRequest(
		ctx,
		studentUserID,
		serviceCode,
		title,
		description,
	)
	if err != nil {
		if errors.Is(err, repository.ErrAcademicServiceNotFound) {
			return nil, ErrAcademicServiceNotFound
		}

		return nil, err
	}

	return req, nil
}

func (s *AcademicService) GetAcademicRequest(
	ctx context.Context,
	requestID string,
) (*model.AcademicRequest, error) {
	requestID = strings.TrimSpace(requestID)
	if requestID == "" {
		return nil, ErrInvalidInput
	}

	req, err := s.repo.GetAcademicRequestByID(ctx, requestID)
	if err != nil {
		if errors.Is(err, repository.ErrAcademicRequestNotFound) {
			return nil, ErrAcademicRequestNotFound
		}

		return nil, err
	}

	return req, nil
}

func (s *AcademicService) ListMyAcademicRequests(
	ctx context.Context,
	studentUserID string,
) ([]model.AcademicRequest, error) {
	studentUserID = strings.TrimSpace(studentUserID)
	if studentUserID == "" {
		return nil, ErrInvalidInput
	}

	return s.repo.ListByStudentUserID(ctx, studentUserID)
}