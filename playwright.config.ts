import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI and use fewer workers for better stability */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['github'], ['html']] : 'html',
  /* Global timeout for each test */
  timeout: 30000,
  /* Global timeout for expect assertions */
  expect: {
    timeout: 10000,
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
    actionTimeout: 10000,

    /* Set longer navigation timeout */
    navigationTimeout: 15000,
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
    command: process.env.CI ? 'pnpm dev' : 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start server
    env: {
      NODE_ENV: 'test',
      // Load test environment variables
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
      BETTER_AUTH_SECRET: '8a331d20825d0f81e658e4ce162d6cef854572c10f5106d9b2143aa13b50774b',
      BETTER_AUTH_URL: 'http://localhost:3001',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3001',
      PORT: '3001',
      NEXT_PUBLIC_SUPABASE_URL: 'https://ccnbzjpccmlribljugve.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_dgTQ49np8fz3PWFkIylwnQ_ddafgm_3',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret__NwMijRypyrKzVn_y2DP9g_o_5EyDZR',
      RESEND_API_KEY: '',
      NEXTAUTH_URL: 'http://localhost:3001',
      ...(process.env.CI &&
        {
          // CI-specific environment variables will be set by GitHub Actions
        }),
    },
  },
})
