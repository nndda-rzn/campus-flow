package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

func (s *AcademicService) ListLecturers(ctx context.Context) ([]model.Lecturer, error) {
	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())
	return supervisorRepo.ListLecturers(ctx)
}

func (s *AcademicService) CreateSupervisorRequest(
	ctx context.Context,
	studentUserID string,
	topicTitle string,
	topicDescription string,
	lecturerIDs []string,
) (*model.SupervisorRequest, error) {
	studentUserID = strings.TrimSpace(studentUserID)
	topicTitle = strings.TrimSpace(topicTitle)
	topicDescription = strings.TrimSpace(topicDescription)

	if studentUserID == "" || topicTitle == "" || len(lecturerIDs) == 0 {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	return supervisorRepo.CreateSupervisorRequest(
		ctx,
		studentUserID,
		topicTitle,
		topicDescription,
		lecturerIDs,
	)
}

func (s *AcademicService) ListAllSupervisorRequests(
	ctx context.Context,
	statusFilter string,
) ([]model.SupervisorRequest, error) {
	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())
	return supervisorRepo.ListAllSupervisorRequests(ctx, statusFilter)
}

func (s *AcademicService) ListMySupervisorRequests(
	ctx context.Context,
	studentUserID string,
) ([]model.SupervisorRequest, error) {
	studentUserID = strings.TrimSpace(studentUserID)
	if studentUserID == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())
	return supervisorRepo.ListByStudentUserID(ctx, studentUserID)
}

func (s *AcademicService) ListLecturerSupervisorRequests(
	ctx context.Context,
	lecturerUserID string,
) ([]model.SupervisorRequest, error) {
	lecturerUserID = strings.TrimSpace(lecturerUserID)
	if lecturerUserID == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())
	return supervisorRepo.ListByLecturerUserID(ctx, lecturerUserID)
}

func (s *AcademicService) VerifySupervisorRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	if strings.TrimSpace(requestID) == "" || strings.TrimSpace(actorUserID) == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	req, err := supervisorRepo.VerifySupervisorRequest(ctx, requestID, actorUserID, note)
	return mapSupervisorRepoError(req, err)
}

func (s *AcademicService) AssignSupervisor(
	ctx context.Context,
	requestID string,
	actorUserID string,
	lecturerID string,
	note string,
) (*model.SupervisorRequest, error) {
	if strings.TrimSpace(requestID) == "" || strings.TrimSpace(actorUserID) == "" || strings.TrimSpace(lecturerID) == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	req, err := supervisorRepo.AssignSupervisor(ctx, requestID, actorUserID, lecturerID, note)
	return mapSupervisorRepoError(req, err)
}

func (s *AcademicService) ReassignSupervisor(
	ctx context.Context,
	requestID string,
	actorUserID string,
	lecturerID string,
	note string,
) (*model.SupervisorRequest, error) {
	if strings.TrimSpace(requestID) == "" || strings.TrimSpace(actorUserID) == "" || strings.TrimSpace(lecturerID) == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	req, err := supervisorRepo.ReassignSupervisor(ctx, requestID, actorUserID, lecturerID, note)
	return mapSupervisorRepoError(req, err)
}

func (s *AcademicService) AcceptSupervisorRequest(
	ctx context.Context,
	requestID string,
	lecturerUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	if strings.TrimSpace(requestID) == "" || strings.TrimSpace(lecturerUserID) == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	req, err := supervisorRepo.AcceptSupervisorRequest(ctx, requestID, lecturerUserID, note)
	if err != nil {
		return mapSupervisorRepoError(req, err)
	}

	// Auto-create thesis progress milestones when a request is accepted & completed
	if req.Status == "COMPLETED" {
		thesisRepo := repository.NewThesisRepository(s.repo.DB())
		
		// Find student's department
		studentRepo := repository.NewDirectoryRepository(s.repo.DB())
		student, err := studentRepo.GetStudentByUserID(ctx, req.StudentUserID)
		if err == nil && student != nil && student.DepartmentID != "" {
			// Initialize progress within a transaction if possible, but for simplicity here we just call it
			// This would ideally be part of the same transaction in AcceptSupervisorRequest, but calling it here works for now
			tx, txErr := s.repo.DB().Begin(ctx)
			if txErr == nil {
				err = thesisRepo.InitializeProgress(ctx, tx, req.StudentUserID, req.ID, student.DepartmentID)
				if err == nil {
					_ = tx.Commit(ctx)
				} else {
					_ = tx.Rollback(ctx)
				}
			}
		}
	}

	return req, nil
}

func (s *AcademicService) RejectSupervisorRequest(
	ctx context.Context,
	requestID string,
	lecturerUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	if strings.TrimSpace(requestID) == "" || strings.TrimSpace(lecturerUserID) == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	req, err := supervisorRepo.RejectSupervisorRequest(ctx, requestID, lecturerUserID, note)
	return mapSupervisorRepoError(req, err)
}

func (s *AcademicService) CancelSupervisorRequest(
	ctx context.Context,
	requestID string,
	studentUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	if strings.TrimSpace(requestID) == "" || strings.TrimSpace(studentUserID) == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	req, err := supervisorRepo.CancelSupervisorRequest(ctx, requestID, studentUserID, note)
	return mapSupervisorRepoError(req, err)
}

func (s *AcademicService) RequestRevisionSupervisorRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	requestID = strings.TrimSpace(requestID)
	actorUserID = strings.TrimSpace(actorUserID)
	note = strings.TrimSpace(note)

	if requestID == "" || actorUserID == "" {
		return nil, ErrInvalidInput
	}
	if note == "" {
		return nil, ErrNoteRequired
	}
	if len(note) > maxNoteLength {
		return nil, ErrNoteTooLong
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	req, err := supervisorRepo.RequestRevisionSupervisorRequest(ctx, requestID, actorUserID, note)
	return mapSupervisorRepoError(req, err)
}

func (s *AcademicService) CompleteSupervisorRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	if strings.TrimSpace(requestID) == "" || strings.TrimSpace(actorUserID) == "" {
		return nil, ErrInvalidInput
	}

	supervisorRepo := repository.NewSupervisorRepository(s.repo.DB())

	req, err := supervisorRepo.CompleteSupervisorRequest(ctx, requestID, actorUserID, note)
	return mapSupervisorRepoError(req, err)
}

func mapSupervisorRepoError(
	req *model.SupervisorRequest,
	err error,
) (*model.SupervisorRequest, error) {
	if err == nil {
		return req, nil
	}

	if errors.Is(err, repository.ErrSupervisorRequestNotFound) {
		return nil, ErrAcademicRequestNotFound
	}

	if errors.Is(err, repository.ErrInvalidStatusTransition) {
		return nil, ErrInvalidStatusTransition
	}

	if errors.Is(err, repository.ErrLecturerNotFound) {
		return nil, ErrInvalidInput
	}

	if errors.Is(err, repository.ErrLecturerNotAssigned) {
		return nil, ErrInvalidStatusTransition
	}

	if errors.Is(err, repository.ErrLecturerQuotaExceeded) {
		return nil, ErrQuotaExceeded
	}

	return nil, err
}
