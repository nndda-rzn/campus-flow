-- 016_consultation_bookings.sql
-- Student bookings for consultation slots

CREATE TYPE consultation_booking_status AS ENUM (
    'PENDING',
    'APPROVED', 
    'REJECTED',
    'CANCELLED',
    'RESCHEDULED'
);

CREATE TABLE consultation_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES consultation_slots(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL,
    topic TEXT NOT NULL,
    status consultation_booking_status NOT NULL DEFAULT 'PENDING',
    lecturer_notes TEXT,
    proposed_slot_id UUID REFERENCES consultation_slots(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_booking_per_slot_student UNIQUE (slot_id, student_user_id)
);

CREATE INDEX idx_consultation_bookings_slot ON consultation_bookings(slot_id);
CREATE INDEX idx_consultation_bookings_student ON consultation_bookings(student_user_id);
CREATE INDEX idx_consultation_bookings_status ON consultation_bookings(status);

COMMENT ON TABLE consultation_bookings IS 'Booking mahasiswa untuk slot bimbingan dosen';
COMMENT ON COLUMN consultation_bookings.topic IS 'Topik yang ingin dibahas mahasiswa';
COMMENT ON COLUMN consultation_bookings.lecturer_notes IS 'Catatan dosen saat approve/reject/reschedule';
COMMENT ON COLUMN consultation_bookings.proposed_slot_id IS 'Slot alternatif yang diusulkan dosen saat reschedule';
