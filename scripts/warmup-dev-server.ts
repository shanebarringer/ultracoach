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

async function warmupRoute(route: string): Promise<void> {
  const url = `${BASE_URL}${route}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'WarmupScript/1.0',
      },
    })
    const status = response.status
    console.log(`✓ ${route} - ${status}`)
  } catch (error) {
    console.error(`✗ ${route} - Failed:`, (error as Error).message)
  }
}

async function warmupServer(): Promise<void> {
  console.log('🔥 Warming up Next.js dev server...')
  console.log(`   Base URL: ${BASE_URL}`)
  console.log()

  for (const route of routes) {
    await warmupRoute(route)
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log()
  console.log('✅ Dev server warmup complete!')
  console.log('   Routes are now pre-compiled and ready for tests.')
}

warmupServer().catch(error => {
  console.error('❌ Warmup failed:', error)
  process.exit(1)
})
