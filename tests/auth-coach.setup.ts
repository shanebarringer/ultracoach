import { expect, test as setup } from '@playwright/test'
import path from 'path'
import { Logger } from 'tslog'

import { TEST_COACH_EMAIL, TEST_COACH_PASSWORD } from './utils/test-helpers'

const logger = new Logger({ name: 'tests/auth-coach.setup' })

const authFile = path.join(__dirname, '../playwright/.auth/coach.json')

setup('authenticate as coach', async ({ page, context }) => {
  logger.info('🔐 Starting coach authentication setup...')
  logger.info(`📁 Auth file path: ${authFile}`)

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
    logger.error('Coach auth API failed', {
      status: response.status(),
      bodyPreview: body.slice(0, 300).replace(TEST_COACH_EMAIL, '<redacted-email>'),
    })
    throw new Error(`Coach authentication API failed with status ${response.status()}`)
  }

  logger.info('✅ Coach authentication API successful')

  // Navigate to coach dashboard and wait for all redirects to complete
  await page.goto(`${baseUrl}/dashboard/coach`)

  // Wait for the final URL after any redirects (critical for proper auth)
  await page.waitForURL(`${baseUrl}/dashboard/coach`)
  logger.info('🔄 Redirects completed, on coach dashboard URL')

  // Wait for specific element that proves we're authenticated (Playwright best practice)
  await expect(page.getByTestId('coach-dashboard-content')).toBeVisible({ timeout: 30000 })
  logger.info('✅ Coach dashboard content visible - authentication confirmed')

  // Capture session storage if the app uses it (Better Auth might store session tokens here)
  const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage))
  if (sessionStorage && sessionStorage !== '{}') {
    logger.info('📦 Session storage captured for restoration')
  }

  // Save storage state (includes cookies and localStorage automatically)
  await context.storageState({ path: authFile })
  logger.info(`💾 Saved coach authentication state to ${authFile}`)

  // Verify the storage state file was created and contains cookies
  try {
    const fs = require('fs')
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
  } catch (error) {
    logger.error('❌ Failed to verify coach storage state file', error)
  }

  // Final verification using a new context (Playwright best practice)
  const verifyContext = await context.browser().newContext({
    storageState: authFile,
  })
  const verifyPage = await verifyContext.newPage()

  await verifyPage.goto(`${baseUrl}/dashboard/coach`)

  // Wait for final URL (ensuring no redirect to signin)
  await verifyPage.waitForURL(`${baseUrl}/dashboard/coach`)

  // Verify coach dashboard content is accessible
  await expect(verifyPage.getByTestId('coach-dashboard-content')).toBeVisible({ timeout: 15000 })

  const verifyUrl = verifyPage.url()
  const isAuthenticated = !verifyUrl.includes('/auth/signin')
  logger.info(`🔐 Coach authentication verification: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`)

  if (!isAuthenticated) {
    logger.error('❌ Coach storage state verification failed!')
    throw new Error('Coach authentication verification failed - storage state may not be working')
  }

  // Clean up verification resources
  await verifyPage.close()
  await verifyContext.close()

  logger.info('✅ Coach authentication setup complete and verified!')
})
