package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/repository"
)

// BulkImportRow describes the outcome of a single row in a bulk import call.
type BulkImportRow struct {
	RowNumber  int32
	Identifier string
	Outcome    string // CREATED | UPDATED | SKIPPED | ERROR
	Error      string
}

// BulkImportResult is the aggregate result of a bulk import call.
type BulkImportResult struct {
	Results []BulkImportRow
	Created int32
	Updated int32
	Skipped int32
	Errors  int32
}

// StudentImportRow is the per-row payload for BulkImportStudents.
type StudentImportRow struct {
	UserID         string
	Email          string
	NIM            string
	FullName       string
	DepartmentCode string
}

// LecturerImportRow is the per-row payload for BulkImportLecturers.
type LecturerImportRow struct {
	UserID             string
	Email              string
	NIDN               string
	FullName           string
	DepartmentCode     string
	MaxSupervisorQuota int32
}

// BulkImportStudents iterates rows and upserts each. When dryRun is true,
// nothing is persisted — the result lists what *would* happen so the caller
// can render a preview UI.
//
// Each row needs at minimum user_id and full_name. Department code is
// resolved to a department_id once per unique code to avoid n+1 lookups.
func (s *AcademicService) BulkImportStudents(
	ctx context.Context,
	rows []StudentImportRow,
	dryRun bool,
) (*BulkImportResult, error) {
	if len(rows) == 0 {
		return &BulkImportResult{}, nil
	}
	if len(rows) > 1000 {
		return nil, errors.New("max 1000 rows per import batch")
	}

	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	deptCache, err := buildDepartmentCache(ctx, s)
	if err != nil {
		return nil, err
	}

	out := &BulkImportResult{
		Results: make([]BulkImportRow, 0, len(rows)),
	}

	for i, r := range rows {
		rowNum := int32(i + 2) // +2: header + 1-indexed
		ident := strings.TrimSpace(r.Email)
		if ident == "" {
			ident = strings.TrimSpace(r.NIM)
		}

		userID := strings.TrimSpace(r.UserID)
		fullName := strings.TrimSpace(r.FullName)

		if userID == "" {
			out.Results = append(out.Results, BulkImportRow{
				RowNumber:  rowNum,
				Identifier: ident,
				Outcome:    "ERROR",
				Error:      "user_id wajib diisi (cari user_id via /admin/users)",
			})
			out.Errors++
			continue
		}
		if fullName == "" {
			out.Results = append(out.Results, BulkImportRow{
				RowNumber:  rowNum,
				Identifier: ident,
				Outcome:    "ERROR",
				Error:      "full_name wajib diisi",
			})
			out.Errors++
			continue
		}

		deptCode := strings.ToUpper(strings.TrimSpace(r.DepartmentCode))
		var deptID string
		if deptCode != "" {
			id, ok := deptCache[deptCode]
			if !ok {
				out.Results = append(out.Results, BulkImportRow{
					RowNumber:  rowNum,
					Identifier: ident,
					Outcome:    "ERROR",
					Error:      "department_code tidak dikenal: " + deptCode,
				})
				out.Errors++
				continue
			}
			deptID = id
		}

		// Detect existing record so we can label outcome correctly.
		existing, _ := dirRepo.GetStudentByUserID(ctx, userID)
		willUpdate := existing != nil

		if dryRun {
			out.Results = append(out.Results, BulkImportRow{
				RowNumber:  rowNum,
				Identifier: ident,
				Outcome:    pickCreateUpdate(willUpdate),
			})
			if willUpdate {
				out.Updated++
			} else {
				out.Created++
			}
			continue
		}

		if _, err := s.UpsertStudent(ctx, userID, r.NIM, fullName, r.Email, deptID); err != nil {
			out.Results = append(out.Results, BulkImportRow{
				RowNumber:  rowNum,
				Identifier: ident,
				Outcome:    "ERROR",
				Error:      err.Error(),
			})
			out.Errors++
			continue
		}

		out.Results = append(out.Results, BulkImportRow{
			RowNumber:  rowNum,
			Identifier: ident,
			Outcome:    pickCreateUpdate(willUpdate),
		})
		if willUpdate {
			out.Updated++
		} else {
			out.Created++
		}
	}

	return out, nil
}

// BulkImportLecturers mirrors BulkImportStudents.
func (s *AcademicService) BulkImportLecturers(
	ctx context.Context,
	rows []LecturerImportRow,
	dryRun bool,
) (*BulkImportResult, error) {
	if len(rows) == 0 {
		return &BulkImportResult{}, nil
	}
	if len(rows) > 1000 {
		return nil, errors.New("max 1000 rows per import batch")
	}

	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	deptCache, err := buildDepartmentCache(ctx, s)
	if err != nil {
		return nil, err
	}

	out := &BulkImportResult{
		Results: make([]BulkImportRow, 0, len(rows)),
	}

	for i, r := range rows {
		rowNum := int32(i + 2)
		ident := strings.TrimSpace(r.Email)
		if ident == "" {
			ident = strings.TrimSpace(r.NIDN)
		}

		userID := strings.TrimSpace(r.UserID)
		fullName := strings.TrimSpace(r.FullName)

		if userID == "" || fullName == "" {
			out.Results = append(out.Results, BulkImportRow{
				RowNumber:  rowNum,
				Identifier: ident,
				Outcome:    "ERROR",
				Error:      "user_id dan full_name wajib diisi",
			})
			out.Errors++
			continue
		}

		deptCode := strings.ToUpper(strings.TrimSpace(r.DepartmentCode))
		var deptID string
		if deptCode != "" {
			id, ok := deptCache[deptCode]
			if !ok {
				out.Results = append(out.Results, BulkImportRow{
					RowNumber:  rowNum,
					Identifier: ident,
					Outcome:    "ERROR",
					Error:      "department_code tidak dikenal: " + deptCode,
				})
				out.Errors++
				continue
			}
			deptID = id
		}

		existing, _ := dirRepo.GetLecturerByUserID(ctx, userID)
		willUpdate := existing != nil

		if dryRun {
			out.Results = append(out.Results, BulkImportRow{
				RowNumber:  rowNum,
				Identifier: ident,
				Outcome:    pickCreateUpdate(willUpdate),
			})
			if willUpdate {
				out.Updated++
			} else {
				out.Created++
			}
			continue
		}

		quota := r.MaxSupervisorQuota
		if quota <= 0 {
			quota = 10
		}
		if _, err := s.UpsertLecturer(ctx, userID, r.NIDN, fullName, r.Email, deptID, quota); err != nil {
			out.Results = append(out.Results, BulkImportRow{
				RowNumber:  rowNum,
				Identifier: ident,
				Outcome:    "ERROR",
				Error:      err.Error(),
			})
			out.Errors++
			continue
		}

		out.Results = append(out.Results, BulkImportRow{
			RowNumber:  rowNum,
			Identifier: ident,
			Outcome:    pickCreateUpdate(willUpdate),
		})
		if willUpdate {
			out.Updated++
		} else {
			out.Created++
		}
	}

	return out, nil
}

// buildDepartmentCache fetches all departments once so the import loop can do
// O(1) lookups by code instead of hitting the DB per row.
func buildDepartmentCache(ctx context.Context, s *AcademicService) (map[string]string, error) {
	depts, err := s.ListDepartments(ctx)
	if err != nil {
		return nil, err
	}
	cache := make(map[string]string, len(depts))
	for _, d := range depts {
		cache[strings.ToUpper(strings.TrimSpace(d.Code))] = d.ID
	}
	return cache, nil
}

func pickCreateUpdate(isUpdate bool) string {
	if isUpdate {
		return "UPDATED"
	}
	return "CREATED"
}
