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

  // Implement retry logic with linear backoff for intermittent auth failures (matching runner auth)
  const MAX_AUTH_RETRIES = 3
  const RETRY_DELAY_MS = 1000 // 1 second base delay

  let authResponse: { ok: boolean; status: number; body: string | object } | null = null
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      logger.info(`🔑 Coach authentication attempt ${attempt}/${MAX_AUTH_RETRIES}`)

      // Use page.evaluate(() => fetch()) to ensure cookies attach to browser context
      // This is critical - page.request.post() would set cookies in isolated context
      const authResult = await page.evaluate(
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

      authResponse = authResult

      // Success case - break out of retry loop
      if (authResponse.ok) {
        logger.info(`✅ Coach authentication API successful on attempt ${attempt}`)
        break
      }

      // Non-500 errors (like 401 Unauthorized) should fail immediately - no retry
      if (authResponse.status !== 500) {
        const bodyText =
          typeof authResponse.body === 'string'
            ? authResponse.body
            : JSON.stringify(authResponse.body)
        const preview = bodyText
          .slice(0, 300)
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<redacted-email>')
        logger.error('Coach Auth API failed with non-retryable error', {
          status: authResponse.status,
          bodyPreview: preview,
        })
        throw new Error(
          `Coach authentication failed with status ${authResponse.status} - ${preview}`
        )
      }

      // 500 error - log and prepare for retry
      const bodyText =
        typeof authResponse.body === 'string'
          ? authResponse.body
          : JSON.stringify(authResponse.body)
      lastError = new Error(
        `Coach Auth API returned 500 on attempt ${attempt}: ${bodyText.slice(0, 100)}`
      )
      logger.warn(`Retry ${attempt}/${MAX_AUTH_RETRIES}`, { error: lastError.message })

      // Wait before retrying (linear backoff)
      if (attempt < MAX_AUTH_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt
        logger.info(`⏳ Waiting ${delay}ms before retry ${attempt + 1}...`)
        await page.waitForTimeout(delay)
      }
    } catch (error) {
      // Network errors or JSON parse errors - retry
      lastError = error as Error
      logger.error(`Coach authentication attempt ${attempt} failed`, {
        error: lastError.message,
        stack: lastError.stack,
      })

      if (attempt < MAX_AUTH_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt
        logger.info(`⏳ Waiting ${delay}ms before retry ${attempt + 1}...`)
        await page.waitForTimeout(delay)
      }
    }
  }

  // Check if we have a successful auth response
  if (!authResponse || !authResponse.ok) {
    const errorMessage = lastError
      ? lastError.message
      : authResponse
        ? `Status ${authResponse.status}`
        : 'Unknown error'
    throw new Error(
      `Coach authentication failed after ${MAX_AUTH_RETRIES} attempts: ${errorMessage}`
    )
  }

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
