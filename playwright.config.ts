import { defineConfig, devices } from '@playwright/test'
import { randomBytes } from 'crypto'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Exclude manual and debug test files from CI runs */
  testIgnore: ['**/*.manual.ts', '**/debug.*', '**/manual-*'],
  /* Run tests in files in parallel - SAFE: Each file gets its own worker process */
  fullyParallel: false, // Keep false - tests within files still run sequentially (database safety)
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Fail on flaky tests in CI (Context7 best practice) */
  failOnFlakyTests: !!process.env.CI,
  /* Limit failures to save CI resources */
  maxFailures: process.env.CI ? 5 : undefined,
  /* Reduce log verbosity in CI */
  quiet: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Limited workers for CI balance of speed vs stability */
  workers: process.env.CI ? 2 : undefined, // CI: 2 workers for better performance, Local: auto
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['dot'], ['html']] : 'html', // Dot reporter for concise CI output
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
    // Setup project for runner authentication
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      timeout: 180000, // Increased timeout for CI stability (3 minutes)
    },

    // Setup project for coach authentication
    {
      name: 'setup-coach',
      testMatch: /auth-coach\.setup\.ts/,
      timeout: 180000, // Increased timeout for CI stability (3 minutes)
    },

    // Unauthenticated tests (auth flows, landing page)
    {
      name: 'chromium-unauth',
      testMatch: ['**/auth*.spec.ts', '**/e2e/auth*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        // No storage state - test authentication flows from scratch
      },
      // No dependencies - unauth flows should start fresh without pre-auth state
    },

    // Authenticated coach tests for race import
    {
      name: 'chromium',
      testMatch: /race-import\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state
        storageState: './playwright/.auth/coach.json',
      },
      dependencies: ['setup-coach'], // Ensure coach auth setup completes first
    },

    // Authenticated runner dashboard tests
    {
      name: 'chromium-runner',
      testMatch: /dashboard\.spec\.ts/,
      grep: /Runner Dashboard|Navigation Tests/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'], // Wait for auth setup to complete
    },

    // Authenticated coach tests
    {
      name: 'chromium-coach',
      testMatch: /dashboard\.spec\.ts/,
      grep: /Coach Dashboard/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state
        storageState: './playwright/.auth/coach.json',
      },
      dependencies: ['setup-coach'], // Wait for coach auth setup to complete
    },

    // Other authenticated tests (use runner by default)
    {
      name: 'chromium-other',
      testIgnore: /\/(auth(?:-flows)?|dashboard|race-import)\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state
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
  webServer: process.env.CI
    ? undefined
    : {
        command: 'echo "Development server already running on port 3001"',
        url: 'http://localhost:3001',
        reuseExistingServer: true, // Always reuse existing server
        timeout: 5000,
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
