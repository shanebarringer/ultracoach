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

  // Use API authentication for reliability (as recommended in Playwright docs)
  // No need to navigate to signin page first - API call sets cookies directly
  // CRITICAL: Retry mechanism for CI where Better Auth initialization may take longer
  logger.info('🔑 Attempting API authentication...')

  let response
  let lastError
  const maxRetries = 3
  const timeouts = [30000, 45000, 60000] // Increasing timeouts: 30s, 45s, 60s
  const delays = [5000, 10000, 15000] // Delays between retries: 5s, 10s, 15s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(
          `⏳ Waiting ${delays[attempt - 1]}ms before retry ${attempt + 1}/${maxRetries}...`
        )
        await page.waitForTimeout(delays[attempt - 1])
      }

      logger.info(`🔐 Auth attempt ${attempt + 1}/${maxRetries} (timeout: ${timeouts[attempt]}ms)`)
      response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
        data: {
          email: TEST_RUNNER_EMAIL,
          password: TEST_RUNNER_PASSWORD,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: timeouts[attempt],
      })

      if (response.ok()) {
        logger.info(`✅ Authentication API successful on attempt ${attempt + 1}`)
        break
      }

      // Non-timeout failure (wrong credentials, etc.)
      const body = await response.text()
      const preview = body
        .slice(0, 300)
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<redacted-email>')
      lastError = new Error(`Authentication API failed with status ${response.status()}`)
      logger.error(`Auth API failed on attempt ${attempt + 1}`, {
        status: response.status(),
        bodyPreview: preview,
      })

      // Don't retry on non-timeout errors (4xx, 5xx)
      if (response.status() !== 0) {
        throw lastError
      }
    } catch (error) {
      lastError = error
      logger.error(`Auth attempt ${attempt + 1} failed:`, error)

      if (attempt === maxRetries - 1) {
        throw new Error(`Authentication failed after ${maxRetries} attempts: ${lastError.message}`)
      }
    }
  }

  if (!response || !response.ok()) {
    throw new Error(`Authentication API failed after all retries`)
  }

  // CRITICAL FIX: Explicitly wait a moment for cookies to propagate
  // In CI environments, there can be timing issues between API auth and page context
  await page.waitForTimeout(1000)

  // The API call should have set cookies, now navigate to dashboard and verify
  await page.goto(`${baseUrl}/dashboard/runner`)
  await waitForAuthenticationSuccess(page, 'runner', 15000)

  // Save storage state (includes cookies and localStorage automatically)
  // Ensure parent directory exists before saving
  if (fs) {
    fs.mkdirSync(path.dirname(authFile), { recursive: true })
  }
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
  const browser = context.browser()
  if (!browser) {
    throw new Error('Browser instance unavailable for verification')
  }
  const verifyContext = await browser.newContext({
    storageState: authFile,
  })
  const verifyPage = await verifyContext.newPage()

  logger.info('🔍 Verifying storage state with new context...')

  try {
    // Navigate and verify we stay on the dashboard (no redirect to signin)
    await verifyPage.goto(`${baseUrl}/dashboard/runner`, {
      waitUntil: 'domcontentloaded',
    })

    // Wait for URL to settle (if auth fails, we get redirected to signin)
    await verifyPage.waitForURL(/\/(dashboard\/runner|auth\/signin)/, { timeout: 10000 })

    const finalUrl = verifyPage.url()
    const isAuthenticated =
      finalUrl.includes('/dashboard/runner') && !finalUrl.includes('/auth/signin')

    logger.info(`🔐 Authentication verification: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`)
    logger.info(`   Final URL: ${finalUrl}`)

    if (!isAuthenticated) {
      logger.error('❌ Storage state verification failed - redirected to signin page!')
      throw new Error('Authentication verification failed - storage state may not be working')
    }
  } finally {
    await verifyPage.close()
    await verifyContext.close()
  }

  logger.info('✅ Runner authentication setup complete and verified!')
})
