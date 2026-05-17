-- +goose Up
-- Index for the outbox publisher worker added in Epic 3 so the periodic
-- pending-events scan stays fast as the table grows.
CREATE INDEX IF NOT EXISTS idx_file_outbox_events_status_created
    ON outbox_events(status, created_at);

-- +goose Down
DROP INDEX IF EXISTS idx_file_outbox_events_status_created;
