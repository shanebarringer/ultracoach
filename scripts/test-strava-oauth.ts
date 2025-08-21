#!/usr/bin/env tsx
/**
 * Test script for Strava OAuth integration
 * Tests the OAuth endpoints and configuration
 */
import { createLogger } from '../src/lib/logger'
import { STRAVA_CONFIG, STRAVA_ENABLED } from '../src/lib/strava'

const logger = createLogger('test-strava-oauth')

async function testStravaOAuthConfiguration() {
  logger.info('🔧 Testing Strava OAuth Configuration...')

  // Test environment variables
  logger.info('Environment Variables:')
  logger.info(`- STRAVA_CLIENT_ID: ${STRAVA_CONFIG.CLIENT_ID ? 'SET' : 'MISSING'}`)
  logger.info(`- STRAVA_CLIENT_SECRET: ${STRAVA_CONFIG.CLIENT_SECRET ? 'SET' : 'MISSING'}`)
  logger.info(`- STRAVA_REDIRECT_URI: ${STRAVA_CONFIG.REDIRECT_URI}`)
  logger.info(
    `- STRAVA_WEBHOOK_VERIFY_TOKEN: ${STRAVA_CONFIG.WEBHOOK_VERIFY_TOKEN ? 'SET' : 'MISSING'}`
  )
  logger.info(`- STRAVA_ENABLED: ${STRAVA_ENABLED}`)

  if (!STRAVA_ENABLED) {
    logger.error('❌ Strava is not enabled - missing required environment variables')
    return false
  }

  logger.info('✅ Strava configuration is valid')
  return true
}

async function testStravaAPIEndpoints() {
  logger.info('🌐 Testing Strava API Endpoints...')

  const baseUrl = 'http://localhost:3001'
  const endpoints = ['/api/strava/connect', '/api/strava/status', '/api/strava/disconnect']

  for (const endpoint of endpoints) {
    try {
      logger.info(`Testing ${endpoint}...`)

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: endpoint === '/api/strava/disconnect' ? 'POST' : 'GET',
      })

      const data = await response.json()

      if (response.status === 401 && data.error === 'Unauthorized') {
        logger.info(`✅ ${endpoint} - Authentication check working`)
      } else {
        logger.warning(`⚠️  ${endpoint} - Unexpected response:`, {
          status: response.status,
          data,
        })
      }
    } catch (error) {
      logger.error(`❌ ${endpoint} - Request failed:`, error)
    }
  }
}

async function main() {
  logger.info('🚀 Starting Strava OAuth Integration Tests...')

  const configValid = await testStravaOAuthConfiguration()

  if (configValid) {
    await testStravaAPIEndpoints()
  }

  logger.info('🏁 Strava OAuth integration tests completed!')
  logger.info('')
  logger.info('Next steps:')
  logger.info('1. Sign in to http://localhost:3001 with test credentials:')
  logger.info('   Email: sarah@ultracoach.dev')
  logger.info('   Password: UltraCoach2025!')
  logger.info('2. Navigate to Settings > Integrations')
  logger.info('3. Click "Connect to Strava" to test the full OAuth flow')
  logger.info('4. You should be redirected to Strava for authorization')
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = new URL(import.meta.url).pathname
  if (process.argv[1] === modulePath) {
    main().catch(error => {
      logger.error('Test script failed:', error)
      process.exit(1)
    })
  }
}
