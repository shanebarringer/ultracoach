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

  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001'

  // Navigate to signin page
  await page.goto(`${baseUrl}/auth/signin`)
  logger.info('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Use page.evaluate(() => fetch()) to ensure cookies attach to browser context
  // This is critical - page.request.post() would set cookies in isolated context
  const response = await page.evaluate(
    async ({ apiUrl, email, password }) => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      return {
        ok: response.ok,
        status: response.status,
        body: response.ok ? await response.json() : await response.text(),
      }
    },
    {
      apiUrl: `${baseUrl}/api/auth/sign-in/email`,
      email: TEST_COACH_EMAIL,
      password: TEST_COACH_PASSWORD,
    }
  )

  if (!response.ok) {
    const bodyText =
      typeof response.body === 'string' ? response.body : JSON.stringify(response.body)
    const preview = bodyText
      .slice(0, 300)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<redacted-email>')
    logger.error('Coach Auth API failed', {
      status: response.status,
      bodyPreview: preview,
    })
    throw new Error(`Coach authentication API failed with status ${response.status}`)
  }

  logger.info('✅ Coach authentication API successful')

  // The API call should have set cookies, now navigate to dashboard and verify
  await page.goto(`${baseUrl}/dashboard/coach`)
  await waitForAuthenticationSuccess(page, 'coach', 15000)

  logger.info('✅ Successfully navigated to coach dashboard')

  // Ensure the directory exists before saving authentication state
  const authDir = path.dirname(authFile)
  if (fs) {
    fs.mkdirSync(authDir, { recursive: true })
    logger.info(`📁 Created auth directory: ${authDir}`)
  } else {
    logger.warn(
      'FS not available; skipping auth directory creation. Storage write may fail if parent dir is missing.'
    )
  }

  // Save the authentication state
  await context.storageState({ path: authFile })
  logger.info(`💾 Saved coach authentication state to ${authFile}`)
})
