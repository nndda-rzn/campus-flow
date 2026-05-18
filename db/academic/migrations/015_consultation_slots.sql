-- 015_consultation_slots.sql
-- Consultation scheduling: slots created by lecturers for student bookings

-- +goose Up
CREATE TABLE consultation_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_user_id UUID NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_bookings INT NOT NULL DEFAULT 1,
    location TEXT,
    notes TEXT,
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_consultation_time_order CHECK (end_time > start_time),
    CONSTRAINT chk_consultation_max_bookings_positive CHECK (max_bookings > 0)
);

CREATE INDEX idx_consultation_slots_lecturer ON consultation_slots(lecturer_user_id);
CREATE INDEX idx_consultation_slots_date ON consultation_slots(slot_date);
CREATE INDEX idx_consultation_slots_available ON consultation_slots(lecturer_user_id, slot_date, is_cancelled) 
    WHERE is_cancelled = FALSE;

COMMENT ON TABLE consultation_slots IS 'Jadwal bimbingan yang dibuat oleh dosen';
COMMENT ON COLUMN consultation_slots.max_bookings IS 'Kuota mahasiswa per slot (1 = one-on-one, >1 = kelompok)';
COMMENT ON COLUMN consultation_slots.location IS 'Lokasi bimbingan (ruangan, link zoom, dll)';

-- +goose Down
DROP TABLE IF EXISTS consultation_slots CASCADE;
