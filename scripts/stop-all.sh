#!/usr/bin/env bash
#
# stop-all.sh — Kill CampusFlow services spawned outside of run-all.sh
# (run-all.sh handles its own children via Ctrl+C). Targets services by the
# port they listen on.

set -u

PORTS=(8080 50051 50052 50053 50054 50055 3000)
KILLED=0

for port in "${PORTS[@]}"; do
    pids=""
    if command -v lsof >/dev/null 2>&1; then
        pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    elif command -v fuser >/dev/null 2>&1; then
        pids="$(fuser -n tcp "$port" 2>/dev/null || true)"
    elif command -v ss >/dev/null 2>&1; then
        pids="$(ss -lntp 2>/dev/null \
            | awk -v port=":$port" '$4 ~ port { match($0, /pid=[0-9]+/); if (RSTART) print substr($0, RSTART+4, RLENGTH-4) }')"
    fi

    for pid in $pids; do
        echo "stopping pid=$pid (port $port)"
        kill "$pid" 2>/dev/null || true
        KILLED=$((KILLED + 1))
    done
done

if [[ "$KILLED" -eq 0 ]]; then
    echo "No CampusFlow processes found."
else
    echo "Stopped $KILLED process(es)."
fi
