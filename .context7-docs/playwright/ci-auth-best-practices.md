# Playwright CI Authentication Best Practices

## Key Learnings from UltraCoach CI Failures

### 1. Avoid `waitForLoadState('networkidle')`
**Problem**: Causes CI timeouts and hangs, especially with polling or real-time features.
**Solution**: Use specific wait conditions like `waitForURL()`, `waitForSelector()`, or `expect().toBeVisible()`.

```typescript
// ❌ BAD - Causes CI hangs
await page.waitForLoadState('networkidle', { timeout: 60000 })

// ✅ GOOD - Specific wait condition
await page.waitForURL(/\/dashboard/, { timeout: 30000 })
```

### 2. File Input Handling
**Problem**: File inputs are often hidden (`display: none`) which Playwright can't interact with using visibility checks.
**Solution**: Use `setInputFiles()` directly without checking visibility.

```typescript
// ❌ BAD - Will fail for hidden inputs
const fileInput = page.locator('input[type="file"]')
await expect(fileInput).toBeVisible()
await fileInput.setInputFiles(buffer)

// ✅ GOOD - Works with hidden inputs
const fileInput = page.locator('input[type="file"]')
await fileInput.setInputFiles({
  name: 'file.gpx',
  mimeType: 'application/gpx+xml',
  buffer,
})
```

### 3. Authentication State Management
**Problem**: Repeating login for each test is slow and can fail due to rate limiting.
**Solution**: Use setup projects with storage state to login once and reuse.

```typescript
// auth.setup.ts
setup('authenticate', async ({ page }) => {
  // Perform login
  await page.goto('/auth/signin')
  await page.fill('input[type="email"]', 'user@example.com')
  await page.fill('input[type="password"]', 'password')
  await page.click('button[type="submit"]')
  
  // Wait for authenticated state
  await page.waitForURL(/\/dashboard/)
  
  // Save storage state
  await page.context().storageState({ path: 'playwright/.auth/user.json' })
})

// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
})
```

### 4. Flexible Selectors for Dynamic Content
**Problem**: Strict selectors fail when content is dynamic or loading states vary.
**Solution**: Use multiple fallback selectors and try-catch blocks.

```typescript
// ✅ GOOD - Multiple fallback selectors
const dashboardIndicators = [
  page.locator('text=Dashboard'),
  page.locator('h1:has-text("Dashboard")'),
  page.locator('[data-testid="dashboard"]'),
]

let loaded = false
for (const indicator of dashboardIndicators) {
  try {
    await indicator.waitFor({ state: 'visible', timeout: 5000 })
    loaded = true
    break
  } catch {
    // Try next indicator
  }
}
```

### 5. API vs UI Authentication
**Problem**: UI login can be slow and flaky in CI.
**Solution**: Prefer API login when possible, with UI fallback.

```typescript
// ✅ GOOD - API-first authentication
setup('authenticate', async ({ page, request }) => {
  // Try API login first
  const response = await request.post('/api/auth/login', {
    data: { email: 'user@example.com', password: 'password' },
  })
  
  if (response.ok()) {
    // API login succeeded
    await page.goto('/dashboard')
  } else {
    // Fallback to UI login
    await page.goto('/auth/signin')
    // ... perform UI login
  }
  
  await page.context().storageState({ path: authFile })
})
```

### 6. CI-Specific Timeouts
**Problem**: CI environments are slower than local development.
**Solution**: Use generous timeouts for CI, especially for authentication.

```typescript
// ✅ GOOD - CI-aware timeouts
const timeout = process.env.CI ? 60000 : 30000
await page.waitForURL(/\/dashboard/, { timeout })
```

### 7. Test User Management
**Problem**: Hardcoded test users can conflict between parallel test runs.
**Solution**: Use environment variables or create unique users per test run.

```typescript
// ✅ GOOD - Environment-based test users
const TEST_USERS = {
  coach: {
    email: process.env.TEST_COACH_EMAIL || 'coach@test.com',
    password: process.env.TEST_COACH_PASSWORD || 'password',
  },
  runner: {
    email: process.env.TEST_RUNNER_EMAIL || 'runner@test.com',
    password: process.env.TEST_RUNNER_PASSWORD || 'password',
  },
}
```

### 8. Navigation Helpers
**Problem**: Direct navigation without proper waits causes flaky tests.
**Solution**: Create navigation helpers that ensure page is ready.

```typescript
// ✅ GOOD - Navigation helper
async function navigateToDashboard(page: Page, userType: string) {
  await page.goto(`/dashboard/${userType}`)
  await page.waitForURL(new RegExp(`/dashboard/${userType}`))
  
  // Wait for content to stabilize
  await page.waitForTimeout(1000)
}
```

## Common CI Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Timeout on networkidle | Test hangs for 60+ seconds | Remove networkidle, use specific waits |
| Authentication fails | Tests redirect to signin | Check test user creation, use storage state |
| File upload fails | "element not visible" | Use setInputFiles directly |
| Flaky selectors | Random test failures | Use flexible selectors with fallbacks |
| Slow test execution | Tests timeout in CI | Increase timeouts, use API login |
| Race conditions | Intermittent failures | Add explicit waits, avoid waitForTimeout |

## Debugging CI Failures

1. **Enable traces**: `npx playwright test --trace on`
2. **Add screenshots**: Capture on failure for debugging
3. **Use headed mode locally**: `npx playwright test --headed`
4. **Check CI logs**: Look for navigation URLs and error messages
5. **Verify test users**: Ensure users are created before tests run

## Example CI Configuration

```yaml
# .github/workflows/playwright.yml
- name: Create test users
  run: pnpm tsx scripts/create-test-users.ts
  env:
    TEST_COACH_PASSWORD: ${{ secrets.TEST_COACH_PASSWORD }}
    TEST_RUNNER_PASSWORD: ${{ secrets.TEST_RUNNER_PASSWORD }}

- name: Run Playwright tests
  run: npx playwright test
  env:
    CI: true
```