-- +goose Up
-- Track lecturer linkage on supervisor snapshots so we can build the
-- lecturer workload report (FR-173).
ALTER TABLE supervisor_request_snapshots
    ADD COLUMN lecturer_id UUID NULL,
    ADD COLUMN lecturer_user_id UUID NULL,
    ADD COLUMN lecturer_name TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_supervisor_request_snapshots_lecturer_id
    ON supervisor_request_snapshots(lecturer_id);

-- +goose Down
DROP INDEX IF EXISTS idx_supervisor_request_snapshots_lecturer_id;
ALTER TABLE supervisor_request_snapshots
    DROP COLUMN IF EXISTS lecturer_name,
    DROP COLUMN IF EXISTS lecturer_user_id,
    DROP COLUMN IF EXISTS lecturer_id;
