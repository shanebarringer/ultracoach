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
  /* Temporarily disable fail on flaky tests until all tests are stabilized */
  failOnFlakyTests: false, // Changed from !!process.env.CI to allow flaky tests temporarily
  /* Limit failures to save CI resources */
  maxFailures: process.env.CI ? 5 : undefined,
  /* Reduce log verbosity in CI */
  quiet: !!process.env.CI,
  /* Increase retries for CI stability */
  retries: process.env.CI ? 3 : 0,
  /* Limited workers for CI balance of speed vs stability */
  workers: process.env.CI ? 2 : undefined, // CI: 2 workers for better performance, Local: auto
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['dot'], ['html']] : 'html', // Dot reporter for concise CI output
  /* Global timeout for each test */
  timeout: process.env.CI ? 180000 : 60000, // CI: 3min (increased from 2min), Local: 1min for compilation
  /* Global timeout for expect assertions */
  expect: {
    timeout: process.env.CI ? 90000 : 30000, // CI: 1.5min (increased from 1min), Local: 30s for loading
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001',

    /* Collect traces: keep on retry locally; retain on first failure in CI for faster debugging */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',

    /* Record video for failed tests */
    video: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Set longer action timeout for CI compilation delays */
    actionTimeout: process.env.CI ? 45000 : 15000, // CI: 45s (increased from 30s), Local: 15s

    /* Set longer navigation timeout for CI compilation delays */
    navigationTimeout: process.env.CI ? 90000 : 30000, // CI: 90s (increased from 60s), Local: 30s

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
      timeout: 300000, // Increased timeout for CI stability (5 minutes)
      retries: 3, // Add retries for auth setup
    },

    // Setup project for coach authentication
    {
      name: 'setup-coach',
      testMatch: /auth-coach\.setup\.ts/,
      timeout: 300000, // Increased timeout for CI stability (5 minutes)
      retries: 3, // Add retries for auth setup
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
      name: 'chromium-race-import-coach',
      testMatch: /race-import\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state
        storageState: './playwright/.auth/coach.json',
      },
      dependencies: ['setup-coach'], // Ensure coach auth setup completes first
    },

    // Runner tests for race import (verify no access)
    {
      name: 'chromium-race-import-runner',
      testMatch: /race-import\.spec\.ts/,
      grep: /should not allow runners to import/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state
        storageState: './playwright/.auth/runner.json',
      },
      dependencies: ['setup'], // Ensure runner auth setup completes first
    },

    // Authenticated runner dashboard tests
    {
      name: 'chromium-runner',
      testMatch: /dashboard\.spec\.ts/,
      grep: /Runner Dashboard|Navigation Tests/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state
        storageState: './playwright/.auth/runner.json',
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

    // Training plan management tests (need coach auth)
    {
      name: 'chromium-training-plans',
      testMatch: /training-plan-management\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state for training plans
        storageState: './playwright/.auth/coach.json',
      },
      dependencies: ['setup-coach'], // Wait for coach auth setup to complete
    },

    // Chat messaging tests - Coach tests
    {
      name: 'chromium-messaging-coach',
      testMatch: /chat-messaging\.spec\.ts/,
      grep: /Coach Tests/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state for coach tests
        storageState: './playwright/.auth/coach.json',
      },
      dependencies: ['setup-coach'], // Wait for coach auth setup to complete
    },

    // Chat messaging tests - Runner tests
    {
      name: 'chromium-messaging-runner',
      testMatch: /chat-messaging\.spec\.ts/,
      grep: /Runner Tests/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state for runner tests
        storageState: './playwright/.auth/runner.json',
      },
      dependencies: ['setup'], // Wait for runner auth setup to complete
    },

    // Chat messaging tests - Other tests
    {
      name: 'chromium-messaging-other',
      testMatch: /chat-messaging\.spec\.ts/,
      grepInvert: /Coach Tests|Runner Tests/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state by default
        storageState: './playwright/.auth/coach.json',
      },
      dependencies: ['setup-coach'], // Wait for coach auth setup to complete
    },

    // Other authenticated tests (use runner by default)
    {
      name: 'chromium-other',
      testMatch: '**/*.spec.ts',
      grepInvert: /auth|dashboard|race-import|training-plan-management|chat-messaging/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state
        storageState: './playwright/.auth/runner.json',
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
  // Allow environment override to skip waiting for the dev server
  webServer: (process.env.CI ? false : process.env.PLAYWRIGHT_SKIP_WEBSERVER_WAIT !== 'true')
    ? {
        command: 'pnpm dev',
        url: 'http://localhost:3001',
        reuseExistingServer: true, // Use existing server if already running
        timeout: 120000, // Give dev server 2 minutes to start
        port: 3001,
        env: {
          NODE_ENV: 'development', // Use development mode for local testing
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
        },
      }
    : undefined,
})
