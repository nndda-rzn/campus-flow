-- +goose Up
-- Allow PENDING_BIND status for students/lecturers (used by auto-stub binding
-- when a user with role MAHASISWA/DOSEN registers).
ALTER TABLE students
    ADD CONSTRAINT students_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_BIND'));

ALTER TABLE lecturers
    ADD CONSTRAINT lecturers_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_BIND'));

CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_lecturers_status ON lecturers(status);

-- +goose Down
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE lecturers DROP CONSTRAINT IF EXISTS lecturers_status_check;
DROP INDEX IF EXISTS idx_students_status;
DROP INDEX IF EXISTS idx_lecturers_status;
