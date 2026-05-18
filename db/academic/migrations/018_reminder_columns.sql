-- 018_reminder_columns.sql
-- Add tracking columns for automated reminders

-- +goose Up
ALTER TABLE consultation_bookings 
    ADD COLUMN reminder_sent_at TIMESTAMPTZ;

CREATE TABLE thesis_stuck_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL,
    days_stuck INT NOT NULL,
    warning_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_thesis_stuck_warnings_student ON thesis_stuck_warnings(student_user_id);
CREATE INDEX idx_thesis_stuck_warnings_date ON thesis_stuck_warnings(warning_date);

COMMENT ON COLUMN consultation_bookings.reminder_sent_at IS 'Waktu pengiriman reminder H-1 (untuk mencegah spam)';
COMMENT ON TABLE thesis_stuck_warnings IS 'Riwayat peringatan progress macet untuk mencegah spam harian';

-- +goose Down
DROP TABLE IF EXISTS thesis_stuck_warnings CASCADE;
ALTER TABLE consultation_bookings DROP COLUMN IF EXISTS reminder_sent_at;
