#!/usr/bin/env bash
set -Eeuo pipefail

# Safe, temporary env swap for Charlie builds
# - Backs up existing .env.local (if any)
# - Copies .env.charlie to .env.local for the duration of the build
# - Always restores prior state and removes temporary files, even on failure

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$ROOT_DIR/.env.local"
BACKUP_FILE="$ROOT_DIR/.env.local.charlie.backup"
ENV_CHARLIE="$ROOT_DIR/.env.charlie"

# Per-run state flags to ensure cleanup only touches files created in this invocation
CREATED_BACKUP=0
CREATED_TEMP_ENV=0

cleanup() {
  # Remove the temporary env only if this run created it
  if [[ $CREATED_TEMP_ENV -eq 1 && -f "$ENV_LOCAL" ]]; then
    rm -f "$ENV_LOCAL" || true
  fi
  # Restore from backup only if this run created the backup
  if [[ $CREATED_BACKUP -eq 1 && -f "$BACKUP_FILE" ]]; then
    mv -f "$BACKUP_FILE" "$ENV_LOCAL" || true
  fi
}

trap cleanup EXIT INT TERM

# Preconditions
if [[ ! -f "$ENV_CHARLIE" ]]; then
  echo "Error: $ENV_CHARLIE not found. Aborting." >&2
  exit 1
fi

# Backup existing env if present; avoid clobbering an existing backup
if [[ -f "$ENV_LOCAL" ]]; then
  if [[ -f "$BACKUP_FILE" ]]; then
    ts=$(date +%s)
    BACKUP_FILE="$ROOT_DIR/.env.local.charlie.backup.$ts"
  fi
  mv -f "$ENV_LOCAL" "$BACKUP_FILE"
  CREATED_BACKUP=1
fi

# Use Charlie env for the build
cp "$ENV_CHARLIE" "$ENV_LOCAL"
CREATED_TEMP_ENV=1

# Run the production build using the local Next.js binary
cd "$ROOT_DIR"
pnpm exec next build
