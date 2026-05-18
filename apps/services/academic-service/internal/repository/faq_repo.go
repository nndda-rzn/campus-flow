package repository

import (
	"context"

	"github.com/Masterminds/squirrel"
	"campus-flow/apps/services/academic-service/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FAQRepository struct {
	db *pgxpool.Pool
}

func NewFAQRepository(db *pgxpool.Pool) *FAQRepository {
	return &FAQRepository{db: db}
}

func (r *FAQRepository) GetCategories(ctx context.Context) ([]model.FAQCategory, error) {
	query, args, err := squirrel.Select(
		"id", "name", "description", "icon", "sequence_order", "is_active", "created_at",
	).
		From("faq_categories").
		Where(squirrel.Eq{"is_active": true}).
		OrderBy("sequence_order ASC").
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

	var categories []model.FAQCategory
	for rows.Next() {
		var c model.FAQCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.Icon, &c.SequenceOrder, &c.IsActive, &c.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, nil
}

func (r *FAQRepository) GetFAQs(ctx context.Context, categoryID string) ([]model.FAQ, error) {
	qb := squirrel.Select(
		"f.id", "f.category_id", "f.question", "f.answer", "f.sequence_order", 
		"f.is_active", "f.view_count", "f.created_at", "f.updated_at",
		"c.name as category_name",
	).
		From("faqs f").
		Join("faq_categories c ON c.id = f.category_id").
		Where(squirrel.Eq{"f.is_active": true, "c.is_active": true})

	if categoryID != "" {
		qb = qb.Where(squirrel.Eq{"f.category_id": categoryID})
	}

	query, args, err := qb.OrderBy("c.sequence_order ASC, f.sequence_order ASC").
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

	var faqs []model.FAQ
	for rows.Next() {
		var f model.FAQ
		if err := rows.Scan(
			&f.ID, &f.CategoryID, &f.Question, &f.Answer, &f.SequenceOrder,
			&f.IsActive, &f.ViewCount, &f.CreatedAt, &f.UpdatedAt, &f.CategoryName,
		); err != nil {
			return nil, err
		}
		faqs = append(faqs, f)
	}
	return faqs, nil
}

func (r *FAQRepository) CreateFAQ(ctx context.Context, f *model.FAQ) (*model.FAQ, error) {
	query, args, err := squirrel.Insert("faqs").
		Columns("category_id", "question", "answer", "sequence_order").
		Values(f.CategoryID, f.Question, f.Answer, f.SequenceOrder).
		Suffix("RETURNING id, created_at, updated_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()

	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, query, args...).Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return f, nil
}

func (r *FAQRepository) UpdateFAQ(ctx context.Context, f *model.FAQ) error {
	query, args, err := squirrel.Update("faqs").
		Set("category_id", f.CategoryID).
		Set("question", f.Question).
		Set("answer", f.Answer).
		Set("sequence_order", f.SequenceOrder).
		Set("is_active", f.IsActive).
		Set("updated_at", time.Now()).
		Where(squirrel.Eq{"id": f.ID}).
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

func (r *FAQRepository) DeleteFAQ(ctx context.Context, id string) error {
	query, args, err := squirrel.Delete("faqs").
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
