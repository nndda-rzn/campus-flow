-- +goose Up
CREATE TABLE guidance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL,
    supervisor_request_id UUID NOT NULL REFERENCES supervisor_requests(id) ON DELETE CASCADE,
    lecturer_user_id UUID NOT NULL,  -- Dosen pembimbing
    
    -- Session details
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    topic VARCHAR(255) NOT NULL,
    discussion_summary TEXT NOT NULL,
    next_action TEXT,
    
    -- Approval workflow
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    supervisor_feedback TEXT,
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_guidance_log_status 
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUIRED'))
);

CREATE INDEX idx_guidance_logs_student ON guidance_logs(student_user_id);
CREATE INDEX idx_guidance_logs_lecturer ON guidance_logs(lecturer_user_id);
CREATE INDEX idx_guidance_logs_request ON guidance_logs(supervisor_request_id);
CREATE INDEX idx_guidance_logs_status ON guidance_logs(status);

-- +goose Down
DROP TABLE IF EXISTS guidance_logs CASCADE;
