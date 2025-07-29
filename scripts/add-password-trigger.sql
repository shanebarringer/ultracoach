-- Add trigger to prevent malformed password hashes
-- This trigger will catch and prevent invalid password hashes from being saved

-- Create function to validate password hash
CREATE OR REPLACE FUNCTION validate_password_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a credential account with a password
  IF NEW.provider_id = 'credential' AND NEW.password IS NOT NULL THEN
    -- Validate bcrypt format
    IF NEW.password NOT LIKE '$2b$%' OR length(NEW.password) != 60 THEN
      RAISE EXCEPTION 'Invalid password hash format. Must be valid bcrypt hash (starts with $2b$ and length 60)';
    END IF;
    
    -- Ensure it's not empty
    IF NEW.password = '' THEN
      RAISE EXCEPTION 'Password hash cannot be empty string';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_password_trigger ON better_auth_accounts;
CREATE TRIGGER validate_password_trigger
  BEFORE INSERT OR UPDATE ON better_auth_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_password_hash();

-- Test the trigger
-- This should fail:
-- INSERT INTO better_auth_accounts (id, account_id, provider_id, user_id, password) 
-- VALUES ('test-id', 'test@example.com', 'credential', 'user-id', 'invalid-hash');

-- This should succeed:
-- INSERT INTO better_auth_accounts (id, account_id, provider_id, user_id, password) 
-- VALUES ('test-id', 'test@example.com', 'credential', 'user-id', '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO');

-- Show trigger info
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'validate_password_trigger'; 