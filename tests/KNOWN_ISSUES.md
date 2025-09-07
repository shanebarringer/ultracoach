# Known Playwright Test Issues

## Auth Setup Form Submission Issue

**Problem**: The authentication form in `/auth/signin` is not submitting properly via Playwright tests.

**Symptoms**:

- Form submits as GET request with query parameters instead of POST
- URL shows: `/auth/signin?email=alex.rivera%40ultracoach.dev&password=RunnerPass2025%21`
- React hydration appears incomplete, preventing proper form submission

**Root Cause**:
The sign-in form uses React Hook Form with client-side submission. When Playwright tries to submit the form before React has fully hydrated, the browser falls back to standard HTML form submission (GET request with query params).

**Attempted Solutions**:

1. ✅ Added 2000ms React hydration wait per Context7 best practices
2. ✅ Used keyboard.type() instead of fill() for better React compatibility
3. ✅ Used Enter key submission instead of button click
4. ❌ Form still submits as GET despite all mitigations

**Workaround Options**:

1. Use API-based authentication instead of UI-based for test setup
2. Increase hydration wait time further (not recommended)
3. Mock the authentication in test environment
4. Use existing authenticated session from successful manual login

**Related Files**:

- `/tests/auth.setup.ts` - Authentication setup test
- `/src/app/auth/signin/page.tsx` - Sign-in page implementation
- `/tests/utils/wait-helpers.ts` - Helper functions with hydration waits

**Status**: Investigating alternative authentication approaches for tests
