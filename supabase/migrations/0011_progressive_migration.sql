-- Progressive Migration to Better Auth IDs
-- This migration handles the conversion step by step

BEGIN;

-- Step 1: Check current structure
SELECT 'Starting migration' as status;

-- Step 2: Create a simple test to understand current data structure
CREATE TEMP TABLE id_comparison AS
SELECT 
    u.id as users_id,
    u.email as users_email,
    ba.id as better_auth_id,
    ba.email as better_auth_email,
    pg_typeof(u.id) as users_id_type,
    pg_typeof(ba.id) as better_auth_id_type
FROM users u
JOIN better_auth_users ba ON u.email = ba.email
LIMIT 5;

-- Show the comparison
SELECT * FROM id_comparison;

-- Step 3: Based on the actual data, let's do the migration properly
-- Create the real mapping table with proper types
CREATE TEMP TABLE user_id_mapping AS
SELECT 
    u.id::text as old_id,
    u.email,
    ba.id as new_id
FROM users u
JOIN better_auth_users ba ON u.email = ba.email;

-- Show mapping count
SELECT COUNT(*) as mapping_count FROM user_id_mapping;

COMMIT;

SELECT 'Migration analysis completed' as status;