import { expect, test as setup } from '@playwright/test'
import path from 'path'

import { waitForAuthenticationSuccess } from './utils/suspense-helpers'
import { TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD } from './utils/test-helpers'
import { getTestLogger } from './utils/test-logger'

// Logger is created inside the test to avoid module-eval ESM issues

// Conditional fs import (typed) to avoid Vercel build issues
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node)
const fs: typeof import('node:fs') | null = isNode ? require('node:fs') : null

const authFile = path.join(__dirname, '../playwright/.auth/runner.json')

setup('authenticate @setup', async ({ page, context }) => {
  const logger = await getTestLogger('tests/auth.setup')
  logger.info('🔐 Starting runner authentication setup...')

  // Use consistent base URL across all environments
  const baseUrl =
    process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3001'
  logger.info(`🌐 Using base URL: ${baseUrl}`)

  // Navigate to signin page first
  await page.goto(`${baseUrl}/auth/signin`)
  logger.info('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Use API authentication for reliability (as recommended in Playwright docs)
  logger.info('🔑 Attempting API authentication...')
  const response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
    data: {
      email: TEST_RUNNER_EMAIL,
      password: TEST_RUNNER_PASSWORD,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok()) {
    const body = await response.text()
    const preview = body
      .slice(0, 300)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<redacted-email>')
    logger.error('Auth API failed', {
      status: response.status(),
      bodyPreview: preview,
    })
    throw new Error(`Authentication API failed with status ${response.status()}`)
  }

  logger.info('✅ Authentication API successful')

  // The API call should have set cookies, now navigate to dashboard and verify
  await page.goto(`${baseUrl}/dashboard/runner`)
  await waitForAuthenticationSuccess(page, 'runner', 15000)

  // Save storage state (includes cookies and localStorage automatically)
  await context.storageState({ path: authFile })
  logger.info(`💾 Saved authentication state to ${authFile}`)

  // Verify the storage state file was created and contains cookies
  try {
    if (fs) {
      const storageStateContent = fs.readFileSync(authFile, 'utf-8')
      const storageState = JSON.parse(storageStateContent)
      logger.info(`✅ Storage state file created with ${storageState.cookies?.length || 0} cookies`)

      if (storageState.cookies?.length > 0) {
        const authCookies = storageState.cookies.filter(
          cookie =>
            cookie.name.includes('better-auth') ||
            cookie.name.includes('session') ||
            cookie.name.includes('auth')
        )
        logger.info(`🍪 Found ${authCookies.length} auth-related cookies`)
      } else {
        logger.warn('⚠️ No cookies found in storage state!')
      }
    }
  } catch (error) {
    logger.error('❌ Failed to verify storage state file', error)
  }

  // Final verification using a new context (Playwright best practice)
  const verifyContext = await context.browser().newContext({
    storageState: authFile,
  })
  const verifyPage = await verifyContext.newPage()

  await verifyPage.goto(`${baseUrl}/dashboard/runner`)

  // Wait for final URL (ensuring no redirect to signin)
  await verifyPage.waitForURL(`${baseUrl}/dashboard/runner`)

  // Verify dashboard content is accessible
  await expect(verifyPage.getByTestId('runner-dashboard-content')).toBeVisible({ timeout: 15000 })

  const verifyUrl = verifyPage.url()
  const isAuthenticated = !verifyUrl.includes('/auth/signin')
  logger.info(`🔐 Authentication verification: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`)

  if (!isAuthenticated) {
    logger.error('❌ Storage state verification failed!')
    throw new Error('Authentication verification failed - storage state may not be working')
  }

  // Clean up verification resources
  await verifyPage.close()
  await verifyContext.close()

  logger.info('✅ Runner authentication setup complete and verified!')
})
