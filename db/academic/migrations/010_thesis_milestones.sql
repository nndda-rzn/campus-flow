-- +goose Up
CREATE TABLE thesis_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sequence_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(department_id, code)
);

CREATE INDEX idx_thesis_milestones_dept ON thesis_milestones(department_id);

-- Seed default milestones untuk setiap department
INSERT INTO thesis_milestones (department_id, code, name, description, sequence_order)
SELECT d.id, m.code, m.name, m.description, m.seq
FROM departments d
CROSS JOIN (VALUES
    ('TOPIC_APPROVED', 'Judul Disetujui', 'Judul skripsi telah disetujui pembimbing', 1),
    ('PROPOSAL_SEMINAR', 'Seminar Proposal', 'Seminar proposal skripsi', 2),
    ('RESEARCH', 'Penelitian', 'Proses penelitian dan pengerjaan', 3),
    ('RESULT_SEMINAR', 'Seminar Hasil', 'Seminar hasil penelitian', 4),
    ('FINAL_EXAM', 'Sidang Akhir', 'Sidang skripsi', 5)
) AS m(code, name, description, seq);

-- +goose Down
DROP TABLE IF EXISTS thesis_milestones CASCADE;
