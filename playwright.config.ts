import { defineConfig, devices } from '@playwright/test'
import { randomBytes } from 'crypto'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false, // Disabled to prevent database contention
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI and use fewer workers for better stability */
  workers: 1, // Reduced to 1 worker to prevent database contention during tests
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['github'], ['html']] : 'html',
  /* Global timeout for each test */
  timeout: 60000, // Increased from 30s to 60s for database-heavy operations
  /* Global timeout for expect assertions */
  expect: {
    timeout: 15000, // Increased from 10s to 15s
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Record video for failed tests */
    video: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Set longer action timeout */
    actionTimeout: 15000, // Increased from 10s to 15s

    /* Set longer navigation timeout */
    navigationTimeout: 30000, // Increased from 15s to 30s for authentication redirects
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Temporarily disabled to reduce CI time and runner usage
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },

    // Safari/Edge testing disabled for now - focus on core browsers
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI
      ? 'echo "Server already started by CI"'
      : 'echo "Development server already running on port 3001"',
    url: 'http://localhost:3001',
    reuseExistingServer: true, // Always reuse existing server
    timeout: 5000, // Short timeout since we're reusing existing server
    env: {
      NODE_ENV: 'test',
      // Load test environment variables from environment
      DATABASE_URL:
        process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || randomBytes(32).toString('hex'),
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001',
      PORT: process.env.PORT || '3001',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      RESEND_API_KEY: process.env.RESEND_API_KEY || '',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001',
      ...(process.env.CI &&
        {
          // CI-specific environment variables will be set by GitHub Actions
        }),
    },
  },
})
