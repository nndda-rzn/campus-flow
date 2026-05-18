-- +goose Up
CREATE TABLE academic_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,  -- NULL = semua prodi
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_all_day BOOLEAN NOT NULL DEFAULT TRUE,
    
    target_roles TEXT[],  -- NULL = semua role
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_calendar_event_type 
        CHECK (event_type IN ('UTS', 'UAS', 'REGISTRATION', 'HOLIDAY', 'DEADLINE', 'SEMINAR', 'OTHER'))
);

CREATE INDEX idx_calendar_dates ON academic_calendar(start_date, end_date);
CREATE INDEX idx_calendar_year ON academic_calendar(academic_year_id);
CREATE INDEX idx_calendar_dept ON academic_calendar(department_id);

-- +goose Down
DROP TABLE IF EXISTS academic_calendar CASCADE;
