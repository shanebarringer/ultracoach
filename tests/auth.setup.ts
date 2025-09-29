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

  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001'

  // Navigate to signin page
  await page.goto(`${baseUrl}/auth/signin`)
  logger.info('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Use the API directly instead of form submission to avoid JavaScript issues
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

  logger.info('✅ Successfully navigated to dashboard')

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
  logger.info(`💾 Saved runner authentication state to ${authFile}`)
})
