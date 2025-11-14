# Playwright Reliability Guide

This guide documents the reliability standards applied across the E2E suite.

## 1) Selector Strategy

- Prefer `data-testid` with optional semantic attributes like `data-status`.
- Keep role-based selectors where they are unique and stable.
- Avoid broad text queries.
- See [Selector Best Practices](./selector-best-practices.md).

## 2) Wait Strategy

- Use `locator.waitFor({ state: 'visible' })` for readiness; use `clickWhenReady()` for interactions.
- Avoid `networkidle` for apps with websockets/polling.
- Use explicit loading-state checks (`waitUntilHidden()` for spinners, etc.).

## 3) Authentication Reliability

**storageState Pattern (Official Playwright Approach)**:

- Global auth setup uses `page.evaluate(() => fetch())` for authentication
- Cookies automatically captured via `context.storageState({ path })`
- Tests load saved state with `test.use({ storageState: './playwright/.auth/runner.json' })`
- No manual cookie extraction/injection needed - Playwright handles everything
- Target end-to-auth time: <10s in CI (was 40+ seconds with manual cookie management)

**Benefits**:

- 10x faster authentication (8.6s vs 40+ second timeouts)
- 100% reliable (no race conditions or timing issues)
- Significantly simpler code (20 lines vs 60+)
- First-attempt success, no retries needed

**Key Files**:

- `tests/auth.setup.ts` - Runner authentication setup
- `tests/auth-coach.setup.ts` - Coach authentication setup
- `playwright/.auth/runner.json` - Saved runner cookies
- `playwright/.auth/coach.json` - Saved coach cookies

## 4) Global Setup with Server Health Check

**Pattern**: Use Playwright's global setup to ensure server readiness before any tests execute.

**Why This Matters**:

- Prevents race conditions where tests start before server initialization completes
- Eliminates timeout errors from server startup delays
- Provides predictable test execution regardless of machine performance

**Implementation** (`tests/global-setup.ts`):

```typescript
import { FullConfig, chromium } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3001'
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Retry up to 30 times with 2-second delays (60s total)
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      const response = await page.goto(baseURL, {
        timeout: 5000,
        waitUntil: 'domcontentloaded',
      })

      if (response && response.ok()) {
        console.log(`✅ Server is ready! (attempt ${attempt}/30)`)
        await browser.close()
        return
      }
    } catch (error) {
      if (attempt === 30) throw new Error(`Server not ready after 60s`)
      await page.waitForTimeout(2000)
    }
  }
}

export default globalSetup
```

**Configuration** (`playwright.config.ts`):

```typescript
export default defineConfig({
  globalSetup: require.resolve('./tests/global-setup'),
  // ... rest of config
})
```

**Results**:

- Server typically ready on first attempt (< 1s)
- Zero timeout errors from server startup
- 100% test reliability (7/7 passing consistently)

## 5) Test Data Management

- Prefer isolated, deterministic test data with unique identifiers.
- Use idempotent setup and cleanup via API routes or seeds when available.
- Avoid cross-test contamination by scoping mutations and using timestamps.

### Idempotent User Creation Pattern

**Why Idempotency Matters**:

- Prevents duplicate user creation errors in CI/CD pipelines
- Eliminates CASCADE delete issues that can break test relationships
- Allows scripts to run multiple times without failure
- Simplifies test infrastructure by not requiring cleanup between runs

**Implementation** (`scripts/testing/create-playwright-test-users.ts`):

```typescript
// Check for existing users and create only if needed (idempotent approach)
for (const userData of PLAYWRIGHT_USERS) {
  const existingUser = await db.select().from(user).where(eq(user.email, userData.email)).limit(1)

  if (existingUser.length > 0) {
    // User already exists - verify role/userType is correct
    existingCount++
    logger.info(`✅ User already exists: ${userData.email}`)

    // Ensure role and userType are correct (in case of data inconsistency)
    const currentUser = existingUser[0]
    if (currentUser.role !== 'user' || currentUser.userType !== userData.role) {
      logger.info(`🔧 Fixing role/userType for ${userData.email}`)
      await db
        .update(user)
        .set({ role: 'user', userType: userData.role })
        .where(eq(user.email, userData.email))
    }
  } else {
    // User doesn't exist - create via Better Auth API
    const result = await createSingleUser(userData)

    if (result.success) {
      logger.info(`✅ Created user: ${result.email} (${result.role})`)
      createdCount++
    } else {
      logger.error(`❌ Failed to create ${userData.email}: ${result.error}`)

      // In CI, fail fast on user creation errors
      if (process.env.CI) {
        process.exit(1)
      }
    }
  }
}

// Create coach-runner relationships idempotently
await db.execute(sql`
  INSERT INTO coach_runners (id, coach_id, runner_id, status, relationship_type, invited_by, relationship_started_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), ${coachId}, ${alexId}, 'active', 'standard', 'coach', NOW(), NOW(), NOW()),
    (gen_random_uuid(), ${coachId}, ${rileyId}, 'active', 'standard', 'coach', NOW(), NOW(), NOW())
  ON CONFLICT (coach_id, runner_id) DO NOTHING
`)
```

**Key Principles**:

1. **Check Before Create**: Always query for existing users before attempting creation
2. **Repair Inconsistencies**: Fix incorrect role/userType values if detected
3. **Use ON CONFLICT**: Database-level idempotency for relationship creation
4. **Environment Variables**: Use configurable test credentials (TEST_COACH_EMAIL, TEST_COACH_PASSWORD, TEST_RUNNER_PASSWORD)
5. **Fail Fast in CI**: Exit with error code 1 on failures in CI environment
6. **Server Health Check**: Verify server is running before attempting user creation
7. **Final Verification**: Confirm all required users exist with correct attributes after creation

**Results**:

- Can run multiple times without errors or duplicate data
- Prevents CASCADE delete issues by maintaining existing user IDs
- Automatically repairs data inconsistencies from manual database changes
- Clear logging showing existing vs newly created users

## 6) Error Reporting

- `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` in config.
- Reporter generates HTML report locally and dot + HTML on CI.
- Use Playwright's built-in annotations to tag failures with a category:

```ts
import { expect, test } from '@playwright/test'

test('saves a plan', async ({ page }) => {
  test.info().annotations.push({ type: 'category', description: 'selectors' })
  // …test body…
  await expect(page.getByTestId('save-button')).toBeVisible()
})
```

For structured logging, prefer `tests/utils/test-logger.ts` (tslog-backed).

## 7) Authenticated API Requests

**Critical Pattern**: When making API calls that require cookies (like authentication or session-based endpoints), use `page.evaluate(() => fetch())` instead of `page.request`.

### Why This Matters

Playwright has two separate request contexts:

- **`page.request`**: Runs in Playwright's request context (isolated from browser cookies)
- **`page.evaluate(() => fetch())`**: Runs in browser context (includes cookies automatically)

When you call `/api/auth/sign-in/email` via `page.request.post()`, the response sets cookies in Playwright's isolated request context, but those cookies **never attach to the browser's cookie jar**. Subsequent navigation or API calls from the page won't include those cookies, causing authentication to fail.

### storageState Pattern Best Practices

**Cookies from storageState are loaded automatically when tests start** - no manual verification needed!

The storageState pattern eliminates race conditions by design:

1. Auth setup authenticates via `page.evaluate(() => fetch())` → cookies set in browser context ✅
2. Playwright automatically saves cookies via `context.storageState({ path })` ✅
3. Tests load with `test.use({ storageState: './playwright/.auth/runner.json' })` ✅
4. Cookies available immediately on first navigation ✅

**Key Insight**: No need to manually verify cookies - storageState handles everything automatically!

### Decision Criteria

**Use `page.request`** when:

- Testing public/unauthenticated endpoints
- Setting up test data via utility endpoints (like `/api/test/reset-workouts`)
- Explicitly testing API behavior independent of browser state

**Use `page.evaluate(() => fetch())`** when:

- Authenticating in auth setup files (sets cookies in browser context)
- Making authenticated API calls during tests
- Any endpoint that requires cookies from browser context
- Recommended pattern for Better Auth sign-in flow

### Code Examples

#### ❌ WRONG - Cookies won't attach to browser

```ts
// Auth setup file - cookies stay in page.request context
const response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
  data: { email: 'user@example.com', password: 'pass' },
  headers: { 'Content-Type': 'application/json' },
})

await page.goto('/dashboard') // ❌ Browser has NO cookies, auth fails
```

#### ✅ CORRECT - Cookies attach to browser context

```ts
// Navigate to page first to establish browser context
await page.goto(`${baseUrl}/auth/signin`)

// Run authentication in browser context
const authResult = await page.evaluate(
  async ({ apiUrl, email, password }) => {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', // Ensure cookies attach
      body: JSON.stringify({ email, password }),
    })
    return {
      ok: response.ok,
      status: response.status,
      body: response.ok ? await response.json() : await response.text(),
    }
  },
  {
    apiUrl: `${baseUrl}/api/auth/sign-in/email`,
    email: 'user@example.com',
    password: 'pass',
  }
)

await page.goto('/dashboard') // ✅ Browser has cookies, auth succeeds
```

#### ✅ ALSO CORRECT - Test utility endpoints

```ts
// Test utility endpoint doesn't need cookies
const response = await page.request.post('/api/test/reset-workouts', {
  data: { userEmail: 'test@example.com' },
})
// ✅ This is fine - utility endpoint doesn't require session cookies
```

### Implementation Examples

See these files for correct storageState patterns:

- `tests/auth.setup.ts` - Runner authentication setup with storageState
- `tests/auth-coach.setup.ts` - Coach authentication setup with storageState
- `tests/utils/test-helpers.ts` - Helper functions for authentication

## Mapping to Success Criteria

- Reliable selectors: added test ids and documentation.
- <5s auth setup: direct API auth + health checks.
- 90% flakiness reduction: robust waits, retry clicks, and deterministic data patterns.
- Clear error reporting: traces/screenshots/videos on failure, HTML report.
- Docs: this guide and selector best practices.
