import { defineConfig, devices } from '@playwright/test'
import { randomBytes } from 'crypto'

// Derive a single base URL for Playwright and the dev server to avoid drift
const rawBaseURL =
  process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3001'

let resolvedBaseURL: string = rawBaseURL
let resolvedPort: number

try {
  const url = new URL(rawBaseURL)
  const hasExplicitPort = url.port !== ''

  // Use local convention 3001 when no port is provided for http
  resolvedPort = hasExplicitPort ? Number(url.port) : url.protocol === 'https:' ? 443 : 3001

  // Normalize HTTPS to HTTP for local dev server (Next dev has no TLS)
  if (!process.env.CI && url.protocol === 'https:') {
    url.protocol = 'http:'
    // If no explicit port was provided originally, prefer 3001 over 443 for local default
    if (!hasExplicitPort) resolvedPort = 3001
  }

  // Safety: in local mode, refuse non-local hosts unless explicitly allowed
  const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
  if (
    !process.env.CI &&
    !localHosts.has(url.hostname) &&
    process.env.PLAYWRIGHT_ALLOW_NON_LOCAL !== 'true'
  ) {
    throw new Error(
      `Refusing to run E2E against non-local host in local mode: ${url.hostname}. ` +
        `Set PLAYWRIGHT_TEST_BASE_URL/E2E_BASE_URL to a localhost URL, or set ` +
        `PLAYWRIGHT_ALLOW_NON_LOCAL=true to bypass.`
    )
  }

  // Calculate defaultPort AFTER protocol normalization to avoid mismatch
  const defaultPort = url.protocol === 'https:' ? 443 : 80

  // Ensure baseURL points to origin and includes the actual port we will serve on
  if (url.pathname !== '/' || url.search || url.hash) {
    url.pathname = '/'
    url.search = ''
    url.hash = ''
  }
  if (!hasExplicitPort || resolvedPort !== defaultPort) {
    url.port = String(resolvedPort)
  }
  // Normalize trailing slash
  resolvedBaseURL = url.toString().replace(/\/$/, '')
} catch (err) {
  throw new Error(
    `Invalid PLAYWRIGHT_TEST_BASE_URL/E2E_BASE_URL: "${rawBaseURL}". ` +
      `Provide an absolute URL like "http://localhost:3001". ` +
      `Underlying error: ${(err as Error).message}`
  )
}

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
  // Reporters: keep concise output in CI but always generate an HTML report for debugging
  reporter: process.env.CI ? [['dot'], ['html']] : [['list'], ['html']],
  /* Global timeout for each test */
  timeout: process.env.CI ? 60000 : 30000, // CI: 60s (allows health check + session verification), Local: 30s
  /* Global timeout for expect assertions */
  expect: {
    timeout: process.env.CI ? 30000 : 15000, // CI: 30s (reduced from 90s), Local: 15s
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: resolvedBaseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    /* Collect trace for any failed test to aid diagnosis */
    trace: 'retain-on-failure',

    /* Record video for failed tests */
    video: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Set longer action timeout for CI compilation delays */
    actionTimeout: process.env.CI ? 30000 : 15000, // CI: 30s (reduced from 45s), Local: 15s

    /* Set longer navigation timeout for CI compilation delays */
    navigationTimeout: process.env.CI ? 45000 : 30000, // CI: 45s (reduced from 90s), Local: 30s

    /* Ensure session persistence in CI environment */
    storageState: undefined, // Will be overridden by projects that need auth
    acceptDownloads: true,
    ignoreHTTPSErrors: false,

    /* Extra headers to ensure proper auth behavior */
    extraHTTPHeaders: {
      // Ensure consistent user agent for cookie handling
      'User-Agent': 'Mozilla/5.0 (compatible; PlaywrightTest/1.0)',
    },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup-coach'], // Wait for coach auth setup to complete
    },

    // Coach-Runner Relationship tests - Coach Perspective
    {
      name: 'chromium-relationships-coach',
      testMatch: /coach-runner-relationships\.spec\.ts/,
      grep: /Coach Perspective/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state for coach tests
        storageState: './playwright/.auth/coach.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup-coach'], // Wait for coach auth setup to complete
    },

    // Coach-Runner Relationship tests - Runner Perspective
    {
      name: 'chromium-relationships-runner',
      testMatch: /coach-runner-relationships\.spec\.ts/,
      grep: /Runner Perspective/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state for runner tests
        storageState: './playwright/.auth/runner.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup'], // Wait for runner auth setup to complete
    },

    // Coach-Runner Relationship tests - Other tests
    {
      name: 'chromium-relationships-other',
      testMatch: /coach-runner-relationships\.spec\.ts/,
      grepInvert: /Coach Perspective|Runner Perspective/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state by default
        storageState: './playwright/.auth/runner.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup'], // Wait for runner auth setup to complete
    },

    // Workout management tests - Coach tests
    {
      name: 'chromium-workout-management-coach',
      testMatch: /workout-management\.spec\.ts/,
      grep: /Coach Workout Management/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state for coach workout tests
        storageState: './playwright/.auth/coach.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup-coach'], // Wait for coach auth setup to complete
    },

    // Workout management tests - Runner tests
    {
      name: 'chromium-workout-management-runner',
      testMatch: /workout-management\.spec\.ts/,
      grep: /Runner Workout Management/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state for runner workout tests
        storageState: './playwright/.auth/runner.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup'], // Wait for runner auth setup to complete
    },

    // Garmin integration tests - Runner tests
    {
      name: 'chromium-garmin-runner',
      testMatch: /garmin-integration\.spec\.ts/,
      grep: /Feature Flag|UI Components|Connection Flow|Accessibility/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state for Garmin tests
        storageState: './playwright/.auth/runner.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup'], // Wait for runner auth setup to complete
    },

    // Garmin integration tests - Coach tests
    {
      name: 'chromium-garmin-coach',
      testMatch: /garmin-integration\.spec\.ts/,
      grep: /Coach Dashboard/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved coach authentication state for coach tests
        storageState: './playwright/.auth/coach.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup-coach'], // Wait for coach auth setup to complete
    },

    // Workout atoms tests (runner authenticated)
    {
      name: 'chromium-workout-atoms',
      testMatch: /workout-atoms\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: './playwright/.auth/runner.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup'],
    },

    // Single route tests (runner authenticated)
    {
      name: 'chromium-single-route',
      testMatch: /single-route-test\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: './playwright/.auth/runner.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
      },
      dependencies: ['setup'],
    },

    // Other authenticated tests (use runner by default)
    {
      name: 'chromium-other',
      testMatch: '**/*.spec.ts',
      // Ensure these specs never run in this catch-all project
      testIgnore: [
        '**/coach-runner-relationships.spec.ts',
        '**/workout-management.spec.ts',
        '**/garmin-integration.spec.ts',
        '**/workout-atoms.spec.ts',
        '**/single-route-test.spec.ts',
      ],
      grepInvert:
        /auth|dashboard|race-import|training-plan-management|chat-messaging|coach-runner-relationships|workout-management|garmin-integration/,
      use: {
        ...devices['Desktop Chrome'],
        // Use saved runner authentication state
        storageState: './playwright/.auth/runner.json',
        launchOptions: {
          args: ['--disable-extensions'],
        },
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
    ? undefined // CI environment already has server running
    : {
        // Launch Next.js dev server via the repository's script and override the port
        // Preserve any future behavior added to the dev script while ensuring port alignment
        command: `pnpm run dev -- -p ${resolvedPort}`,
        url: resolvedBaseURL,
        reuseExistingServer: true, // Use existing server if already running
        timeout: 120000, // Give dev server 2 minutes to start
        env: {
          NODE_ENV: 'development', // Use development mode for local testing
          // Load test environment variables from environment
          DATABASE_URL:
            process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
          BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || randomBytes(32).toString('hex'),
          BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || resolvedBaseURL,
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || resolvedBaseURL,
          NEXTAUTH_URL: process.env.NEXTAUTH_URL || resolvedBaseURL,
          PORT: String(resolvedPort),
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          RESEND_API_KEY: process.env.RESEND_API_KEY || '',
        },
      },
})
