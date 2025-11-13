/**
 * Development Server Warmup Script
 *
 * Pre-compiles Next.js routes before running Playwright tests to avoid
 * timeout issues caused by concurrent route compilation during test execution.
 *
 * Usage:
 *   npx tsx scripts/warmup-dev-server.ts
 *
 * This script should be run after starting the dev server and before running tests.
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3001'

// Routes to pre-compile (in order of dependency)
const routes = [
  '/', // Landing page
  '/auth/signin', // Sign in page
  '/auth/signup', // Sign up page
  '/dashboard/runner', // Runner dashboard
  '/dashboard/coach', // Coach dashboard
  '/api/auth/sign-in/email', // Auth API (will return 405 on GET, but triggers compilation)
]

async function warmupRoute(route: string): Promise<boolean> {
  const url = `${BASE_URL}${route}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'WarmupScript/1.0',
      },
    })
    const status = response.status

    // Check for server errors (5xx) - these are failures
    if (status >= 500) {
      console.error(`✗ ${route} - Server Error: ${status}`)
      return false
    }

    // Accept 2xx, 3xx, and expected 4xx codes (like 405 for API routes)
    if (status >= 200 && status < 400) {
      console.log(`✓ ${route} - ${status}`)
      return true
    }

    // 405 is expected for API routes that don't support GET
    if (status === 405 && route.startsWith('/api/')) {
      console.log(`✓ ${route} - ${status} (Method Not Allowed - expected for API route)`)
      return true
    }

    // Other 4xx codes are warnings but not failures (route was compiled)
    console.warn(`⚠ ${route} - ${status}`)
    return true
  } catch (error) {
    console.error(`✗ ${route} - Failed:`, (error as Error).message)
    return false
  }
}

async function warmupServer(): Promise<void> {
  console.log('🔥 Warming up Next.js dev server...')
  console.log(`   Base URL: ${BASE_URL}`)
  console.log()

  let hasFailures = false

  for (const route of routes) {
    const success = await warmupRoute(route)
    if (!success) {
      hasFailures = true
    }
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log()

  if (hasFailures) {
    console.error('❌ Dev server warmup completed with errors!')
    console.error('   Some routes returned server errors (5xx) or failed to load.')
    throw new Error('Warmup failed: Server errors detected')
  }

  console.log('✅ Dev server warmup complete!')
  console.log('   Routes are now pre-compiled and ready for tests.')
}

warmupServer().catch(error => {
  console.error('❌ Warmup failed:', error)
  process.exit(1)
})
