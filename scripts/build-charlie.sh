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

cleanup() {
  # If we created a backup, restore it; otherwise just remove the temp env
  if [[ -f "$BACKUP_FILE" ]]; then
    [[ -f "$ENV_LOCAL" ]] && rm -f "$ENV_LOCAL"
    mv -f "$BACKUP_FILE" "$ENV_LOCAL"
  else
    [[ -f "$ENV_LOCAL" ]] && rm -f "$ENV_LOCAL"
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
fi

# Use Charlie env for the build
cp "$ENV_CHARLIE" "$ENV_LOCAL"

# Run the production build (inherits pnpm-provided PATH when invoked via `pnpm run`)
cd "$ROOT_DIR"
next build
