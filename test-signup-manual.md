# Manual Signup Test

## Test 1: Coach Signup

1. Navigate to http://localhost:3000/auth/signup
2. Fill form:
   - Full Name: "Test Coach User"
   - Email: "testcoach123@example.com"
   - Password: "TestPassword123!"
   - Role: Select "Mountain Guide" (coach)
3. Submit form
4. Expected: Should redirect to /dashboard/coach after signup/onboarding

## Test 2: Runner Signup

1. Navigate to http://localhost:3000/auth/signup
2. Fill form:
   - Full Name: "Test Runner User"
   - Email: "testrunner123@example.com"
   - Password: "TestPassword123!"
   - Role: Select "Trail Runner" (runner)
3. Submit form
4. Expected: Should redirect to /dashboard/runner after signup/onboarding

## Verification

After each signup, check database:

```sql
SELECT id, email, role, user_type, name, full_name, created_at
FROM better_auth_users
WHERE email IN ('testcoach123@example.com', 'testrunner123@example.com')
ORDER BY created_at DESC;
```

Expected Results:

- testcoach123@example.com: role='user', user_type='coach' ✅
- testrunner123@example.com: role='user', user_type='runner' ✅
