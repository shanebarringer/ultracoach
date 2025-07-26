-- Rollback Migration: add_set_config_function
-- Description: Rollback for Add PostgreSQL set_config function for user context
-- Created: 2025-07-24 21:57:01
-- Author: Shane Barringer

-- BEGIN TRANSACTION
BEGIN;

-- ============================================================================
-- ROLLBACK SCRIPT: add_set_config_function
-- ============================================================================

-- WARNING: This will undo the changes made by migration 20250724215701_add_set_config_function.sql
-- Make sure you have a backup before running this rollback!

-- Drop the set_config function created in the migration
DROP FUNCTION IF EXISTS set_config(text, text, boolean);

-- ============================================================================
-- VALIDATION QUERIES (uncomment to verify rollback)
-- ============================================================================

-- Verify function is dropped:
SELECT NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'set_config' 
    AND pg_function_is_visible(oid)
);

-- COMMIT TRANSACTION
COMMIT;

-- Log successful rollback
SELECT 'Rollback for migration add_set_config_function completed successfully' AS status;
