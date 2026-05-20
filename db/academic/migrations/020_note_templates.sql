-- +goose Up
CREATE TABLE note_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    category VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL,
    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_note_template_category CHECK (category IN ('REVISION', 'REJECTION', 'VERIFICATION', 'ANNOUNCEMENT'))
);

CREATE INDEX idx_note_templates_dept_cat ON note_templates(department_id, category) WHERE is_active = true;
CREATE INDEX idx_note_templates_usage ON note_templates(category, usage_count DESC) WHERE is_active = true;

-- +goose Down
DROP TABLE IF EXISTS note_templates;
