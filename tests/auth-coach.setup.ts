import { expect, test as setup } from '@playwright/test'
import path from 'path'
import { Logger } from 'tslog'

// Conditional fs import to avoid Vercel build issues
const fs = typeof window === 'undefined' ? require('fs') : null

const logger = new Logger({ name: 'tests/auth-coach.setup' })

const authFile = path.join(__dirname, '../playwright/.auth/coach.json')

setup('authenticate as coach', async ({ page, context }) => {
  logger.info('🔐 Starting coach authentication setup...')

  const baseUrl = process.env.CI ? 'http://localhost:3001' : 'http://localhost:3001'

  // Navigate to signin page
  await page.goto(`${baseUrl}/auth/signin`)
  logger.info('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Use the API directly instead of form submission to avoid JavaScript issues
  const response = await page.request.post(`${baseUrl}/api/auth/sign-in/email`, {
    data: {
      email: process.env.TEST_COACH_EMAIL || 'emma@ultracoach.dev',
      password: process.env.TEST_COACH_PASSWORD || 'UltraCoach2025!',
    },
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok()) {
    logger.error('Auth API response status:', response.status())
    logger.error('Auth API response:', await response.text())
    throw new Error(`Coach authentication API failed with status ${response.status()}`)
  }

  logger.info('✅ Coach authentication API successful')

  // The API call should have set cookies, now navigate to dashboard
  await page.goto(`${baseUrl}/dashboard/coach`)
  await page.waitForLoadState('domcontentloaded')

  // Verify we're on the dashboard
  const currentUrl = page.url()
  logger.info('🔄 Current URL after auth:', currentUrl)

  if (!currentUrl.includes('/dashboard')) {
    // If redirected to signin, try refreshing to pick up cookies
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const finalUrl = page.url()
    if (!finalUrl.includes('/dashboard')) {
      throw new Error('Coach authentication failed - could not access dashboard after API auth')
    }
  }

  logger.info('✅ Successfully navigated to coach dashboard')

  // Ensure the directory exists before saving authentication state
  const authDir = path.dirname(authFile)
  if (fs) {
    fs.mkdirSync(authDir, { recursive: true })
    logger.info(`📁 Created auth directory: ${authDir}`)
  }

  // Save the authentication state
  await context.storageState({ path: authFile })
  logger.info(`💾 Saved coach authentication state to ${authFile}`)
})
