package repository

import (
	"context"
	"errors"

	"github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"campus-flow/apps/services/academic-service/internal/model"
)

var ErrThesisFinalDocumentNotFound = errors.New("thesis final document not found")

type ThesisFinalDocumentRepository struct {
	db *pgxpool.Pool
}

func NewThesisFinalDocumentRepository(db *pgxpool.Pool) *ThesisFinalDocumentRepository {
	return &ThesisFinalDocumentRepository{db: db}
}

func (r *ThesisFinalDocumentRepository) DB() *pgxpool.Pool {
	return r.db
}

// ListByLecturer returns paginated documents for a specific lecturer with optional status filter
func (r *ThesisFinalDocumentRepository) ListByLecturer(
	ctx context.Context,
	lecturerUserID, statusFilter string,
	page, pageSize int,
) ([]model.ThesisFinalDocument, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	cond := squirrel.And{squirrel.Eq{"tfd.lecturer_user_id": lecturerUserID}}
	if statusFilter != "" {
		cond = append(cond, squirrel.Eq{"tfd.status": statusFilter})
	}

	// Count
	countQuery, countArgs, err := squirrel.Select("COUNT(*)").
		From("thesis_final_documents tfd").
		Where(cond).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, 0, err
	}

	var total int
	if err := r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data
	docs, err := r.fetchDocuments(ctx, cond, "tfd.created_at DESC", pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}

	return docs, total, nil
}

// GetByID returns a single document by ID
func (r *ThesisFinalDocumentRepository) GetByID(ctx context.Context, id string) (*model.ThesisFinalDocument, error) {
	docs, err := r.fetchDocuments(ctx, squirrel.Eq{"tfd.id": id}, "", 0, 0)
	if err != nil {
		return nil, err
	}
	if len(docs) == 0 {
		return nil, ErrThesisFinalDocumentNotFound
	}
	return &docs[0], nil
}

// UpdateStatus updates the status with optional notes/reason
func (r *ThesisFinalDocumentRepository) UpdateStatus(
	ctx context.Context,
	id, newStatus, lecturerNotes, rejectionReason string,
) error {
	qb := squirrel.Update("thesis_final_documents").
		Set("status", newStatus).
		Set("updated_at", squirrel.Expr("NOW()"))

	switch newStatus {
	case model.TFDStatusUnderReview:
		qb = qb.Set("reviewed_at", squirrel.Expr("NOW()"))
	case model.TFDStatusApproved:
		qb = qb.Set("approved_at", squirrel.Expr("NOW()"))
		if lecturerNotes != "" {
			qb = qb.Set("lecturer_notes", lecturerNotes)
		}
	case model.TFDStatusRevisionRequested:
		if lecturerNotes != "" {
			qb = qb.Set("lecturer_notes", lecturerNotes)
		}
	case model.TFDStatusRejected:
		if rejectionReason != "" {
			qb = qb.Set("rejection_reason", rejectionReason)
		}
	}

	query, args, err := qb.Where(squirrel.Eq{"id": id}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return err
	}

	tag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrThesisFinalDocumentNotFound
	}
	return nil
}

func (r *ThesisFinalDocumentRepository) fetchDocuments(
	ctx context.Context,
	cond squirrel.Sqlizer,
	orderBy string,
	limit, offset int,
) ([]model.ThesisFinalDocument, error) {
	qb := squirrel.Select(
		"tfd.id", "tfd.supervisor_request_id", "tfd.student_user_id", "tfd.lecturer_user_id",
		"tfd.document_type", "tfd.title", "tfd.file_id", "tfd.filename", "tfd.version",
		"tfd.status", "tfd.submitted_at", "tfd.reviewed_at", "tfd.approved_at",
		"COALESCE(tfd.lecturer_notes, '')", "COALESCE(tfd.rejection_reason, '')",
		"tfd.created_at", "tfd.updated_at",
		"COALESCE(s.full_name, '') as student_name",
		"COALESCE(s.nim, '') as student_nim",
		"COALESCE(l.full_name, '') as lecturer_name",
		"COALESCE(sr.topic_title, '') as topic_title",
	).
		From("thesis_final_documents tfd").
		LeftJoin("students s ON s.user_id = tfd.student_user_id").
		LeftJoin("lecturers l ON l.user_id = tfd.lecturer_user_id").
		LeftJoin("supervisor_requests sr ON sr.id = tfd.supervisor_request_id").
		Where(cond).
		PlaceholderFormat(squirrel.Dollar)

	if orderBy != "" {
		qb = qb.OrderBy(orderBy)
	}
	if limit > 0 {
		qb = qb.Limit(uint64(limit))
	}
	if offset > 0 {
		qb = qb.Offset(uint64(offset))
	}

	query, args, err := qb.ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []model.ThesisFinalDocument
	for rows.Next() {
		var d model.ThesisFinalDocument
		if err := rows.Scan(
			&d.ID, &d.SupervisorRequestID, &d.StudentUserID, &d.LecturerUserID,
			&d.DocumentType, &d.Title, &d.FileID, &d.Filename, &d.Version,
			&d.Status, &d.SubmittedAt, &d.ReviewedAt, &d.ApprovedAt,
			&d.LecturerNotes, &d.RejectionReason,
			&d.CreatedAt, &d.UpdatedAt,
			&d.StudentName, &d.StudentNIM, &d.LecturerName, &d.TopicTitle,
		); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if errors.Is(rows.Err(), pgx.ErrNoRows) {
		return nil, nil
	}

	return docs, nil
}
