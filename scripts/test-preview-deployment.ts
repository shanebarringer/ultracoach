#!/usr/bin/env tsx
/**
 * Test Preview Deployment
 *
 * This script tests the current preview deployment branch to see if API routes are working.
 * We're on fix/nextjs-static-dynamic-rendering branch, so we need to test the preview URL.
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('TestPreviewDeployment')

async function testPreviewDeployment() {
  logger.info('🔍 Testing preview deployment API routes...')

  // Check if we can determine the preview URL
  const branch = 'fix/nextjs-static-dynamic-rendering'
  logger.info(`Current branch: ${branch}`)

  // Common Vercel preview URL patterns for this project
  const possiblePreviewUrls = [
    'https://ultracoach-git-fix-nextjs-static-dynamic-rendering-shane-hehims-projects.vercel.app',
    'https://ultracoach-git-fix-nextjs-static-dyna-shane-hehims-projects.vercel.app', // Truncated version
    'https://ultracoach-hawqljwys-shane-hehims-projects.vercel.app', // Latest deployment
  ]

  // Test each possible preview URL
  for (const baseUrl of possiblePreviewUrls) {
    logger.info(`🌐 Testing preview URL: ${baseUrl}`)

    try {
      // Test 1: Basic API health check
      const healthUrl = `${baseUrl}/api/health`
      logger.info(`Testing health endpoint: ${healthUrl}`)

      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'UltraCoach-Test/1.0' },
      })

      logger.info('Health endpoint response:', {
        status: healthResponse.status,
        statusText: healthResponse.statusText,
        headers: Object.fromEntries(healthResponse.headers.entries()),
      })

      if (healthResponse.ok) {
        const healthData = await healthResponse.text()
        logger.info('Health endpoint data:', healthData.substring(0, 500))
      }

      // Test 2: Better Auth debug endpoint
      const debugUrl = `${baseUrl}/api/debug-auth`
      logger.info(`Testing debug-auth endpoint: ${debugUrl}`)

      const debugResponse = await fetch(debugUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'UltraCoach-Test/1.0' },
      })

      logger.info('Debug-auth endpoint response:', {
        status: debugResponse.status,
        statusText: debugResponse.statusText,
        contentType: debugResponse.headers.get('content-type'),
      })

      if (debugResponse.ok) {
        const debugData = await debugResponse.json()
        logger.info('Debug-auth success:', debugData)
        return { success: true, previewUrl: baseUrl, debugData }
      } else {
        const errorText = await debugResponse.text()
        logger.warn('Debug-auth failed:', { status: debugResponse.status, error: errorText })
      }

      // Test 3: Better Auth signin endpoint
      const signinUrl = `${baseUrl}/api/auth/sign-in/email`
      logger.info(`Testing Better Auth endpoint: ${signinUrl}`)

      const signinResponse = await fetch(signinUrl, {
        method: 'OPTIONS', // Just test if the route exists
        headers: { 'User-Agent': 'UltraCoach-Test/1.0' },
      })

      logger.info('Better Auth endpoint response:', {
        status: signinResponse.status,
        statusText: signinResponse.statusText,
        allowedMethods: signinResponse.headers.get('allow'),
      })
    } catch (error) {
      logger.warn(`Failed to test ${baseUrl}:`, error instanceof Error ? error.message : error)
    }
  }

  logger.error('❌ No working preview deployment found')
  return { success: false }
}

// Run the test
testPreviewDeployment()
  .then(result => {
    if (result.success) {
      logger.info('✅ Preview deployment test successful!')
      process.exit(0)
    } else {
      logger.error('❌ Preview deployment test failed')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('🚨 Test script error:', error)
    process.exit(1)
  })
