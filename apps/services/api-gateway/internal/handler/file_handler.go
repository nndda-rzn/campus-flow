package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/middleware"
	academicv1 "campus-flow/proto/gen/academic/v1"
	filev1 "campus-flow/proto/gen/file/v1"
)

const maxUploadSize = 10 << 20 // 10 MB

type FileHandler struct {
	fileClient     *client.FileClient
	academicClient *client.AcademicClient
}

func NewFileHandler(
	fileClient *client.FileClient,
	academicClient *client.AcademicClient,
) *FileHandler {
	return &FileHandler{
		fileClient:     fileClient,
		academicClient: academicClient,
	}
}

func (h *FileHandler) UploadAcademicSupportingDocument(w http.ResponseWriter, r *http.Request) {
	h.uploadAcademicFile(w, r, "SUPPORTING_DOCUMENT")
}

func (h *FileHandler) UploadAcademicFinalDocument(w http.ResponseWriter, r *http.Request) {
	h.uploadAcademicFile(w, r, "FINAL_DOCUMENT")
}

func (h *FileHandler) ListAcademicRequestFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	role, ok := middleware.GetRole(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user role",
		})
		return
	}

	requestID := strings.TrimSpace(r.URL.Query().Get("request_id"))
	if requestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "request_id is required",
		})
		return
	}

	allowed, err := h.canAccessAcademicRequestFiles(r.Context(), userID, role, requestID)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to validate file access",
		})
		return
	}

	if !allowed {
		writeJSON(w, http.StatusForbidden, APIResponse{
			Success: false,
			Message: "forbidden file access",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.fileClient.Client.ListFilesByOwner(ctx, &filev1.ListFilesByOwnerRequest{
		OwnerType: "ACADEMIC_REQUEST",
		OwnerId:   requestID,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to list files",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "list files success",
		Data:    res,
	})
}

func (h *FileHandler) DownloadFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	role, ok := middleware.GetRole(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user role",
		})
		return
	}

	fileID := strings.TrimSpace(r.URL.Query().Get("file_id"))
	if fileID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "file_id is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	fileRes, err := h.fileClient.Client.GetFileMetadata(ctx, &filev1.GetFileMetadataRequest{
		FileId: fileID,
	})
	if err != nil || fileRes.File == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{
			Success: false,
			Message: "file not found",
		})
		return
	}

	file := fileRes.File

	allowed, err := h.canAccessFile(r.Context(), userID, role, file)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to validate file access",
		})
		return
	}

	if !allowed {
		writeJSON(w, http.StatusForbidden, APIResponse{
			Success: false,
			Message: "forbidden file access",
		})
		return
	}

	cleanStoragePath := filepath.Clean(file.StoragePath)

	if !strings.HasPrefix(filepath.ToSlash(cleanStoragePath), "storage/uploads/") {
		writeJSON(w, http.StatusForbidden, APIResponse{
			Success: false,
			Message: "invalid file path",
		})
		return
	}

	if _, err := os.Stat(cleanStoragePath); err != nil {
		writeJSON(w, http.StatusNotFound, APIResponse{
			Success: false,
			Message: "physical file not found",
		})
		return
	}

	_, _ = h.fileClient.Client.LogFileAccess(ctx, &filev1.LogFileAccessRequest{
		FileId:      file.Id,
		ActorUserId: userID,
		Action:      "DOWNLOAD",
		IpAddress:   readClientIP(r),
		UserAgent:   r.UserAgent(),
	})

	w.Header().Set("Content-Type", file.MimeType)
	w.Header().Set("Content-Disposition", `attachment; filename="`+sanitizeDownloadFileName(file.OriginalName)+`"`)
	http.ServeFile(w, r, cleanStoragePath)
}

// PreviewFile streams the file content inline (FR-269). Browsers will render
// PDFs and images directly instead of triggering a download dialog.
func (h *FileHandler) PreviewFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	role, ok := middleware.GetRole(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user role",
		})
		return
	}

	fileID := strings.TrimSpace(r.URL.Query().Get("file_id"))
	if fileID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "file_id is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	fileRes, err := h.fileClient.Client.GetFileMetadata(ctx, &filev1.GetFileMetadataRequest{
		FileId: fileID,
	})
	if err != nil || fileRes.File == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{
			Success: false,
			Message: "file not found",
		})
		return
	}

	file := fileRes.File

	allowed, err := h.canAccessFile(r.Context(), userID, role, file)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to validate file access",
		})
		return
	}

	if !allowed {
		writeJSON(w, http.StatusForbidden, APIResponse{
			Success: false,
			Message: "forbidden file access",
		})
		return
	}

	cleanStoragePath := filepath.Clean(file.StoragePath)

	if !strings.HasPrefix(filepath.ToSlash(cleanStoragePath), "storage/uploads/") {
		writeJSON(w, http.StatusForbidden, APIResponse{
			Success: false,
			Message: "invalid file path",
		})
		return
	}

	if _, err := os.Stat(cleanStoragePath); err != nil {
		writeJSON(w, http.StatusNotFound, APIResponse{
			Success: false,
			Message: "physical file not found",
		})
		return
	}

	_, _ = h.fileClient.Client.LogFileAccess(ctx, &filev1.LogFileAccessRequest{
		FileId:      file.Id,
		ActorUserId: userID,
		Action:      "PREVIEW",
		IpAddress:   readClientIP(r),
		UserAgent:   r.UserAgent(),
	})

	w.Header().Set("Content-Type", file.MimeType)
	w.Header().Set("Content-Disposition", `inline; filename="`+sanitizeDownloadFileName(file.OriginalName)+`"`)
	http.ServeFile(w, r, cleanStoragePath)
}

func (h *FileHandler) uploadAcademicFile(w http.ResponseWriter, r *http.Request, purpose string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid multipart form or file too large",
		})
		return
	}

	requestID := strings.TrimSpace(r.FormValue("request_id"))
	if requestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "request_id is required",
		})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "file is required",
		})
		return
	}
	defer file.Close()

	if header.Size <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "empty file is not allowed",
		})
		return
	}

	originalName := filepath.Base(header.Filename)
	ext := strings.ToLower(filepath.Ext(originalName))

	if !isAllowedUploadExtension(ext) {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "file extension not allowed",
		})
		return
	}

	randomName, err := randomHex(16)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "failed to generate file name",
		})
		return
	}

	storedName := randomName + ext

	uploadDir := filepath.Join("storage", "uploads", "academic-requests", requestID, strings.ToLower(purpose))
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "failed to create upload directory",
		})
		return
	}

	storagePath := filepath.Join(uploadDir, storedName)

	dst, err := os.Create(storagePath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "failed to create uploaded file",
		})
		return
	}
	defer dst.Close()

	written, err := io.Copy(dst, file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "failed to save uploaded file",
		})
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.fileClient.Client.RegisterUploadedFile(ctx, &filev1.RegisterUploadedFileRequest{
		OriginalName:     originalName,
		StoredName:       storedName,
		StoragePath:      filepath.ToSlash(storagePath),
		MimeType:         mimeType,
		SizeBytes:        written,
		UploadedByUserId: userID,
		OwnerType:        "ACADEMIC_REQUEST",
		OwnerId:          requestID,
		Purpose:          purpose,
	})
	if err != nil {
		_ = os.Remove(storagePath)

		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to register file metadata",
		})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "upload file success",
		Data:    res,
	})
}

func (h *FileHandler) canAccessFile(
	ctx context.Context,
	userID string,
	role string,
	file *filev1.FileItem,
) (bool, error) {
	role = strings.ToUpper(strings.TrimSpace(role))

	if file.OwnerType == "ACADEMIC_REQUEST" {
		return h.canAccessAcademicRequestFiles(ctx, userID, role, file.OwnerId)
	}

	if role == "SUPER_ADMIN" {
		return true, nil
	}

	return false, nil
}

func (h *FileHandler) canAccessAcademicRequestFiles(
	ctx context.Context,
	userID string,
	role string,
	requestID string,
) (bool, error) {
	role = strings.ToUpper(strings.TrimSpace(role))

	switch role {
	case "SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI", "TATA_USAHA":
		return true, nil
	case "MAHASISWA":
		checkCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		res, err := h.academicClient.Client.GetAcademicRequest(checkCtx, &academicv1.GetAcademicRequestRequest{
			RequestId: requestID,
		})
		if err != nil {
			return false, err
		}

		if res.Request == nil {
			return false, nil
		}

		return res.Request.StudentUserId == userID, nil
	default:
		return false, nil
	}
}

func isAllowedUploadExtension(ext string) bool {
	allowed := map[string]bool{
		".pdf":  true,
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".doc":  true,
		".docx": true,
	}

	return allowed[ext]
}

func randomHex(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	return hex.EncodeToString(bytes), nil
}

func sanitizeDownloadFileName(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, `"`, "")
	name = strings.ReplaceAll(name, "\r", "")
	name = strings.ReplaceAll(name, "\n", "")

	if name == "" {
		return "download"
	}

	return name
}

func readClientIP(r *http.Request) string {
	forwardedFor := r.Header.Get("X-Forwarded-For")
	if forwardedFor != "" {
		parts := strings.Split(forwardedFor, ",")
		return strings.TrimSpace(parts[0])
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return strings.TrimSpace(realIP)
	}

	return r.RemoteAddr
}