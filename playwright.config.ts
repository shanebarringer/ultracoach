import { defineConfig, devices } from '@playwright/test'
import { randomBytes } from 'crypto'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel - SAFE: Each file gets its own worker process */
  fullyParallel: false, // Keep false - tests within files still run sequentially (database safety)
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Enable file-level parallelization for faster execution */
  workers: process.env.CI ? 2 : 1, // Reduce workers for CI stability
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['github'], ['html'], ['blob']] : 'html',
  /* Global timeout for each test */
  timeout: process.env.CI ? 120000 : 60000, // CI: 2min, Local: 1min for compilation
  /* Global timeout for expect assertions */
  expect: {
    timeout: process.env.CI ? 60000 : 30000, // CI: 1min, Local: 30s for loading
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

    /* Set longer action timeout for CI compilation delays */
    actionTimeout: process.env.CI ? 30000 : 15000, // CI: 30s, Local: 15s

    /* Set longer navigation timeout for CI compilation delays */
    navigationTimeout: process.env.CI ? 60000 : 30000, // CI: 60s, Local: 30s

    /* Ensure session persistence in CI environment */
    storageState: undefined, // Will be overridden by projects that need auth
    acceptDownloads: true,
    ignoreHTTPSErrors: false,
  },

  /* Setup projects - run authentication before other tests */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Main test project with authentication
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved authentication state
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'], // Wait for auth setup to complete
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
    timeout: process.env.CI ? 30000 : 5000, // Longer timeout for CI
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
