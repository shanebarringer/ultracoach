#!/usr/bin/env bash

# CI Auth Setup Script (hardened)
# Ensures Playwright authentication state files exist and are valid before running E2E.
# Compatible with local dev and CI.

set -euo pipefail

# Configurable paths and timings
# Prefer AUTH_DIR if provided, else PLAYWRIGHT_AUTH_DIR, else default
AUTH_DIR=${AUTH_DIR:-${PLAYWRIGHT_AUTH_DIR:-playwright/.auth}}
AUTH_WAIT_SECONDS=${AUTH_WAIT_SECONDS:-15}

RUNNER_AUTH_FILE="$AUTH_DIR/user.json"
COACH_AUTH_FILE="$AUTH_DIR/coach.json"

echo "🔐 Setting up CI authentication files..."
echo "   AUTH_DIR=$AUTH_DIR"
echo "   AUTH_WAIT_SECONDS=$AUTH_WAIT_SECONDS"

# Ensure auth directory exists
if [[ ! -d "$AUTH_DIR" ]]; then
  echo "📁 Creating auth directory: $AUTH_DIR"
  mkdir -p "$AUTH_DIR"
fi

# Wait for auth files to be created by Playwright setup projects
missing=("$RUNNER_AUTH_FILE" "$COACH_AUTH_FILE")
deadline=$(( $(date +%s) + AUTH_WAIT_SECONDS ))

while :; do
  still_missing=()
  for f in "${missing[@]}"; do
    [[ -f "$f" ]] || still_missing+=("$f")
  done

  if [[ ${#still_missing[@]} -eq 0 ]]; then
    break
  fi

  now=$(date +%s)
  if (( now >= deadline )); then
    echo "❌ Timed out waiting for auth files after ${AUTH_WAIT_SECONDS}s"
    echo "   Missing files:"
    for f in "${still_missing[@]}"; do
      echo "   - $f"
    done
    echo "   Hint: Ensure Playwright setup projects ('setup' and 'setup-coach') ran successfully and write storageState to $AUTH_DIR"
    exit 1
  fi

  echo "⏳ Waiting for auth files to be ready... (${#still_missing[@]} missing)"
  sleep 1
done

echo "✅ Auth files found:"
echo "   - $RUNNER_AUTH_FILE"
echo "   - $COACH_AUTH_FILE"

# jq dependency check
if ! command -v jq >/dev/null 2>&1; then
  echo "❌ 'jq' is required for JSON validation but was not found on PATH."
  echo "   Please install jq in your CI image or skip validation by pre-validating files."
  exit 1
fi

echo "🔍 Validating auth file structure..."

validate_auth_file() {
  local file=$1
  # Validate that JSON has a 'cookies' key and that it is an array
  if ! jq -e 'has("cookies") and (.cookies | type == "array")' "$file" >/dev/null; then
    echo "❌ Invalid auth file: $file — must contain an array at .cookies"
    return 1
  fi
}

validate_auth_file "$RUNNER_AUTH_FILE"
validate_auth_file "$COACH_AUTH_FILE"

echo "✅ Auth files are valid JSON with .cookies array"
echo "🎯 CI authentication setup complete!"
