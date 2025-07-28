#!/usr/bin/env node

/**
 * Debug Better Auth Configuration
 * 
 * Helps debug Better Auth URL configuration issues in different environments
 */

console.log('🔍 Better Auth Configuration Debug')
console.log('=====================================')

// Simulate different environments
const environments = [
  {
    name: 'Local Development',
    env: {
      VERCEL_URL: undefined,
      BETTER_AUTH_URL: 'http://localhost:3001',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Vercel Production (with VERCEL_URL)',
    env: {
      VERCEL_URL: 'ultracoach.vercel.app',
      BETTER_AUTH_URL: 'https://ultracoach.vercel.app',
      NODE_ENV: 'production'
    }
  },
  {
    name: 'Vercel Production (without VERCEL_URL)',
    env: {
      VERCEL_URL: undefined,
      BETTER_AUTH_URL: 'https://ultracoach.vercel.app',
      NODE_ENV: 'production'
    }
  },
  {
    name: 'Current Environment',
    env: {
      VERCEL_URL: process.env.VERCEL_URL,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      NODE_ENV: process.env.NODE_ENV
    }
  }
]

// Better Auth URL construction logic (copied from better-auth.ts)
function getBetterAuthBaseUrl(env) {
  console.log(`\n📍 Environment: ${env.NODE_ENV || 'undefined'}`)
  console.log(`   VERCEL_URL: ${env.VERCEL_URL || 'undefined'}`)
  console.log(`   BETTER_AUTH_URL: ${env.BETTER_AUTH_URL || 'undefined'}`)
  
  // Vercel best practice: Use VERCEL_URL in production (automatically set by Vercel)
  if (env.VERCEL_URL) {
    const url = `https://${env.VERCEL_URL}/api/auth`
    console.log(`   ✅ Using VERCEL_URL: ${url}`)
    return url
  }
  
  // Alternative: Use explicit BETTER_AUTH_URL if provided (takes precedence)
  if (env.BETTER_AUTH_URL) {
    const url = env.BETTER_AUTH_URL
    // Use endsWith for more accurate detection of /api/auth path
    const finalUrl = url.endsWith('/api/auth') ? url : `${url}/api/auth`
    console.log(`   ✅ Using BETTER_AUTH_URL: ${finalUrl}`)
    return finalUrl
  }
  
  // Development fallback
  const fallback = 'http://localhost:3001/api/auth'
  console.log(`   ⚠️  Using fallback: ${fallback}`)
  return fallback
}

environments.forEach(({ name, env }) => {
  console.log(`\n🌍 ${name}`)
  console.log('─'.repeat(40))
  const baseUrl = getBetterAuthBaseUrl(env)
  console.log(`   🎯 Final baseURL: ${baseUrl}`)
})

console.log('\n🔧 Recommendations:')
console.log('─'.repeat(40))
console.log('1. Ensure VERCEL_URL is set automatically by Vercel')
console.log('2. BETTER_AUTH_URL should match your production domain')
console.log('3. Check Vercel environment variables in dashboard')
console.log('4. Verify database connection in production')

// Check for common issues
console.log('\n⚠️  Common Issues:')
console.log('─'.repeat(40))
if (process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL.includes('localhost')) {
  console.log('❌ BETTER_AUTH_URL contains localhost in production')
}
if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL not set')
}
if (!process.env.BETTER_AUTH_SECRET) {
  console.log('❌ BETTER_AUTH_SECRET not set')
}
if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
  console.log('❌ BETTER_AUTH_SECRET too short')
}

console.log('\n✅ Debug complete')