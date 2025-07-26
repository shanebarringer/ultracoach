-- Migration: add_set_config_function
-- Description: Add PostgreSQL set_config function for user context
-- Created: 2025-07-24 21:57:01
-- Author: Shane Barringer

-- BEGIN TRANSACTION
BEGIN;

-- ============================================================================
-- MIGRATION SCRIPT: add_set_config_function
-- ============================================================================

-- Create PostgreSQL set_config function to support Better Auth user context
CREATE OR REPLACE FUNCTION set_config(
  setting_name text,
  new_value text,
  is_local boolean DEFAULT false
) RETURNS text AS $$
BEGIN
  PERFORM set_config(setting_name, new_value, is_local);
  RETURN new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_config(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION set_config(text, text, boolean) TO service_role;

-- ============================================================================
-- VALIDATION QUERIES (uncomment to verify migration)
-- ============================================================================

-- Verify function exists:
SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'set_config' 
    AND pg_function_is_visible(oid)
);

-- COMMIT TRANSACTION
COMMIT;

-- Log successful migration
SELECT 'Migration add_set_config_function completed successfully' AS status;
