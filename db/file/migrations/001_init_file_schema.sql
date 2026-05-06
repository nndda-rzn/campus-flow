-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by_user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT files_status_check CHECK (
        status IN ('ACTIVE', 'DELETED')
    )
);

CREATE TABLE file_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    owner_type TEXT NOT NULL,
    owner_id UUID NOT NULL,
    purpose TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT file_owners_purpose_check CHECK (
        purpose IN (
            'SUPPORTING_DOCUMENT',
            'FINAL_DOCUMENT',
            'PROFILE_DOCUMENT',
            'OTHER'
        )
    )
);

CREATE TABLE file_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    actor_user_id UUID NULL,
    action TEXT NOT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP NULL
);

CREATE INDEX idx_file_owners_owner ON file_owners(owner_type, owner_id);
CREATE INDEX idx_file_owners_file_id ON file_owners(file_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by_user_id);

-- +goose Down
DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS file_access_logs;
DROP TABLE IF EXISTS file_owners;
DROP TABLE IF EXISTS files;