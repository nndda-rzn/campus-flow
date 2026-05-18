-- 017_enhance_guidance_logs.sql
-- Add lecturer notes, milestone tagging, and file attachments to guidance logs

-- +goose Up
ALTER TABLE guidance_logs 
    ADD COLUMN lecturer_notes TEXT,
    ADD COLUMN milestone_id UUID REFERENCES thesis_milestones(id),
    ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_guidance_logs_milestone ON guidance_logs(milestone_id);

COMMENT ON COLUMN guidance_logs.lecturer_notes IS 'Catatan tambahan dari dosen pembimbing';
COMMENT ON COLUMN guidance_logs.milestone_id IS 'Tag milestone yang relevan dengan sesi bimbingan';
COMMENT ON COLUMN guidance_logs.attachments IS 'Array of {file_id, uploaded_by, filename, uploaded_at}';

-- +goose Down
DROP INDEX IF EXISTS idx_guidance_logs_milestone;
ALTER TABLE guidance_logs
    DROP COLUMN IF EXISTS lecturer_notes,
    DROP COLUMN IF EXISTS milestone_id,
    DROP COLUMN IF EXISTS attachments;
