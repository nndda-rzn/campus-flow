-- +goose Up
-- FR-277: Departmental scoping (multi-prodi via pivot table).
-- Admin Prodi dan Kaprodi dibatasi melihat pengajuan / data master sesuai
-- departments yang menjadi scope mereka. SUPER_ADMIN tidak terikat scope.

CREATE TABLE IF NOT EXISTS user_department_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_user_department_scopes_user
    ON user_department_scopes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_department_scopes_department
    ON user_department_scopes(department_id);

-- +goose Down
DROP INDEX IF EXISTS idx_user_department_scopes_department;
DROP INDEX IF EXISTS idx_user_department_scopes_user;
DROP TABLE IF EXISTS user_department_scopes;
