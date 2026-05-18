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
	return events, nil
}
