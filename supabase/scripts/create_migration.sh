#!/bin/bash

# Migration File Generator
# Creates timestamped migration files with rollback templates
# Usage: ./create_migration.sh <migration_name> [description]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_DIR="$SCRIPT_DIR/../migrations"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# Validate input
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <migration_name> [description]"
    echo ""
    echo "Examples:"
    echo "  $0 add_user_preferences"
    echo "  $0 create_analytics_tables 'Add analytics and reporting tables'"
    echo "  $0 update_training_plan_schema 'Add race progression fields'"
    exit 1
fi

MIGRATION_NAME="$1"
DESCRIPTION="${2:-$MIGRATION_NAME}"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Clean migration name (replace spaces/special chars with underscores)
CLEAN_NAME=$(echo "$MIGRATION_NAME" | sed 's/[^a-zA-Z0-9_]/_/g' | tr '[:upper:]' '[:lower:]')

# File names
MIGRATION_FILE="${TIMESTAMP}_${CLEAN_NAME}.sql"
ROLLBACK_FILE="${TIMESTAMP}_${CLEAN_NAME}_rollback.sql"

MIGRATION_PATH="$MIGRATION_DIR/$MIGRATION_FILE"
ROLLBACK_PATH="$MIGRATION_DIR/$ROLLBACK_FILE"

# Create migration directory if it doesn't exist
mkdir -p "$MIGRATION_DIR"

info "Creating migration: $MIGRATION_FILE"

# Create main migration file
cat > "$MIGRATION_PATH" << EOF
-- Migration: $MIGRATION_NAME
-- Description: $DESCRIPTION
-- Created: $(date '+%Y-%m-%d %H:%M:%S')
-- Author: $(git config user.name 2>/dev/null || echo "Unknown")

-- BEGIN TRANSACTION
BEGIN;

-- ============================================================================
-- MIGRATION SCRIPT: $MIGRATION_NAME
-- ============================================================================

-- Add your migration SQL here
-- Examples:

-- Creating a new table:
-- CREATE TABLE IF NOT EXISTS "example_table" (
--     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--     "name" text NOT NULL,
--     "created_at" timestamp with time zone DEFAULT now(),
--     "updated_at" timestamp with time zone DEFAULT now()
-- );

-- Adding a column:
-- ALTER TABLE "existing_table" 
-- ADD COLUMN IF NOT EXISTS "new_column" text;

-- Creating an index:
-- CREATE INDEX IF NOT EXISTS "idx_example_table_name" 
-- ON "example_table"("name");

-- Adding foreign key constraint:
-- ALTER TABLE "child_table" 
-- ADD CONSTRAINT "child_table_parent_id_fk" 
-- FOREIGN KEY ("parent_id") REFERENCES "parent_table"("id") 
-- ON DELETE CASCADE;

-- Updating existing data:
-- UPDATE "existing_table" 
-- SET "status" = 'active' 
-- WHERE "status" IS NULL;

-- Creating RLS policy:
-- CREATE POLICY "users_can_view_own_data" ON "example_table"
-- FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

-- Enable RLS on new table:
-- ALTER TABLE "example_table" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VALIDATION QUERIES (uncomment to verify migration)
-- ============================================================================

-- Verify table exists:
-- SELECT EXISTS (
--     SELECT 1 FROM information_schema.tables 
--     WHERE table_name = 'example_table'
-- );

-- Verify column exists:
-- SELECT EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_name = 'existing_table' AND column_name = 'new_column'
-- );

-- Count affected rows:
-- SELECT COUNT(*) FROM "example_table";

-- COMMIT TRANSACTION
COMMIT;

-- Log successful migration
SELECT 'Migration $MIGRATION_NAME completed successfully' AS status;
EOF

info "Creating rollback script: $ROLLBACK_FILE"

# Create rollback file
cat > "$ROLLBACK_PATH" << EOF
-- Rollback Migration: $MIGRATION_NAME
-- Description: Rollback for $DESCRIPTION
-- Created: $(date '+%Y-%m-%d %H:%M:%S')
-- Author: $(git config user.name 2>/dev/null || echo "Unknown")

-- BEGIN TRANSACTION
BEGIN;

-- ============================================================================
-- ROLLBACK SCRIPT: $MIGRATION_NAME
-- ============================================================================

-- WARNING: This will undo the changes made by migration $MIGRATION_FILE
-- Make sure you have a backup before running this rollback!

-- Rollback examples (reverse order of migration):

-- Drop table (if created in migration):
-- DROP TABLE IF EXISTS "example_table";

-- Remove column (if added in migration):
-- ALTER TABLE "existing_table" 
-- DROP COLUMN IF EXISTS "new_column";

-- Drop index (if created in migration):
-- DROP INDEX IF EXISTS "idx_example_table_name";

-- Remove foreign key constraint (if added in migration):
-- ALTER TABLE "child_table" 
-- DROP CONSTRAINT IF EXISTS "child_table_parent_id_fk";

-- Revert data updates (if data was updated in migration):
-- UPDATE "existing_table" 
-- SET "status" = NULL 
-- WHERE "status" = 'active';

-- Drop RLS policy (if created in migration):
-- DROP POLICY IF EXISTS "users_can_view_own_data" ON "example_table";

-- ============================================================================
-- VALIDATION QUERIES (uncomment to verify rollback)
-- ============================================================================

-- Verify table is dropped:
-- SELECT NOT EXISTS (
--     SELECT 1 FROM information_schema.tables 
--     WHERE table_name = 'example_table'
-- );

-- Verify column is removed:
-- SELECT NOT EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_name = 'existing_table' AND column_name = 'new_column'
-- );

-- COMMIT TRANSACTION
COMMIT;

-- Log successful rollback
SELECT 'Rollback for migration $MIGRATION_NAME completed successfully' AS status;
EOF

success "Migration files created:"
echo "  Forward:  $MIGRATION_PATH"
echo "  Rollback: $ROLLBACK_PATH"

echo ""
info "Next steps:"
echo "1. Edit the migration file with your SQL changes"
echo "2. Edit the rollback file with corresponding undo operations"
echo "3. Test the migration: ./migrate.sh test $MIGRATION_FILE"
echo "4. Apply the migration: ./migrate.sh up $MIGRATION_FILE"

echo ""
warn "Remember:"
echo "- Test migrations on a copy of production data first"
echo "- Always create rollback scripts"
echo "- Use transactions for atomic operations"
echo "- Validate changes with verification queries"