import { expect, test as setup } from '@playwright/test'
import path from 'path'
import { Logger } from 'tslog'

import { TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD } from './utils/test-helpers'

async function waitForHealthyServer(baseUrl: string, page: import('@playwright/test').Page) {
  const endpoints = ['/', '/api/health', '/api/health/database']
  const start = Date.now()
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      // Use APIRequestContext to avoid page navigation side-effects
      const results = await Promise.all(
        endpoints.map(ep => page.request.get(baseUrl.replace(/\/$/, '') + ep))
      )
      const ok = results.every(r => r.ok())
      if (ok) return { ok: true, ms: Date.now() - start }
    } catch {}
    await new Promise(r => setTimeout(r, 250))
  }
  return { ok: false, ms: Date.now() - start }
}

// Conditional fs import (typed) to avoid Vercel build issues
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node)
const fs: typeof import('node:fs') | null = isNode ? require('node:fs') : null

const logger = new Logger({ name: 'tests/auth.setup' })

const authFile = path.join(__dirname, '../playwright/.auth/runner.json')

setup('authenticate', async ({ page, context }) => {
  logger.info('🔐 Starting runner authentication setup...')

  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001'

  // Health check before auth to avoid slow failures
  const hc = await waitForHealthyServer(baseUrl, page)
  if (!hc.ok) {
    logger.warn('⚠️ Health check did not pass within timeout; continuing anyway', {
      durationMs: hc.ms,
    })
  } else {
    logger.info('✅ Server health checks passed', { durationMs: hc.ms })
  }

  // Navigate to signin page (ensures same-origin cookies)
  await page.goto(`${baseUrl}/auth/signin`)
  logger.info('📍 Navigated to signin page')

  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded')

  // Use the API directly instead of form submission to avoid JavaScript/hydration delays
  const t0 = Date.now()
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
    logger.error('Auth API failed', {
      status: response.status(),
      bodyPreview: body.slice(0, 300).replace(TEST_RUNNER_EMAIL, '<redacted-email>'),
    })
    throw new Error(`Authentication API failed with status ${response.status()}`)
  }

  const authMs = Date.now() - t0
  logger.info('✅ Authentication API successful', { durationMs: authMs })

  // The API call should have set cookies, now navigate to dashboard
  await page.goto(`${baseUrl}/dashboard/runner`)
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
      throw new Error('Authentication failed - could not access dashboard after API auth')
    }
  }

  const totalMs = Date.now() - t0
  logger.info('✅ Successfully navigated to dashboard', { totalAuthFlowMs: totalMs })

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
