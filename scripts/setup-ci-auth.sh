#!/usr/bin/env bash
# Validate Playwright authentication artifacts in CI with robust checks and bounded wait.
# - Portable shebang
# - Strict mode to catch unset vars and pipeline failures
# - Configurable AUTH_DIR/PLAYWRIGHT_AUTH_DIR and AUTH_WAIT_SECONDS
# - Bounded wait for files to appear (default 15s)
# - jq dependency check
# - JSON validation: .cookies must exist and be an array
# - Backward-compatible: supports runner.json and user.json (alias)

set -euo pipefail

# Config
DEFAULT_AUTH_DIR="playwright/.auth"
AUTH_DIR="${AUTH_DIR:-${PLAYWRIGHT_AUTH_DIR:-$DEFAULT_AUTH_DIR}}"
AUTH_WAIT_SECONDS="${AUTH_WAIT_SECONDS:-15}"

# Normalize wait to integer (fallback to 15 on invalid)
if ! [[ "$AUTH_WAIT_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "[setup-ci-auth] WARN: AUTH_WAIT_SECONDS=\"$AUTH_WAIT_SECONDS\" is not an integer. Using 15s." >&2
  AUTH_WAIT_SECONDS=15
fi

COACH_FILE="$AUTH_DIR/coach.json"
RUNNER_FILE_PRIMARY="$AUTH_DIR/runner.json"
RUNNER_FILE_ALIAS="$AUTH_DIR/user.json" # legacy alias

# Dependency check: jq must exist
if ! command -v jq >/dev/null 2>&1; then
  echo "[setup-ci-auth] ERROR: jq is required but not installed." >&2
  echo "Install jq on CI (e.g., sudo apt-get update && sudo apt-get install -y jq) or add \"uses: mikefarah/yq\" with jq shim." >&2
  exit 2
fi

# Wait loop for files to appear
start_ts=$(date +%s)
end_ts=$((start_ts + AUTH_WAIT_SECONDS))

runner_path=""

while :; do
  missing=()

  [[ -f "$COACH_FILE" ]] || missing+=("$COACH_FILE (coach auth)")

  if [[ -f "$RUNNER_FILE_PRIMARY" ]]; then
    runner_path="$RUNNER_FILE_PRIMARY"
  elif [[ -f "$RUNNER_FILE_ALIAS" ]]; then
    runner_path="$RUNNER_FILE_ALIAS"
  else
    missing+=("$RUNNER_FILE_PRIMARY or $RUNNER_FILE_ALIAS (runner auth)")
  fi

  if [[ ${#missing[@]} -eq 0 ]]; then
    break
  fi

  now=$(date +%s)
  if (( now >= end_ts )); then
    echo "[setup-ci-auth] ERROR: Authentication files not found after ${AUTH_WAIT_SECONDS}s wait:" >&2
    for m in "${missing[@]}"; do echo "  - $m" >&2; done
    echo "[setup-ci-auth] HINT: Ensure Playwright auth setup projects ran before dependent tests (projects: setup, setup-coach)." >&2
    echo "[setup-ci-auth]       Auth dir in use: $AUTH_DIR (override with AUTH_DIR or PLAYWRIGHT_AUTH_DIR)." >&2
    exit 1
  fi
  sleep 1
done

# Validate JSON structure: cookies array must exist
validate_json() {
  local file="$1"
  local label="$2"
  if ! jq -e 'has("cookies") and (.cookies | type == "array")' "$file" >/dev/null; then
    echo "[setup-ci-auth] ERROR: $label auth file invalid at $file: .cookies missing or not an array" >&2
    return 1
  fi
  return 0
}

errors=0
validate_json "$COACH_FILE" "coach" || errors=$((errors+1))
validate_json "${runner_path}" "runner" || errors=$((errors+1))

if (( errors > 0 )); then
  echo "[setup-ci-auth] One or more auth files are invalid JSON for Playwright storageState." >&2
  exit 1
fi

# Success summary
echo "[setup-ci-auth] OK: Auth files valid in $AUTH_DIR"
[[ "$runner_path" == "$RUNNER_FILE_ALIAS" ]] && echo "[setup-ci-auth] Note: Using legacy alias user.json (runner.json also supported)."

exit 0
BASH
sed -i "/<<<<<<<\|=======\|>>>>>>>/d" tests/e2e/chat-messaging.spec.ts tests/e2e/training-plan-management.spec.ts && 
sed -i "s#Already authenticated via storageState – navigate directly#Already authenticated via storageState: navigate directly#" tests/e2e/chat-messaging.spec.ts && 
sed -i "/<<<<<<<\|=======\|>>>>>>>/d" scripts/setup-ci-auth.sh && chmod +x scripts/setup-ci-auth.sh
