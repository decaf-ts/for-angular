#!/usr/bin/env bash
#
# SAA-729 per-engine UI validation runner.
#
# For EACH requested engine driver (local|mastra|dagster) this boots the seeded
# as-graph NestJS backend on :3000 (the port the app hardcodes via
# `GRAPH_BACKEND_URL`), runs the real-backend Playwright spec
# (`fixtures-ui.spec.ts`) against the for-angular dev server on :8110, then tears
# the backend down. It aggregates the per-engine reports into one fixture x
# engine x {list,show,replay,i-o} matrix.
#
# The backend entry moved with the SAA-774 structural redress: it is no longer
# the `tests/helpers/fixtures-host` helper but the standalone NestJS bootstrap
# `lib/cjs/nest/graph/main.cjs`, selected per engine with `GRAPH_BACKEND_ENGINE`
# and ready when it logs `NestJS graph execution server listening on ...`.
#
# Usage:
#   tests/playwright/graph/per-engine/run-per-engine-ui.sh
#   ENGINES="local mastra" SKIP_FRONTEND_START=1 tests/playwright/graph/per-engine/run-per-engine-ui.sh
#
# Env:
#   ENGINES              engines to validate (default: "local mastra dagster")
#   BACKEND_PORT         as-graph host port (default 3000; frontend hardcodes it)
#   FRONTEND_URL         app URL (default http://localhost:8110)
#   SKIP_FRONTEND_START  1 = require the app already running on FRONTEND_URL
#   SKIP_HOST_BUILD      1 = reuse an existing as-graph backend lib
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FOR_ANGULAR_ROOT="$(cd "$HERE/../../../.." && pwd)"
AS_GRAPH_ROOT="${AS_GRAPH_ROOT:-$(cd "$FOR_ANGULAR_ROOT/../as-graph" && pwd)}"
BACKEND_ENTRY="$AS_GRAPH_ROOT/lib/cjs/nest/graph/main.cjs"
BACKEND_READY_MARKER="NestJS graph execution server listening on"

ENGINES="${ENGINES:-local mastra dagster}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8110}"
REPORT_DIR="$HERE/.reports"
mkdir -p "$REPORT_DIR"

BACKEND_PID=""
UI_PID=""
STARTED_UI=0

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    sleep 1
    kill -9 "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ "$STARTED_UI" = "1" && -n "$UI_PID" ]]; then
    kill "$UI_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1" tries="$2"
  for ((i = 0; i < tries; i += 1)); do
    if curl -s -o /dev/null "$url"; then return 0; fi
    sleep 1
  done
  return 1
}

echo "== SAA-729 per-engine UI validation =="
echo "for-angular: $FOR_ANGULAR_ROOT"
echo "as-graph:    $AS_GRAPH_ROOT"
echo "engines:     $ENGINES"

if [[ ! -f "$BACKEND_ENTRY" ]]; then
  if [[ "${SKIP_HOST_BUILD:-0}" = "1" ]]; then
    echo "as-graph backend entry missing at $BACKEND_ENTRY and SKIP_HOST_BUILD=1"; exit 2
  fi
  echo "-- building as-graph backend lib"
  ( cd "$AS_GRAPH_ROOT" && npm run build ) || { echo "as-graph build failed"; exit 2; }
fi

if ! curl -s -o /dev/null "$FRONTEND_URL"; then
  if [[ "${SKIP_FRONTEND_START:-0}" = "1" ]]; then
    echo "frontend not reachable at $FRONTEND_URL and SKIP_FRONTEND_START=1"; exit 3
  fi
  echo "-- starting for-angular dev server on :8110 (log: $REPORT_DIR/ui.log)"
  ( cd "$FOR_ANGULAR_ROOT" && exec npm run start ) > "$REPORT_DIR/ui.log" 2>&1 &
  UI_PID=$!
  STARTED_UI=1
  if ! wait_for_url "$FRONTEND_URL" 300; then
    echo "frontend failed to start within 300s"; tail -20 "$REPORT_DIR/ui.log" || true; exit 3
  fi
  echo "-- frontend up"
else
  echo "-- frontend already reachable at $FRONTEND_URL"
fi

for ENGINE in $ENGINES; do
  echo ""
  echo "===== engine: $ENGINE ====="
  if curl -s -o /dev/null "http://127.0.0.1:$BACKEND_PORT/graph/engines"; then
    echo "port $BACKEND_PORT already served; refusing to clobber"; exit 4
  fi

  rm -f "$REPORT_DIR/host-$ENGINE.log"
  GRAPH_BACKEND_ENGINE="$ENGINE" GRAPH_BACKEND_PORT="$BACKEND_PORT" \
    node "$BACKEND_ENTRY" > "$REPORT_DIR/host-$ENGINE.log" 2>&1 &
  BACKEND_PID=$!

  READY=0
  for ((i = 0; i < 90; i += 1)); do
    if grep -q "$BACKEND_READY_MARKER" "$REPORT_DIR/host-$ENGINE.log" 2>/dev/null; then READY=1; break; fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then break; fi
    sleep 1
  done
  if [[ "$READY" != "1" ]]; then
    echo "seeded backend for $ENGINE did not become ready:"; tail -20 "$REPORT_DIR/host-$ENGINE.log" || true
    kill "$BACKEND_PID" 2>/dev/null || true
    BACKEND_PID=""
    continue
  fi
  echo "$(grep "$BACKEND_READY_MARKER" "$REPORT_DIR/host-$ENGINE.log" | head -1)"

  ( cd "$FOR_ANGULAR_ROOT" && \
    GRAPH_BACKEND_ENGINE="$ENGINE" \
    GRAPH_BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" \
    FRONTEND_URL="$FRONTEND_URL" \
    AS_GRAPH_ROOT="$AS_GRAPH_ROOT" \
    PER_ENGINE_REPORT="$REPORT_DIR/$ENGINE.json" \
    node_modules/.bin/playwright test --config "$HERE/playwright.per-engine.config.ts" ) \
    > "$REPORT_DIR/playwright-$ENGINE.log" 2>&1
  PW_EXIT=$?
  echo "playwright exit: $PW_EXIT (log: $REPORT_DIR/playwright-$ENGINE.log)"
  tail -6 "$REPORT_DIR/playwright-$ENGINE.log" || true

  kill "$BACKEND_PID" 2>/dev/null || true
  sleep 1
  kill -9 "$BACKEND_PID" 2>/dev/null || true
  BACKEND_PID=""
done

echo ""
echo "===== fixture x engine x action matrix ====="
python3 "$HERE/summarize.py" "$REPORT_DIR" "$ENGINES" || true
echo ""
echo "reports: $REPORT_DIR"
