#!/usr/bin/env bash
#
# run-all.sh — Launch every CampusFlow service in parallel with prefixed logs.
#
# Usage:
#   ./scripts/run-all.sh                 # all services + frontend
#   ./scripts/run-all.sh --no-frontend   # only Go services
#
# Logs from each service are colorized & prefixed with [name] in a single
# stdout stream. Ctrl+C terminates the whole group.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

WITH_FRONTEND=1
case "${1:-}" in
    --no-frontend|-n) WITH_FRONTEND=0 ;;
    "") ;;
    *) echo "usage: $0 [--no-frontend]" >&2; exit 2 ;;
esac

# colors per service
COLOR_RESET='\033[0m'
declare -a COLORS=(
    '\033[36m' # cyan
    '\033[35m' # magenta
    '\033[33m' # yellow
    '\033[34m' # blue
    '\033[32m' # green
    '\033[31m' # red
    '\033[37m' # white
)

PIDS=()

cleanup() {
    echo
    echo "stopping..." >&2
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    wait 2>/dev/null || true
}
trap cleanup INT TERM

start_service() {
    local idx="$1"
    local name="$2"
    local cmd="$3"
    local cwd="$4"
    local color="${COLORS[$((idx % ${#COLORS[@]}))]}"

    (
        cd "$cwd"
        # shellcheck disable=SC2086
        $cmd 2>&1 | while IFS= read -r line; do
            printf "${color}[%-22s]${COLOR_RESET} %s\n" "$name" "$line"
        done
    ) &
    PIDS+=("$!")
}

echo "CampusFlow run-all"
echo "Repo: $REPO_ROOT"
echo

start_service 0 "auth-service"         "go run ./apps/services/auth-service/cmd/server"         "$REPO_ROOT"
start_service 1 "academic-service"     "go run ./apps/services/academic-service/cmd/server"     "$REPO_ROOT"
start_service 2 "file-service"         "go run ./apps/services/file-service/cmd/server"         "$REPO_ROOT"
start_service 3 "notification-service" "go run ./apps/services/notification-service/cmd/server" "$REPO_ROOT"
start_service 4 "reporting-service"    "go run ./apps/services/reporting-service/cmd/server"    "$REPO_ROOT"
start_service 5 "api-gateway"          "go run ./apps/services/api-gateway/cmd/server"          "$REPO_ROOT"

if [[ "$WITH_FRONTEND" == "1" ]] && [[ -d "$REPO_ROOT/apps/web" ]]; then
    start_service 6 "web" "npm run dev" "$REPO_ROOT/apps/web"
fi

echo "All services started. PIDs: ${PIDS[*]}"
echo "API Gateway: http://localhost:8080/health"
echo "Frontend:    http://localhost:3000"
echo "Press Ctrl+C to stop everything."
echo

wait
