-- +goose Up
CREATE TABLE supervisor_request_snapshots (
    request_id UUID PRIMARY KEY,
    request_number TEXT NOT NULL,
    student_user_id UUID NOT NULL,
    topic_title TEXT NULL,
    status TEXT NOT NULL,
    source_event_id UUID NOT NULL,
    source_event_type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    projected_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supervisor_request_snapshots_status
ON supervisor_request_snapshots(status);

CREATE INDEX idx_supervisor_request_snapshots_student_user_id
ON supervisor_request_snapshots(student_user_id);

CREATE INDEX idx_supervisor_request_snapshots_projected_at
ON supervisor_request_snapshots(projected_at DESC);

-- +goose Down
DROP TABLE IF EXISTS supervisor_request_snapshots;