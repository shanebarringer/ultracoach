-- Fix Production Database userType Assignments
-- This SQL script corrects the userType field for existing users

-- Update known coaches to have userType='coach'
UPDATE better_auth_users 
SET user_type = 'coach', updated_at = NOW()
WHERE email IN (
  'sarah@ultracoach.dev',
  'marcus@ultracoach.dev', 
  'emma@ultracoach.dev'
) AND user_type != 'coach';

-- Update known runners to have userType='runner' (should already be correct, but ensuring consistency)
UPDATE better_auth_users 
SET user_type = 'runner', updated_at = NOW()
WHERE email IN (
  'alex.rivera@ultracoach.dev',
  'jordan.chen@ultracoach.dev',
  'casey.johnson@ultracoach.dev',
  'riley.parker@ultracoach.dev',
  'quinn.wilson@ultracoach.dev',
  'blake.torres@ultracoach.dev'
) AND user_type != 'runner';

-- Update any remaining test users that might have wrong userType
UPDATE better_auth_users 
SET user_type = 'coach', updated_at = NOW()
WHERE email LIKE '%testcoach%' AND user_type != 'coach';

UPDATE better_auth_users 
SET user_type = 'runner', updated_at = NOW()
WHERE email LIKE '%testrunner%' AND user_type != 'runner';

-- Verify the corrections
SELECT 
  email,
  role,
  user_type,
  name,
  full_name,
  updated_at,
  CASE 
    WHEN user_type = 'coach' THEN '✅ COACH'
    WHEN user_type = 'runner' THEN '✅ RUNNER'
    ELSE '❌ NEEDS FIX'
  END as status
FROM better_auth_users 
ORDER BY user_type, email;