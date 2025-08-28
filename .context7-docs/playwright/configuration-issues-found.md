# Playwright Configuration Issues Identified

## Critical Issues Found

### 0. Hydration Mismatch Error (CRITICAL)
**Issue**: React hydration mismatch causing server/client rendering differences
**Error**: `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties`
**Root Cause**: `data-insp-path` attributes differ between server and client rendering

**Problem Details**:
- Server renders: `data-insp-path={null}`
- Client renders: `data-insp-path="src/app/auth/signin/page.tsx:..."`
- This affects ALL components with inspection paths
- Causes unstable rendering that can break Playwright interactions

**Solutions**:
```typescript
// Option 1: Disable inspector in test environment
// next.config.js
const nextConfig = {
  experimental: {
    instrumentationHook: process.env.NODE_ENV !== 'test',
  },
}

// Option 2: Add hydration boundary
export default function SignIn() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  if (!isClient) {
    return <SignInSkeleton />
  }
  
  return <SignInForm />
}

// Option 3: Suppress hydration warnings in test
// Add to test setup
if (process.env.NODE_ENV === 'test') {
  const originalError = console.error
  console.error = (...args) => {
    if (args[0]?.includes?.('hydration')) return
    originalError(...args)
  }
}
```

### 1. Portal Interception Problem
**Issue**: `<nextjs-portal>` intercepts pointer events preventing button clicks
**Error**: `TimeoutError: locator.click: Timeout 5000ms exceeded`
**Root Cause**: Next.js portal components (likely modals, dropdowns, or overlays) are blocking click interactions

**Solutions**:
```typescript
// Option 1: Force click
await page.getByRole('button', { name: 'Begin Your Expedition' }).click({ force: true });

// Option 2: Use keyboard interaction
await page.getByRole('button', { name: 'Begin Your Expedition' }).press('Enter');

// Option 3: Wait for portal to clear
await page.waitForFunction(() => !document.querySelector('nextjs-portal'));
```

### 2. Timeout Configuration Issues
**Current Timeouts** (Too Aggressive):
```typescript
timeout: 15000,        // 15s - too short for Next.js compilation
actionTimeout: 5000,   // 5s - too short for network requests
navigationTimeout: 8000, // 8s - too short for dashboard loading
```

**Recommended Timeouts**:
```typescript
timeout: 30000,        // 30s for complex operations
actionTimeout: 10000,  // 10s for actions with network requests
navigationTimeout: 15000, // 15s for Next.js compilation + navigation
expect: { timeout: 15000 } // 15s for dynamic content loading
```

### 3. Authentication Flow Problems
**Current Issues**:
- Per-test authentication (slow, unreliable)
- No state reuse between tests
- Portal interference with form submission
- Long compilation times for dashboard endpoints

**Better Auth Setup Pattern**:
```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate as runner', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', 'alex.rivera@ultracoach.dev');
  await page.fill('input[type="password"]', 'RunnerPass2025!');
  
  // Handle portal interference
  await page.keyboard.press('Tab'); // Focus the button
  await page.keyboard.press('Enter'); // Submit via keyboard
  
  // Wait for successful authentication
  await page.waitForURL(/\/dashboard\/runner/, { timeout: 20000 });
  
  // Save authentication state
  await page.context().storageState({ 
    path: 'playwright/.auth/runner.json' 
  });
});

setup('authenticate as coach', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', 'sarah@ultracoach.dev');
  await page.fill('input[type="password"]', 'UltraCoach2025!');
  
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  
  await page.waitForURL(/\/dashboard\/coach/, { timeout: 20000 });
  
  await page.context().storageState({ 
    path: 'playwright/.auth/coach.json' 
  });
});
```

### 4. CI Configuration Problems
**Current CI Issues**:
```yaml
# Current approach - problematic
- name: Start Next.js app in development mode
  run: |
    pnpm dev &
    echo $! > .next_pid
```

**Problems**:
- Manual process management with PID files
- Race conditions with server startup
- Complex curl-based API pre-warming
- Manual process killing in cleanup

**Recommended CI Configuration**:
```typescript
// playwright.config.ts
export default defineConfig({
  webServer: {
    command: process.env.CI ? 'pnpm start' : 'echo "Using existing dev server"',
    url: 'http://localhost:3001',
    timeout: 120000, // 2 minutes for Next.js build + start
    reuseExistingServer: !process.env.CI,
  },
  
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
});
```

### 5. Test Organization Issues
**Current Structure** (Problematic):
```
tests/
└── auth.spec.ts  # All tests in one file
```

**Recommended Structure**:
```
tests/
├── auth.setup.ts           # Authentication setup
├── global-setup.ts         # Database & API setup
├── global-teardown.ts      # Cleanup
├── auth/
│   ├── signin.spec.ts      # Sign-in tests
│   └── signup.spec.ts      # Sign-up tests
├── dashboard/
│   ├── coach.spec.ts       # Coach dashboard tests
│   └── runner.spec.ts      # Runner dashboard tests
└── fixtures/
    ├── coach.json          # Coach auth state
    └── runner.json         # Runner auth state
```

### 6. Database State Management
**Current Issues**:
- Shared database state between tests
- No transaction isolation
- Race conditions with concurrent tests

**Recommended Approach**:
```typescript
// global-setup.ts
export default async function globalSetup() {
  // Set up test database
  const { db } = await import('../src/lib/database');
  
  // Run migrations
  await runMigrations();
  
  // Create test users via Better Auth API
  await createTestUsers();
}

// Each test file
test.beforeEach(async ({ page }) => {
  // Start database transaction
  await page.evaluate(() => window.__DB_TRANSACTION_START__?.());
});

test.afterEach(async ({ page }) => {
  // Rollback transaction
  await page.evaluate(() => window.__DB_TRANSACTION_ROLLBACK__?.());
});
```

## Immediate Actions Required

1. **Fix Portal Interference**: Use keyboard navigation or force clicks
2. **Increase Timeouts**: Realistic timeouts for Next.js compilation
3. **Implement Setup Projects**: Authentication state reuse
4. **Fix CI WebServer**: Use Playwright's webServer instead of manual process management
5. **Add Global Setup**: Database and API initialization
6. **Organize Tests**: Split by feature with proper structure

## Next Steps

1. Create setup projects for authentication
2. Implement global setup/teardown
3. Fix timeout configurations
4. Update CI to use webServer pattern
5. Add proper test isolation with transactions