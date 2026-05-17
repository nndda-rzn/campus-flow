-- +goose Up
-- FR-278: Academic year context.
-- Semua pengajuan akademik dan supervisor request dikaitkan ke tahun akademik
-- yang sedang aktif saat dibuat. Migration ini juga melakukan backfill ke
-- tahun aktif yang ditambahkan oleh migrasi ini sehingga reporting per year
-- tetap meaningful untuk data historis.

CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hanya satu academic year yang boleh aktif pada satu waktu.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_academic_year
    ON academic_years (is_active)
    WHERE is_active = TRUE;

-- Seed: tahun aktif default (Genap 2025/2026 — sesuai timeline pengembangan).
INSERT INTO academic_years (code, name, start_date, end_date, is_active)
VALUES
    ('2025-2026-GENAP', 'Genap 2025/2026', '2026-02-01', '2026-07-31', TRUE),
    ('2025-2026-GANJIL', 'Ganjil 2025/2026', '2025-08-01', '2026-01-31', FALSE)
ON CONFLICT (code) DO NOTHING;

-- Tambah kolom academic_year_id di service_requests + supervisor_requests.
ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS academic_year_id UUID NULL REFERENCES academic_years(id);

ALTER TABLE supervisor_requests
    ADD COLUMN IF NOT EXISTS academic_year_id UUID NULL REFERENCES academic_years(id);

-- Backfill: kaitkan semua data lama ke academic year aktif.
UPDATE service_requests
SET academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
WHERE academic_year_id IS NULL;

UPDATE supervisor_requests
SET academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
WHERE academic_year_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_academic_year
    ON service_requests(academic_year_id);

CREATE INDEX IF NOT EXISTS idx_supervisor_requests_academic_year
    ON supervisor_requests(academic_year_id);

-- +goose Down
DROP INDEX IF EXISTS idx_supervisor_requests_academic_year;
DROP INDEX IF EXISTS idx_service_requests_academic_year;
ALTER TABLE supervisor_requests DROP COLUMN IF EXISTS academic_year_id;
ALTER TABLE service_requests DROP COLUMN IF EXISTS academic_year_id;
DROP INDEX IF EXISTS one_active_academic_year;
DROP TABLE IF EXISTS academic_years;
