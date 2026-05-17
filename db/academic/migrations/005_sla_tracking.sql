-- +goose Up
-- SLA tracking (FR-254): tambahkan due_at + verified_at + approved_at + completed_at
-- ke service_requests sehingga UI bisa menampilkan progress + warning kalau overdue.

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS due_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Default SLA: 5 hari kerja sejak SUBMITTED untuk pengajuan akademik baru.
-- Kalau due_at sudah diisi, biarkan apa adanya.
UPDATE service_requests
SET due_at = COALESCE(submitted_at, created_at) + INTERVAL '5 days'
WHERE due_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED', 'COMPLETED');

CREATE INDEX IF NOT EXISTS idx_service_requests_due_at
    ON service_requests(due_at)
    WHERE status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED');

-- +goose Down
DROP INDEX IF EXISTS idx_service_requests_due_at;
ALTER TABLE service_requests
    DROP COLUMN IF EXISTS approved_at,
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS due_at;
