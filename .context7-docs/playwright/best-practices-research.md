# Playwright Best Practices Research

## Authentication Patterns

### Setup Projects vs Per-Test Authentication

**Current Issue**: Our tests authenticate in each individual test using `loginAsUser()` helper function, which is slow and unreliable.

**Best Practice**: Use Playwright's setup projects to authenticate once and reuse authentication state.

```typescript
// playwright.config.ts - Setup projects
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    }
  ]
});

// tests/auth.setup.ts - One-time authentication
test('authenticate', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

**Our Current Approach Issues**:
- Authenticates in every single test (slow)
- No authentication state reuse
- Vulnerable to authentication timeouts
- Creates unnecessary load on auth system

## CI Configuration Patterns

### Database Setup Best Practices

**Current Issue**: Manual PostgreSQL service setup with shell script migrations.

**Best Practice**: Use Playwright's global setup for database operations.

```typescript
// global-setup.ts
async function globalSetup() {
  // Database setup
  await setupDatabase();
  // Start development server if needed
  await startDevServer();
}

export default globalSetup;
```

### API Pre-warming vs Global Setup

**Current Issue**: Pre-warming APIs in CI with curl commands and cookie parsing.

**Best Practice**: Use Playwright's request context for API pre-warming.

```typescript
// global-setup.ts
import { chromium } from '@playwright/test';

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Pre-warm APIs using Playwright's request context
  await context.request.post('/api/auth/sign-in/email', {
    data: { email: 'test@example.com', password: 'password' }
  });
  
  await context.request.get('/api/coach-runners');
  await browser.close();
}
```

## Timeout Configuration Issues

**Current Problem**: Our timeouts are too aggressive and cause flaky tests.

**Best Practice Analysis**:
- **Global timeout**: 30s (not 15s) for complex SPAs
- **Expect timeout**: 15s (not 5s) for dynamic content loading
- **Action timeout**: 10s (not 5s) for network-dependent actions
- **Navigation timeout**: 15s (not 8s) for Next.js compilation

```typescript
// Recommended timeout configuration
export default defineConfig({
  timeout: 30000,        // 30s for complex operations
  expect: {
    timeout: 15000,      // 15s for dynamic content
  },
  use: {
    actionTimeout: 10000,      // 10s for actions
    navigationTimeout: 15000,  // 15s for navigation
  }
});
```

## Test Organization Problems

**Current Issue**: All tests in one file (`tests/auth.spec.ts`) with mixed concerns.

**Best Practice**: Separate test files by feature with proper setup/teardown.

```
tests/
├── auth.setup.ts           # Authentication setup
├── auth/
│   ├── signin.spec.ts      # Sign-in specific tests
│   ├── signup.spec.ts      # Sign-up specific tests
│   └── logout.spec.ts      # Logout tests
├── dashboard/
│   ├── coach.spec.ts       # Coach dashboard tests
│   └── runner.spec.ts      # Runner dashboard tests
└── api/
    └── endpoints.spec.ts   # API endpoint tests
```

## GitHub Actions Workflow Issues

**Current Issues**:
1. Running `pnpm dev` in CI (blocks execution)
2. Manual process killing with PID files
3. Complex curl-based API pre-warming

**Best Practice**: Use Playwright's webServer configuration.

```typescript
// playwright.config.ts
export default defineConfig({
  webServer: process.env.CI ? {
    command: 'npm run start',
    url: 'http://localhost:3001',
    timeout: 60000,
    reuseExistingServer: false
  } : undefined
});
```

## Database State Management

**Current Issue**: Shared database state between tests causing flaky results.

**Best Practice**: Test isolation with database transactions or separate test databases.

```typescript
// Option 1: Database transactions (rollback after each test)
test.beforeEach(async () => {
  await db.query('BEGIN');
});

test.afterEach(async () => {
  await db.query('ROLLBACK');
});

// Option 2: Separate test database per worker
export default defineConfig({
  workers: 1, // Or use separate DBs per worker
  use: {
    baseURL: 'http://localhost:3001',
  }
});
```

## Key Recommendations for Our Setup

1. **Implement setup projects** for authentication state reuse
2. **Use global setup/teardown** instead of CI shell scripts
3. **Increase timeouts** to realistic values for Next.js apps
4. **Organize tests by feature** instead of single large file
5. **Use Playwright's webServer** instead of manual process management
6. **Implement proper test isolation** with database state management
7. **Use Playwright's request context** for API operations instead of curl

## Critical Issues to Address

1. **Authentication State**: Move from per-test login to setup project pattern
2. **Timeout Configuration**: Increase timeouts to handle Next.js compilation delays
3. **CI Process Management**: Replace manual `pnpm dev` + PID management with webServer config
4. **Test Organization**: Split large test file into focused feature tests
5. **Database Isolation**: Implement proper test state isolation