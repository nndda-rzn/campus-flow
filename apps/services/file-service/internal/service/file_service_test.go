package service

import (
	"context"
	"errors"
	"testing"

	"campus-flow/apps/services/file-service/internal/model"
)

// stubRepo is a minimal stub for FileRepository to verify the validation
// gating in RegisterUploadedFile without needing a real DB.
type stubRepo struct {
	called bool
}

// We cheat by exposing the pointer via repository package indirection: the
// service references a concrete *repository.FileRepository, so we cannot pass
// a stub directly. Instead, we test validation by checking the error returned
// before the repo call would happen — config rejection short-circuits.
//
// To keep the test self-contained, we construct a service whose repo is nil
// and exercise paths that fail BEFORE the repo is invoked.
func newServiceWithValidation(max int64, mimes ...string) *FileService {
	allowed := map[string]bool{}
	for _, m := range mimes {
		allowed[m] = true
	}
	return NewFileService(nil, ValidationConfig{
		MaxSizeBytes:    max,
		AllowedMimeType: allowed,
	})
}

func validFile() model.File {
	return model.File{
		OriginalName:     "doc.pdf",
		StoredName:       "stored-doc.pdf",
		StoragePath:      "/tmp/stored-doc.pdf",
		MimeType:         "application/pdf",
		SizeBytes:        1024,
		UploadedByUserID: "00000000-0000-0000-0000-000000000001",
		OwnerType:        "ACADEMIC_REQUEST",
		OwnerID:          "00000000-0000-0000-0000-000000000002",
		Purpose:          "SUPPORTING_DOCUMENT",
	}
}

func TestRegisterUploadedFile_RejectsBadMime(t *testing.T) {
	svc := newServiceWithValidation(10*1024*1024, "application/pdf")

	bad := validFile()
	bad.MimeType = "application/x-evil"

	_, err := svc.RegisterUploadedFile(context.Background(), bad)
	if !errors.Is(err, ErrMimeRejected) {
		t.Fatalf("expected ErrMimeRejected, got %v", err)
	}
}

func TestRegisterUploadedFile_RejectsOversize(t *testing.T) {
	svc := newServiceWithValidation(1024, "application/pdf")

	big := validFile()
	big.SizeBytes = 2048

	_, err := svc.RegisterUploadedFile(context.Background(), big)
	if !errors.Is(err, ErrSizeRejected) {
		t.Fatalf("expected ErrSizeRejected, got %v", err)
	}
}

func TestRegisterUploadedFile_RejectsEmptyMime(t *testing.T) {
	svc := newServiceWithValidation(1024, "application/pdf")

	bad := validFile()
	bad.MimeType = ""

	_, err := svc.RegisterUploadedFile(context.Background(), bad)
	if !errors.Is(err, ErrEmptyMime) {
		t.Fatalf("expected ErrEmptyMime, got %v", err)
	}
}

func TestRegisterUploadedFile_RejectsZeroSize(t *testing.T) {
	svc := newServiceWithValidation(1024, "application/pdf")

	bad := validFile()
	bad.SizeBytes = 0

	_, err := svc.RegisterUploadedFile(context.Background(), bad)
	if !errors.Is(err, ErrEmptyFileSize) {
		t.Fatalf("expected ErrEmptyFileSize, got %v", err)
	}
}

func TestRegisterUploadedFile_RejectsMissingFields(t *testing.T) {
	svc := newServiceWithValidation(1024, "application/pdf")

	bad := validFile()
	bad.OwnerID = ""

	_, err := svc.RegisterUploadedFile(context.Background(), bad)
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestMaxSizeBytes_AndAllowedMimeTypes(t *testing.T) {
	svc := newServiceWithValidation(2048, "application/pdf", "image/png")
	if got := svc.MaxSizeBytes(); got != 2048 {
		t.Errorf("MaxSizeBytes = %d, want 2048", got)
	}
	mimes := svc.AllowedMimeTypes()
	if len(mimes) != 2 {
		t.Errorf("expected 2 mime types, got %d (%v)", len(mimes), mimes)
	}
}

// stubRepo embedding is unused but kept as a hint that adding repo-level
// integration tests in the future would follow the same pattern as
// academic-service preservation tests.
var _ = stubRepo{}
