package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/file-service/internal/model"
	"campus-flow/apps/services/file-service/internal/repository"
)

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrFileNotFound = errors.New("file not found")
)

type FileService struct {
	repo *repository.FileRepository
}

func NewFileService(repo *repository.FileRepository) *FileService {
	return &FileService{
		repo: repo,
	}
}

func (s *FileService) RegisterUploadedFile(
	ctx context.Context,
	file model.File,
) (*model.File, error) {
	file.OriginalName = strings.TrimSpace(file.OriginalName)
	file.StoredName = strings.TrimSpace(file.StoredName)
	file.StoragePath = strings.TrimSpace(file.StoragePath)
	file.MimeType = strings.TrimSpace(file.MimeType)
	file.UploadedByUserID = strings.TrimSpace(file.UploadedByUserID)
	file.OwnerType = strings.ToUpper(strings.TrimSpace(file.OwnerType))
	file.OwnerID = strings.TrimSpace(file.OwnerID)
	file.Purpose = strings.ToUpper(strings.TrimSpace(file.Purpose))

	if file.OriginalName == "" ||
		file.StoredName == "" ||
		file.StoragePath == "" ||
		file.MimeType == "" ||
		file.SizeBytes <= 0 ||
		file.UploadedByUserID == "" ||
		file.OwnerType == "" ||
		file.OwnerID == "" ||
		file.Purpose == "" {
		return nil, ErrInvalidInput
	}

	return s.repo.RegisterUploadedFile(ctx, file)
}

func (s *FileService) GetFileMetadata(ctx context.Context, fileID string) (*model.File, error) {
	fileID = strings.TrimSpace(fileID)
	if fileID == "" {
		return nil, ErrInvalidInput
	}

	file, err := s.repo.GetFileByID(ctx, fileID)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			return nil, ErrFileNotFound
		}

		return nil, err
	}

	return file, nil
}

func (s *FileService) ListFilesByOwner(
	ctx context.Context,
	ownerType string,
	ownerID string,
) ([]model.File, error) {
	ownerType = strings.ToUpper(strings.TrimSpace(ownerType))
	ownerID = strings.TrimSpace(ownerID)

	if ownerType == "" || ownerID == "" {
		return nil, ErrInvalidInput
	}

	return s.repo.ListFilesByOwner(ctx, ownerType, ownerID)
}

func (s *FileService) LogFileAccess(
	ctx context.Context,
	fileID string,
	actorUserID string,
	action string,
	ipAddress string,
	userAgent string,
) error {
	fileID = strings.TrimSpace(fileID)
	actorUserID = strings.TrimSpace(actorUserID)
	action = strings.ToUpper(strings.TrimSpace(action))
	ipAddress = strings.TrimSpace(ipAddress)
	userAgent = strings.TrimSpace(userAgent)

	if fileID == "" || actorUserID == "" || action == "" {
		return ErrInvalidInput
	}

	return s.repo.LogFileAccess(ctx, fileID, actorUserID, action, ipAddress, userAgent)
}