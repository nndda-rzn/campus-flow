package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrInvalidInput            = errors.New("invalid input")
	ErrAcademicServiceNotFound = errors.New("academic service not found")
	ErrAcademicRequestNotFound = errors.New("academic request not found")
	ErrInvalidStatusTransition = errors.New("invalid status transition")
	ErrForbidden               = errors.New("forbidden: insufficient permissions")
	ErrNoteRequired            = errors.New("revision note is required")
	ErrNoteTooLong             = errors.New("note exceeds maximum length of 2000 characters")
	ErrQuotaExceeded           = errors.New("lecturer supervisor quota exceeded")
)

const maxNoteLength = 2000

type AcademicService struct {
	repo *repository.AcademicRepository
}

func NewAcademicService(repo *repository.AcademicRepository) *AcademicService {
	return &AcademicService{
		repo: repo,
	}
}

func (s *AcademicService) verifyOwnership(ctx context.Context, requestID, actorUserID string) (*model.AcademicRequest, error) {
	req, err := s.repo.GetAcademicRequestByID(ctx, requestID)
	if err != nil {
		if errors.Is(err, repository.ErrAcademicRequestNotFound) {
			return nil, ErrAcademicRequestNotFound
		}
		return nil, err
	}
	if req.StudentUserID != actorUserID {
		return nil, ErrForbidden
	}
	return req, nil
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

func (s *AcademicService) ListAllAcademicRequests(
	ctx context.Context,
	statusFilter string,
) ([]model.AcademicRequest, error) {
	return s.repo.ListAllAcademicRequests(ctx, strings.TrimSpace(statusFilter))
}

func (s *AcademicService) VerifyAcademicRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.AcademicRequest, error) {
	return s.workflowAction(
		ctx,
		requestID,
		actorUserID,
		"ADMIN_PRODI",
		"ACADEMIC_REQUEST_VERIFIED",
		"VERIFIED",
		[]string{"SUBMITTED"},
		note,
	)
}

func (s *AcademicService) ApproveAcademicRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.AcademicRequest, error) {
	return s.workflowAction(
		ctx,
		requestID,
		actorUserID,
		"KAPRODI",
		"ACADEMIC_REQUEST_APPROVED",
		"APPROVED",
		[]string{"VERIFIED"},
		note,
	)
}

func (s *AcademicService) RejectAcademicRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.AcademicRequest, error) {
	return s.workflowAction(
		ctx,
		requestID,
		actorUserID,
		"KAPRODI",
		"ACADEMIC_REQUEST_REJECTED",
		"REJECTED",
		[]string{"VERIFIED"},
		note,
	)
}

func (s *AcademicService) CompleteAcademicRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.AcademicRequest, error) {
	return s.workflowAction(
		ctx,
		requestID,
		actorUserID,
		"TATA_USAHA",
		"ACADEMIC_REQUEST_COMPLETED",
		"COMPLETED",
		[]string{"APPROVED"},
		note,
	)
}

func (s *AcademicService) CancelAcademicRequest(
	ctx context.Context,
	requestID string,
	studentUserID string,
	note string,
) (*model.AcademicRequest, error) {
	// Ownership check: only the student who created the request may cancel it.
	if _, err := s.verifyOwnership(ctx, requestID, studentUserID); err != nil {
		return nil, err
	}

	return s.workflowAction(
		ctx,
		requestID,
		studentUserID,
		"MAHASISWA",
		"ACADEMIC_REQUEST_CANCELLED",
		"CANCELLED",
		AllowedFrom(AcademicTransitions, "CANCELLED"),
		note,
	)
}

func (s *AcademicService) RequestRevisionAcademicRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.AcademicRequest, error) {
	note = strings.TrimSpace(note)
	if note == "" {
		return nil, ErrNoteRequired
	}
	if len(note) > maxNoteLength {
		return nil, ErrNoteTooLong
	}

	return s.workflowAction(
		ctx,
		requestID,
		actorUserID,
		"ADMIN_PRODI",
		"ACADEMIC_REQUEST_REVISION_REQUIRED",
		"REVISION_REQUIRED",
		AllowedFrom(AcademicTransitions, "REVISION_REQUIRED"),
		note,
	)
}

func (s *AcademicService) SubmitAcademicRequest(
	ctx context.Context,
	requestID string,
	studentUserID string,
	note string,
) (*model.AcademicRequest, error) {
	requestID = strings.TrimSpace(requestID)
	studentUserID = strings.TrimSpace(studentUserID)
	if requestID == "" || studentUserID == "" {
		return nil, ErrInvalidInput
	}

	if _, err := s.verifyOwnership(ctx, requestID, studentUserID); err != nil {
		return nil, err
	}

	req, err := s.repo.SubmitAcademicRequest(
		ctx,
		requestID,
		studentUserID,
		strings.TrimSpace(note),
		AllowedFrom(AcademicTransitions, "SUBMITTED"),
	)
	if err != nil {
		if errors.Is(err, repository.ErrAcademicRequestNotFound) {
			return nil, ErrAcademicRequestNotFound
		}
		if errors.Is(err, repository.ErrInvalidStatusTransition) {
			return nil, ErrInvalidStatusTransition
		}
		if errors.Is(err, repository.ErrForbidden) {
			return nil, ErrForbidden
		}
		return nil, err
	}
	return req, nil
}

func (s *AcademicService) UpdateAcademicRequest(
	ctx context.Context,
	requestID string,
	studentUserID string,
	title string,
	description string,
) (*model.AcademicRequest, error) {
	requestID = strings.TrimSpace(requestID)
	studentUserID = strings.TrimSpace(studentUserID)
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)

	if requestID == "" || studentUserID == "" || title == "" {
		return nil, ErrInvalidInput
	}

	if _, err := s.verifyOwnership(ctx, requestID, studentUserID); err != nil {
		return nil, err
	}

	req, err := s.repo.UpdateAcademicRequestFields(
		ctx,
		requestID,
		studentUserID,
		title,
		description,
		[]string{"DRAFT", "REVISION_REQUIRED"},
	)
	if err != nil {
		if errors.Is(err, repository.ErrAcademicRequestNotFound) {
			return nil, ErrAcademicRequestNotFound
		}
		if errors.Is(err, repository.ErrInvalidStatusTransition) {
			return nil, ErrInvalidStatusTransition
		}
		if errors.Is(err, repository.ErrForbidden) {
			return nil, ErrForbidden
		}
		return nil, err
	}
	return req, nil
}

func (s *AcademicService) workflowAction(
	ctx context.Context,
	requestID string,
	actorUserID string,
	actorRole string,
	action string,
	targetStatus string,
	allowedCurrentStatuses []string,
	note string,
) (*model.AcademicRequest, error) {
	requestID = strings.TrimSpace(requestID)
	actorUserID = strings.TrimSpace(actorUserID)
	note = strings.TrimSpace(note)

	if requestID == "" || actorUserID == "" {
		return nil, ErrInvalidInput
	}

	req, err := s.repo.UpdateAcademicRequestStatus(
		ctx,
		requestID,
		actorUserID,
		actorRole,
		action,
		targetStatus,
		allowedCurrentStatuses,
		note,
	)
	if err != nil {
		if errors.Is(err, repository.ErrAcademicRequestNotFound) {
			return nil, ErrAcademicRequestNotFound
		}

		if errors.Is(err, repository.ErrInvalidStatusTransition) {
			return nil, ErrInvalidStatusTransition
		}

		return nil, err
	}

	return req, nil
}

func (s *AcademicService) GetAcademicRequestHistory(
	ctx context.Context,
	requestID string,
) ([]model.RequestStatusHistory, error) {
	requestID = strings.TrimSpace(requestID)
	if requestID == "" {
		return nil, ErrInvalidInput
	}

	// Verify the request exists first
	_, err := s.repo.GetAcademicRequestByID(ctx, requestID)
	if err != nil {
		if errors.Is(err, repository.ErrAcademicRequestNotFound) {
			return nil, ErrAcademicRequestNotFound
		}
		return nil, err
	}

	return s.repo.GetRequestStatusHistories(ctx, requestID)
}
