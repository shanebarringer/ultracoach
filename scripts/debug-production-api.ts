#!/usr/bin/env tsx
/**
 * Debug Production API
 *
 * This script tests various production API endpoints to diagnose
 * the authentication issues.
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('DebugProductionAPI')

async function debugProductionAPI() {
  const baseUrl = 'https://ultracoach.vercel.app'

  logger.info('🔍 Debugging production API endpoints...')

  // Test 1: Basic connectivity
  try {
    logger.info('📡 Test 1: Testing basic connectivity...')
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'UltraCoach-Debug/1.0' },
    })

    logger.info('Basic connectivity:', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      vercelCache: response.headers.get('x-vercel-cache'),
      vercerId: response.headers.get('x-vercel-id'),
    })
  } catch (error) {
    logger.error('Basic connectivity failed:', error)
  }

  // Test 2: API route structure
  try {
    logger.info('🗂️ Test 2: Testing API route structure...')
    const response = await fetch(`${baseUrl}/api/auth`, {
      method: 'GET',
      headers: { 'User-Agent': 'UltraCoach-Debug/1.0' },
    })

    const text = await response.text()
    logger.info('API auth route:', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      hasContent: text.length > 0,
      contentPreview: text.substring(0, 200),
      matchedPath: response.headers.get('x-matched-path'),
    })
  } catch (error) {
    logger.error('API route test failed:', error)
  }

  // Test 3: Better Auth sign-in endpoint
  try {
    logger.info('🔐 Test 3: Testing Better Auth sign-in endpoint...')
    const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UltraCoach-Debug/1.0',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
      }),
    })

    const text = await response.text()
    logger.info('Sign-in endpoint:', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      hasContent: text.length > 0,
      contentPreview: text.substring(0, 500),
      matchedPath: response.headers.get('x-matched-path'),
      vercerId: response.headers.get('x-vercel-id'),
    })

    // Try to parse as JSON
    if (text.length > 0) {
      try {
        const json = JSON.parse(text)
        logger.info('Sign-in response JSON:', json)
      } catch (parseError) {
        logger.warn('Sign-in response is not valid JSON')
      }
    }
  } catch (error) {
    logger.error('Sign-in endpoint test failed:', error)
  }

  // Test 4: Database connectivity test endpoint (if we had one)
  try {
    logger.info('🗄️ Test 4: Testing database endpoint (if exists)...')
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { 'User-Agent': 'UltraCoach-Debug/1.0' },
    })

    const text = await response.text()
    logger.info('Health endpoint:', {
      status: response.status,
      ok: response.ok,
      hasContent: text.length > 0,
      contentPreview: text.substring(0, 200),
    })
  } catch (error) {
    logger.info('Health endpoint not available (expected)')
  }

  logger.info('🏁 Production API debug complete')
}

// Run the debug
debugProductionAPI()
  .then(() => {
    logger.info('✅ Debug completed')
    process.exit(0)
  })
  .catch(error => {
    logger.error('❌ Debug failed:', error)
    process.exit(1)
  })
