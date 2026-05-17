-- +goose Up
-- FR-266: SLA reminder bookkeeping. Worker yang scan request mendekati
-- due_at akan update kolom ini agar tidak spam reminder per jam.

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS last_sla_warning_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_sla_pending
    ON service_requests(due_at)
    WHERE status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED')
      AND due_at IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_service_requests_sla_pending;
ALTER TABLE service_requests DROP COLUMN IF EXISTS last_sla_warning_at;
