-- +goose Up
CREATE TABLE kaprodi_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegator_user_id UUID NOT NULL,
    delegate_user_id UUID NOT NULL,
    delegate_name TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_delegation_dates CHECK (ends_at > starts_at),
    CONSTRAINT chk_no_self_delegation CHECK (delegator_user_id != delegate_user_id)
);

CREATE INDEX idx_delegations_delegator ON kaprodi_delegations (delegator_user_id, is_active);
CREATE INDEX idx_delegations_delegate ON kaprodi_delegations (delegate_user_id, is_active);
CREATE INDEX idx_delegations_active_period ON kaprodi_delegations (delegate_user_id, starts_at, ends_at)
    WHERE is_active = TRUE;

-- +goose Down
DROP TABLE IF EXISTS kaprodi_delegations;
