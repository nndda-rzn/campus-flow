-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE academic_request_snapshots (
    request_id UUID PRIMARY KEY,
    request_number TEXT NOT NULL,
    student_user_id UUID NOT NULL,
    service_code TEXT NULL,
    service_name TEXT NULL,
    title TEXT NULL,
    status TEXT NOT NULL,
    source_event_id UUID NOT NULL,
    source_event_type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    projected_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE inbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_academic_request_snapshots_status 
ON academic_request_snapshots(status);

CREATE INDEX idx_academic_request_snapshots_student_user_id 
ON academic_request_snapshots(student_user_id);

CREATE INDEX idx_academic_request_snapshots_projected_at 
ON academic_request_snapshots(projected_at DESC);

-- +goose Down
DROP TABLE IF EXISTS inbox_events;
DROP TABLE IF EXISTS academic_request_snapshots;