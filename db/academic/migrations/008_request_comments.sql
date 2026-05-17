-- +goose Up
-- FR-260: comment thread per pengajuan. Append-only — tidak ada delete /
-- edit. Scope: academic_request (service_requests) atau supervisor_request.

CREATE TABLE IF NOT EXISTS request_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    request_type TEXT NOT NULL,
    author_user_id UUID NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT request_comments_type_check CHECK (
        request_type IN ('ACADEMIC', 'SUPERVISOR')
    )
);

CREATE INDEX IF NOT EXISTS idx_request_comments_request
    ON request_comments(request_type, request_id, created_at);

CREATE INDEX IF NOT EXISTS idx_request_comments_author
    ON request_comments(author_user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_request_comments_author;
DROP INDEX IF EXISTS idx_request_comments_request;
DROP TABLE IF EXISTS request_comments;
