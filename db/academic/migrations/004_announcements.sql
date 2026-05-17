-- +goose Up
-- Announcement / pengumuman resmi (FR-252).
-- Author bisa Super Admin, Admin Prodi, atau Kaprodi.
-- target_roles JSONB array berisi role yang berhak melihat. Empty array = semua role.

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO',
    author_user_id UUID NOT NULL,
    author_name TEXT NOT NULL,
    target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT announcements_severity_check CHECK (
        severity IN ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS')
    )
);

CREATE INDEX IF NOT EXISTS idx_announcements_active_starts
    ON announcements(is_active, starts_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_announcements_active_starts;
DROP TABLE IF EXISTS announcements;
