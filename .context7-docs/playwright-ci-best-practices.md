# Playwright CI Best Practices

## Key CI Configuration Recommendations

### 1. Sequential Workers for CI Stability
```js
// playwright.config.js
export default defineConfig({
  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,
});
```

### 2. Enable Traces for Failed Tests Only
```js
export default defineConfig({
  retries: 1,
  use: {
    trace: 'on-first-retry', // Record traces only for retries
  },
});
```

### 3. Install Only Necessary Browsers
```bash
# More efficient for CI - install only Chromium
npx playwright install chromium --with-deps

# Instead of all browsers
npx playwright install --with-deps
```

### 4. CI-Specific Configuration
```js
export default defineConfig({
  forbidOnly: !!process.env.CI, // Prevent .only tests in CI
  failOnFlakyTests: !!process.env.CI, // Fail on flaky tests
  maxFailures: process.env.CI ? 10 : undefined, // Limit failures
  quiet: !!process.env.CI, // Reduce log verbosity
});
```

### 5. Recommended GitHub Actions Setup
```yml
- name: Install dependencies
  run: npm ci
- name: Install Playwright Browsers
  run: npx playwright install chromium --with-deps
- name: Run Playwright tests
  run: npx playwright test
- uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

### 6. Avoid Docker Containers for Better Performance
Docker containers can cause networking and permission issues. Run directly on ubuntu-latest:
```yml
runs-on: ubuntu-latest
# Remove container configuration for better reliability
```

### 7. Proper Test Isolation
- Each test gets its own browser context
- Use `beforeEach` for setup that needs to run before each test
- Avoid dependencies between tests

### 8. Application Startup Best Practices
- Start application in background with explicit port
- Add comprehensive health checks with retries
- Include proper logging and debugging for CI failures
- Use timeouts to prevent hanging

### 9. CI-Specific Debugging
```bash
# Enable traces for debugging CI failures
npx playwright test --trace on

# Limit failures to save resources
npx playwright test --max-failures=10

# Use dot reporter for concise output
npx playwright test --reporter=dot
```

### 10. Artifact Management
- Upload traces and reports only on failure to save space
- Set appropriate retention periods (7-30 days)
- Upload test-results/ directory for debugging

## Common CI Issues to Avoid

1. **Parallel execution conflicts** - Use `workers: 1` in CI
2. **Container networking issues** - Run directly on ubuntu-latest
3. **Missing browser dependencies** - Always use `--with-deps`
4. **Flaky third-party dependencies** - Mock external APIs
5. **Missing application health checks** - Wait for app readiness
6. **Excessive logging** - Use `quiet: true` in CI
7. **Resource exhaustion** - Set `maxFailures` limit

## Test Writing Best Practices

### Use Web-First Assertions
```js
// Good - auto-waits for condition
await expect(page.getByText('welcome')).toBeVisible();

// Avoid - checks immediately
expect(await page.getByText('welcome').isVisible()).toBe(true);
```

### Proper Locator Selection
```js
// Preferred - role-based locators
page.getByRole('button', { name: 'Submit' })

// Good - test ID locators
page.getByTestId('submit-button')

// Avoid - CSS selectors
page.locator('.btn.btn-primary')
```

### Test Isolation with beforeEach
```js
test.beforeEach(async ({ page }) => {
  // Reset state before each test
  await page.goto('/dashboard');
  // Any other setup needed
});
```