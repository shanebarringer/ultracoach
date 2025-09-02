#!/usr/bin/env tsx
/**
 * Test Preview Authentication
 *
 * Test the working preview deployment with actual authentication.
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('TestPreviewAuth')

const PREVIEW_URL = 'https://ultracoach-hawqljwys-shane-hehims-projects.vercel.app'

async function testPreviewAuth() {
  logger.info('🔍 Testing preview deployment authentication...')
  logger.info(`Preview URL: ${PREVIEW_URL}`)

  try {
    // Test 1: Better Auth sign-in endpoint
    const signinUrl = `${PREVIEW_URL}/api/auth/sign-in/email`
    logger.info(`Testing sign-in with: ${signinUrl}`)

    const signinResponse = await fetch(signinUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UltraCoach-Test/1.0',
      },
      body: JSON.stringify({
        email: 'sarah@ultracoach.dev',
        password: 'UltraCoach2025!',
      }),
    })

    logger.info('Sign-in response:', {
      status: signinResponse.status,
      statusText: signinResponse.statusText,
      contentType: signinResponse.headers.get('content-type'),
    })

    if (signinResponse.ok) {
      const signinData = await signinResponse.json()
      logger.info('✅ Sign-in successful!', signinData)
      return { success: true, data: signinData }
    } else {
      const errorText = await signinResponse.text()
      logger.warn('Sign-in failed:', { status: signinResponse.status, error: errorText })
    }

    // Test 2: Better Auth session endpoint
    const sessionUrl = `${PREVIEW_URL}/api/auth/get-session`
    logger.info(`Testing session check: ${sessionUrl}`)

    const sessionResponse = await fetch(sessionUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'UltraCoach-Test/1.0' },
    })

    logger.info('Session response:', {
      status: sessionResponse.status,
      statusText: sessionResponse.statusText,
    })

    // Test 3: Our diagnostic endpoint
    const debugUrl = `${PREVIEW_URL}/api/debug-auth`
    logger.info(`Testing diagnostic endpoint: ${debugUrl}`)

    const debugResponse = await fetch(debugUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'UltraCoach-Test/1.0' },
    })

    logger.info('Debug response:', {
      status: debugResponse.status,
      statusText: debugResponse.statusText,
    })

    if (debugResponse.ok) {
      const debugData = await debugResponse.json()
      logger.info('✅ Diagnostic successful!', debugData)
      return { success: true, diagnostics: debugData }
    } else {
      const errorText = await debugResponse.text()
      logger.warn('Diagnostic failed:', { status: debugResponse.status, error: errorText })
    }

    return { success: false }
  } catch (error) {
    logger.error('Test failed:', error instanceof Error ? error.message : error)
    return { success: false, error }
  }
}

// Run the test
testPreviewAuth()
  .then(result => {
    if (result.success) {
      logger.info('🎉 Preview authentication test successful!')
      process.exit(0)
    } else {
      logger.error('❌ Preview authentication test failed')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('🚨 Test script error:', error)
    process.exit(1)
  })
