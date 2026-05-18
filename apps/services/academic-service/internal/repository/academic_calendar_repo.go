package repository

import (
	"context"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/lib/pq"
	"campus-flow/apps/services/academic-service/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AcademicCalendarRepository struct {
	db *pgxpool.Pool
}

func NewAcademicCalendarRepository(db *pgxpool.Pool) *AcademicCalendarRepository {
	return &AcademicCalendarRepository{db: db}
}

func (r *AcademicCalendarRepository) GetEvents(ctx context.Context, startDate, endDate *time.Time, departmentID string) ([]model.AcademicCalendar, error) {
	cond := squirrel.Eq{"is_active": true}
	
	qb := squirrel.Select(
		"id", "academic_year_id", "department_id", "title", "description",
		"event_type", "start_date", "end_date", "is_all_day", "target_roles",
		"is_active", "created_by_user_id", "created_at", "updated_at",
	).
		From("academic_calendar").
		Where(cond)

	if startDate != nil {
		qb = qb.Where(squirrel.GtOrEq{"end_date": *startDate})
	}
	if endDate != nil {
		qb = qb.Where(squirrel.LtOrEq{"start_date": *endDate})
	}
	
	// Filter by department (null means all departments)
	if departmentID != "" {
		qb = qb.Where(squirrel.Or{
			squirrel.Eq{"department_id": departmentID},
			squirrel.Eq{"department_id": nil},
		})
	}

	query, args, err := qb.OrderBy("start_date ASC").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
		
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []model.AcademicCalendar
	for rows.Next() {
		var e model.AcademicCalendar
		var targetRoles pq.StringArray
		
		if err := rows.Scan(
			&e.ID, &e.AcademicYearID, &e.DepartmentID, &e.Title, &e.Description,
			&e.EventType, &e.StartDate, &e.EndDate, &e.IsAllDay, &targetRoles,
			&e.IsActive, &e.CreatedByUserID, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, err
		}
		
		e.TargetRoles = targetRoles
		events = append(events, e)
	}
func (r *AcademicCalendarRepository) CreateEvent(ctx context.Context, e *model.AcademicCalendar) (*model.AcademicCalendar, error) {
	query, args, err := squirrel.Insert("academic_calendar").
		Columns(
			"academic_year_id", "department_id", "title", "description",
			"event_type", "start_date", "end_date", "is_all_day", "target_roles",
			"is_active", "created_by_user_id",
		).
		Values(
			e.AcademicYearID, e.DepartmentID, e.Title, e.Description,
			e.EventType, e.StartDate, e.EndDate, e.IsAllDay, pq.Array(e.TargetRoles),
			e.IsActive, e.CreatedByUserID,
		).
		Suffix("RETURNING id, created_at, updated_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()

	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, query, args...).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *AcademicCalendarRepository) UpdateEvent(ctx context.Context, e *model.AcademicCalendar) error {
	query, args, err := squirrel.Update("academic_calendar").
		Set("title", e.Title).
		Set("description", e.Description).
		Set("event_type", e.EventType).
		Set("start_date", e.StartDate).
		Set("end_date", e.EndDate).
		Set("is_all_day", e.IsAllDay).
		Set("target_roles", pq.Array(e.TargetRoles)).
		Set("is_active", e.IsActive).
		Set("updated_at", time.Now()).
		Where(squirrel.Eq{"id": e.ID}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()

	if err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

func (r *AcademicCalendarRepository) DeleteEvent(ctx context.Context, id string) error {
	query, args, err := squirrel.Delete("academic_calendar").
		Where(squirrel.Eq{"id": id}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()

	if err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

