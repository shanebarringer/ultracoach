import { expect, test as setup } from '@playwright/test'
import path from 'path'

import { waitForAuthenticationSuccess } from './utils/suspense-helpers'
import { TEST_COACH_EMAIL, TEST_COACH_PASSWORD } from './utils/test-helpers'
import { getTestLogger } from './utils/test-logger'

// Logger is created inside the test to avoid module-eval ESM issues

// Conditional fs import (typed) to avoid Vercel build issues
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node)
const fs: typeof import('node:fs') | null = isNode ? require('node:fs') : null

const authFile = path.join(__dirname, '../playwright/.auth/coach.json')

setup('authenticate as coach @setup', async ({ page, context }) => {
  const logger = await getTestLogger('tests/auth-coach.setup')
  logger.info('🔐 Starting coach authentication setup...')

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
  logger.info('🔑 Attempting coach API authentication...')
  const response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
    data: {
      email: TEST_COACH_EMAIL,
      password: TEST_COACH_PASSWORD,
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
    logger.error('Coach Auth API failed', {
      status: response.status(),
      bodyPreview: preview,
    })
    throw new Error(`Coach authentication API failed with status ${response.status()}`)
  }

  logger.info('✅ Coach authentication API successful')

  // CRITICAL FIX: Explicitly wait a moment for cookies to propagate
  // In CI environments, there can be timing issues between API auth and page context
  await page.waitForTimeout(1000)

  // The API call should have set cookies, now navigate to dashboard and verify
  await page.goto(`${baseUrl}/dashboard/coach`)
  await waitForAuthenticationSuccess(page, 'coach', 15000)

  // Save storage state (includes cookies and localStorage automatically)
  // Ensure parent directory exists before saving
  if (fs) {
    fs.mkdirSync(path.dirname(authFile), { recursive: true })
  }
  await context.storageState({ path: authFile })
  logger.info(`💾 Saved coach authentication state to ${authFile}`)

  // Verify the storage state file was created and contains cookies
  try {
    if (fs) {
      const storageStateContent = fs.readFileSync(authFile, 'utf-8')
      const storageState = JSON.parse(storageStateContent)
      logger.info(
        `✅ Coach storage state file created with ${storageState.cookies?.length || 0} cookies`
      )

      if (storageState.cookies?.length > 0) {
        const authCookies = storageState.cookies.filter(
          cookie =>
            cookie.name.includes('better-auth') ||
            cookie.name.includes('session') ||
            cookie.name.includes('auth')
        )
        logger.info(`🍪 Found ${authCookies.length} auth-related cookies for coach`)
      } else {
        logger.warn('⚠️ No cookies found in coach storage state!')
      }
    }
  } catch (error) {
    logger.error('❌ Failed to verify coach storage state file', error)
  }

  // Final verification using a new context (Playwright best practice)
  const verifyContext = await context.browser().newContext({
    storageState: authFile,
  })
  const verifyPage = await verifyContext.newPage()

  logger.info('🔍 Verifying coach storage state with new context...')

  // Navigate and verify we stay on the dashboard (no redirect to signin)
  await verifyPage.goto(`${baseUrl}/dashboard/coach`, {
    waitUntil: 'domcontentloaded',
  })

  // Wait for URL to settle (if auth fails, we get redirected to signin)
  await verifyPage.waitForURL(/\/(dashboard\/coach|auth\/signin)/, { timeout: 10000 })

  const finalUrl = verifyPage.url()
  const isAuthenticated =
    finalUrl.includes('/dashboard/coach') && !finalUrl.includes('/auth/signin')

  logger.info(`🔐 Coach authentication verification: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`)
  logger.info(`   Final URL: ${finalUrl}`)

  if (!isAuthenticated) {
    logger.error('❌ Coach storage state verification failed - redirected to signin page!')
    throw new Error('Coach authentication verification failed - storage state may not be working')
  }

  // Clean up verification resources
  await verifyPage.close()
  await verifyContext.close()

  logger.info('✅ Coach authentication setup complete and verified!')
})
