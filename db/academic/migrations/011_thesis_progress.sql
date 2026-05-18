-- +goose Up
CREATE TABLE thesis_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL,
    supervisor_request_id UUID NOT NULL REFERENCES supervisor_requests(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES thesis_milestones(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
    target_date DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_thesis_progress_status 
        CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
    UNIQUE(student_user_id, milestone_id)
);

CREATE INDEX idx_thesis_progress_student ON thesis_progress(student_user_id);
CREATE INDEX idx_thesis_progress_request ON thesis_progress(supervisor_request_id);

-- +goose Down
DROP TABLE IF EXISTS thesis_progress CASCADE;
