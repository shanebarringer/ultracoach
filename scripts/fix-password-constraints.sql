-- Fix Better Auth password constraints
-- This script adds database-level constraints to prevent malformed password hashes

-- Add constraint to ensure password hashes are valid bcrypt format
ALTER TABLE better_auth_accounts 
ADD CONSTRAINT check_valid_bcrypt_password 
CHECK (
  password IS NULL OR 
  (password LIKE '$2b$%' AND length(password) = 60)
);

-- Add constraint to ensure password is not empty string
ALTER TABLE better_auth_accounts 
ADD CONSTRAINT check_password_not_empty 
CHECK (password IS NULL OR password != '');

-- Add constraint to ensure password is a string
ALTER TABLE better_auth_accounts 
ADD CONSTRAINT check_password_is_string 
CHECK (password IS NULL OR typeof(password) = 'text');

-- Update any existing malformed passwords to NULL (they'll need to be reset)
UPDATE better_auth_accounts 
SET password = NULL 
WHERE password IS NOT NULL 
  AND (password NOT LIKE '$2b$%' OR length(password) != 60 OR password = '');

-- Show results
SELECT 
  'Total accounts' as metric,
  COUNT(*) as count
FROM better_auth_accounts 
WHERE provider_id = 'credential'

UNION ALL

SELECT 
  'Valid bcrypt passwords' as metric,
  COUNT(*) as count
FROM better_auth_accounts 
WHERE provider_id = 'credential' 
  AND password LIKE '$2b$%' 
  AND length(password) = 60

UNION ALL

SELECT 
  'Null passwords (need reset)' as metric,
  COUNT(*) as count
FROM better_auth_accounts 
WHERE provider_id = 'credential' 
  AND password IS NULL; 