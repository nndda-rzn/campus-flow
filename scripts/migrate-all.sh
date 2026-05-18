#!/usr/bin/env bash
#
# migrate-all.sh — Run goose up for every CampusFlow service DB.
#
# Usage:
#   ./scripts/migrate-all.sh           # apply pending up migrations
#   ./scripts/migrate-all.sh down      # rollback one step per service
#   DB_HOST=db.local ./scripts/migrate-all.sh
#
# Requirements:
#   - goose CLI on PATH:
#       go install github.com/pressly/goose/v3/cmd/goose@latest

set -euo pipefail

DB_USER="${DB_USER:-campusflow}"
DB_PASSWORD="${DB_PASSWORD:-campusflow_password}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_SSLMODE="${DB_SSLMODE:-disable}"

DIRECTION="${1:-up}"
case "$DIRECTION" in
    up)   CMD="up" ;;
    down) CMD="down" ;;
    *)    echo "usage: $0 [up|down]" >&2; exit 2 ;;
esac

if ! command -v goose >/dev/null 2>&1; then
    echo "goose CLI not found on PATH." >&2
    echo "Install: go install github.com/pressly/goose/v3/cmd/goose@latest" >&2
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# service:database pairs. Order matters only loosely — every DB is independent.
SERVICES=(
    "auth:auth_db"
    "academic:academic_db"
    "file:file_db"
    "notification:notification_db"
    "reporting:reporting_db"
)

echo "CampusFlow migrate (${DIRECTION})"
echo "Target: ${DB_USER}@${DB_HOST}:${DB_PORT} (sslmode=${DB_SSLMODE})"
echo

for entry in "${SERVICES[@]}"; do
    name="${entry%%:*}"
    db="${entry##*:}"
    path="${REPO_ROOT}/db/${name}/migrations"

    if [[ ! -d "$path" ]]; then
        echo "skip $name (no migrations at $path)" >&2
        continue
    fi

    url="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${db}?sslmode=${DB_SSLMODE}"
    printf "[%-12s] %s ... " "$name" "$db"
    
    cd "$path"
    if goose postgres "$url" "$CMD" >/tmp/cf-migrate.log 2>&1; then
        echo "ok"
    else
        echo "FAIL"
        sed 's/^/    /' /tmp/cf-migrate.log
        exit 1
    fi
done

echo
echo "All migrations complete."