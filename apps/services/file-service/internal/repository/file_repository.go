package repository

import (
	"context"
	"errors"

	"campus-flow/apps/services/file-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrFileNotFound = errors.New("file not found")
)

type FileRepository struct {
	db *pgxpool.Pool
}

func NewFileRepository(db *pgxpool.Pool) *FileRepository {
	return &FileRepository{
		db: db,
	}
}

func (r *FileRepository) RegisterUploadedFile(
	ctx context.Context,
	file model.File,
) (*model.File, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var created model.File

	err = tx.QueryRow(ctx, `
		INSERT INTO files (
			original_name,
			stored_name,
			storage_path,
			mime_type,
			size_bytes,
			uploaded_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6::uuid)
		RETURNING
			id::text,
			original_name,
			stored_name,
			storage_path,
			mime_type,
			size_bytes,
			uploaded_by_user_id::text,
			status,
			created_at
	`, file.OriginalName, file.StoredName, file.StoragePath, file.MimeType, file.SizeBytes, file.UploadedByUserID).Scan(
		&created.ID,
		&created.OriginalName,
		&created.StoredName,
		&created.StoragePath,
		&created.MimeType,
		&created.SizeBytes,
		&created.UploadedByUserID,
		&created.Status,
		&created.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO file_owners (
			file_id,
			owner_type,
			owner_id,
			purpose
		)
		VALUES ($1::uuid, $2, $3::uuid, $4)
	`, created.ID, file.OwnerType, file.OwnerID, file.Purpose)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO file_access_logs (
			file_id,
			actor_user_id,
			action
		)
		VALUES ($1::uuid, $2::uuid, 'UPLOAD')
	`, created.ID, file.UploadedByUserID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO outbox_events (
			aggregate_id,
			aggregate_type,
			event_type,
			payload
		)
		VALUES (
			$1::uuid,
			'files',
			'file.uploaded',
			jsonb_build_object(
				'file_id', $1::text,
				'original_name', $5::text,
				'mime_type', $6::text,
				'size_bytes', $7::bigint,
				'uploaded_by_user_id', $8::text,
				'owner_type', $2::text,
				'owner_id', $3::text,
				'purpose', $4::text
			)
		)
	`, created.ID, file.OwnerType, file.OwnerID, file.Purpose,
		file.OriginalName, file.MimeType, file.SizeBytes, file.UploadedByUserID)
	if err != nil {
		return nil, err
	}

	// file.attached signals the file is now linked to a domain entity (an
	// academic_request, supervisor_request, etc.) so downstream services like
	// reporting can react to attachment specifically.
	_, err = tx.Exec(ctx, `
		INSERT INTO outbox_events (
			aggregate_id,
			aggregate_type,
			event_type,
			payload
		)
		VALUES (
			$1::uuid,
			'files',
			'file.attached',
			jsonb_build_object(
				'file_id', $1::text,
				'owner_type', $2::text,
				'owner_id', $3::text,
				'purpose', $4::text,
				'uploaded_by_user_id', $5::text
			)
		)
	`, created.ID, file.OwnerType, file.OwnerID, file.Purpose, file.UploadedByUserID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	created.OwnerType = file.OwnerType
	created.OwnerID = file.OwnerID
	created.Purpose = file.Purpose

	return &created, nil
}

func (r *FileRepository) GetFileByID(ctx context.Context, fileID string) (*model.File, error) {
	var file model.File

	err := r.db.QueryRow(ctx, `
		SELECT
			f.id::text,
			f.original_name,
			f.stored_name,
			f.storage_path,
			f.mime_type,
			f.size_bytes,
			f.uploaded_by_user_id::text,
			fo.owner_type,
			fo.owner_id::text,
			fo.purpose,
			f.status,
			f.created_at
		FROM files f
		JOIN file_owners fo ON fo.file_id = f.id
		WHERE f.id = $1::uuid
		  AND f.status = 'ACTIVE'
		LIMIT 1
	`, fileID).Scan(
		&file.ID,
		&file.OriginalName,
		&file.StoredName,
		&file.StoragePath,
		&file.MimeType,
		&file.SizeBytes,
		&file.UploadedByUserID,
		&file.OwnerType,
		&file.OwnerID,
		&file.Purpose,
		&file.Status,
		&file.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrFileNotFound
	}

	if err != nil {
		return nil, err
	}

	return &file, nil
}

func (r *FileRepository) ListFilesByOwner(
	ctx context.Context,
	ownerType string,
	ownerID string,
) ([]model.File, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			f.id::text,
			f.original_name,
			f.stored_name,
			f.storage_path,
			f.mime_type,
			f.size_bytes,
			f.uploaded_by_user_id::text,
			fo.owner_type,
			fo.owner_id::text,
			fo.purpose,
			f.status,
			f.created_at
		FROM files f
		JOIN file_owners fo ON fo.file_id = f.id
		WHERE fo.owner_type = $1
		  AND fo.owner_id = $2::uuid
		  AND f.status = 'ACTIVE'
		ORDER BY f.created_at DESC
	`, ownerType, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []model.File

	for rows.Next() {
		var file model.File

		if err := rows.Scan(
			&file.ID,
			&file.OriginalName,
			&file.StoredName,
			&file.StoragePath,
			&file.MimeType,
			&file.SizeBytes,
			&file.UploadedByUserID,
			&file.OwnerType,
			&file.OwnerID,
			&file.Purpose,
			&file.Status,
			&file.CreatedAt,
		); err != nil {
			return nil, err
		}

		files = append(files, file)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return files, nil
}

func (r *FileRepository) LogFileAccess(
	ctx context.Context,
	fileID string,
	actorUserID string,
	action string,
	ipAddress string,
	userAgent string,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO file_access_logs (
			file_id,
			actor_user_id,
			action,
			ip_address,
			user_agent
		)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5)
	`, fileID, actorUserID, action, ipAddress, userAgent)

	return err
}
