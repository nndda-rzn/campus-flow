-- +goose Up
ALTER TABLE academic_request_snapshots
    ADD COLUMN due_at TIMESTAMP NULL,
    ADD COLUMN submitted_at TIMESTAMP NULL,
    ADD COLUMN verified_at TIMESTAMP NULL,
    ADD COLUMN approved_at TIMESTAMP NULL,
    ADD COLUMN completed_at TIMESTAMP NULL;

CREATE INDEX idx_academic_request_snapshots_due_at
    ON academic_request_snapshots(due_at)
    WHERE due_at IS NOT NULL AND status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED');

-- +goose Down
DROP INDEX IF EXISTS idx_academic_request_snapshots_due_at;
ALTER TABLE academic_request_snapshots
    DROP COLUMN IF EXISTS completed_at,
    DROP COLUMN IF EXISTS approved_at,
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS submitted_at,
    DROP COLUMN IF EXISTS due_at;
