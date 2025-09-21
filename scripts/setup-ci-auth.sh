#!/bin/bash

# CI Auth Setup Script
# Ensures authentication files exist for Playwright tests in CI environment

set -e  # Exit on any error

AUTH_DIR="playwright/.auth"
RUNNER_AUTH_FILE="$AUTH_DIR/runner.json"
COACH_AUTH_FILE="$AUTH_DIR/coach.json"

echo "🔐 Setting up CI authentication files..."

# Ensure auth directory exists
if [ ! -d "$AUTH_DIR" ]; then
    echo "📁 Creating auth directory: $AUTH_DIR"
    mkdir -p "$AUTH_DIR"
fi

# Check if auth files exist (they should be created by setup projects)
if [ ! -f "$RUNNER_AUTH_FILE" ]; then
    echo "⚠️  Warning: $RUNNER_AUTH_FILE not found"
    echo "   This file should be created by the 'setup' project (auth.setup.ts)"
    echo "   If this error persists, check the auth setup dependencies in playwright.config.ts"
    exit 1
fi

if [ ! -f "$COACH_AUTH_FILE" ]; then
    echo "⚠️  Warning: $COACH_AUTH_FILE not found"
    echo "   This file should be created by the 'setup-coach' project (auth-coach.setup.ts)"
    echo "   If this error persists, check the auth setup dependencies in playwright.config.ts"
    exit 1
fi

echo "✅ All auth files exist:"
echo "   - $RUNNER_AUTH_FILE"
echo "   - $COACH_AUTH_FILE"

# Optional: Validate auth file structure
echo "🔍 Validating auth file structure..."

if ! jq -e '.cookies' "$RUNNER_AUTH_FILE" > /dev/null 2>&1; then
    echo "❌ Invalid runner auth file: missing cookies array"
    exit 1
fi

if ! jq -e '.cookies' "$COACH_AUTH_FILE" > /dev/null 2>&1; then
    echo "❌ Invalid coach auth file: missing cookies array"
    exit 1
fi

echo "✅ Auth files are valid JSON with required structure"
echo "🎯 CI authentication setup complete!"