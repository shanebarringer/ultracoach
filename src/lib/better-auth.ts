import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { createLogger } from './logger'
import {
  better_auth_accounts,
  better_auth_sessions,
  better_auth_users,
  better_auth_verification_tokens,
} from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for Better Auth')
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required for Better Auth')
}

const logger = createLogger('better-auth')

// Create a dedicated database connection for Better Auth with optimized settings
let betterAuthPool: Pool
try {
  betterAuthPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } // Supabase uses certificates that may trigger SELF_SIGNED_CERT_IN_CHAIN
      : false, // No SSL in development
    max: 5, // Reduced pool size to prevent connection limits
    min: 1, // Keep fewer connections alive
    idleTimeoutMillis: 300000, // 5 minutes idle timeout (increased)
    connectionTimeoutMillis: 60000, // 60 seconds connection timeout for Supabase
    application_name: 'ultracoach-better-auth', // Help identify connections
    keepAlive: true, // Keep connections alive
    keepAliveInitialDelayMillis: 10000, // 10 seconds
  })
  logger.info('Better Auth database pool initialized successfully')
} catch (error) {
  logger.error('Failed to initialize Better Auth database pool:', error)
  throw new Error(`Database pool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
}

// Add connection event handlers for monitoring
betterAuthPool.on('connect', () => {
  logger.info('Database connection established')
})

betterAuthPool.on('error', err => {
  logger.error('Database pool error:', err)
  // Don't exit the process, just log the error
})

betterAuthPool.on('remove', () => {
  logger.debug('Client removed from pool')
})

const betterAuthDb = drizzle(betterAuthPool)

// Construct proper Better Auth base URL following Vercel best practices
function getBetterAuthBaseUrl(): string {
  logger.debug('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL ? '[SET]' : 'undefined',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ? '[SET]' : 'undefined'
  })
  
  // Vercel best practice: Use VERCEL_URL in production (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    const url = `https://${process.env.VERCEL_URL}/api/auth`
    logger.info('Using VERCEL_URL for baseURL:', url)
    return url
  }
  
  // Alternative: Use explicit BETTER_AUTH_URL if provided (takes precedence)
  if (process.env.BETTER_AUTH_URL) {
    const url = process.env.BETTER_AUTH_URL
    // Use endsWith for more accurate detection of /api/auth path
    const finalUrl = url.endsWith('/api/auth') ? url : `${url}/api/auth`
    logger.info('Using BETTER_AUTH_URL for baseURL:', finalUrl)
    return finalUrl
  }
  
  // Development fallback
  const fallback = 'http://localhost:3001/api/auth'
  logger.info('Using fallback baseURL:', fallback)
  return fallback
}

function getTrustedOrigins(): string[] {
  const origins: string[] = []
  
  // Development
  origins.push('http://localhost:3000')
  origins.push('http://localhost:3001')
  
  // Production - add current Vercel URL
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }
  
  // Add any additional trusted origins from environment
  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    const additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(origin => origin.trim())
    origins.push(...additionalOrigins)
  }
  
  // Add common Vercel deployment patterns
  // Note: Better Auth may not support wildcards, so we'll add specific patterns
  origins.push('https://ultracoach.vercel.app')
  origins.push('https://ultracoach-git-main-shane-hehims-projects.vercel.app')
  origins.push('https://ultracoach-git-fix-cors-error-shane-hehims-projects.vercel.app')
  
  // Add pattern for any ultracoach deployment
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.includes('ultracoach')) {
    // Add the specific current deployment URL
    origins.push(`https://${process.env.VERCEL_URL}`)
    
    // Also add without the /api/auth suffix if it exists
    const baseUrl = process.env.VERCEL_URL.replace('/api/auth', '')
    if (baseUrl !== process.env.VERCEL_URL) {
      origins.push(`https://${baseUrl}`)
    }
  }
  
  logger.info('Trusted origins:', origins)
  return origins
}

const apiBaseUrl = getBetterAuthBaseUrl()
const trustedOrigins = getTrustedOrigins()

logger.info('Initializing Better Auth with baseURL:', apiBaseUrl)

let auth: ReturnType<typeof betterAuth>
try {
  logger.info('Initializing Better Auth with configuration:', {
    baseURL: apiBaseUrl,
    trustedOrigins,
    hasSecret: !!process.env.BETTER_AUTH_SECRET,
    secretLength: process.env.BETTER_AUTH_SECRET?.length,
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL ? '[SET]' : 'undefined'
  })
  
  auth = betterAuth({
    database: drizzleAdapter(betterAuthDb, {
      provider: 'pg',
      schema: {
        user: better_auth_users,
        account: better_auth_accounts,
        session: better_auth_sessions,
        verification: better_auth_verification_tokens,
      },
    }),
    baseURL: apiBaseUrl,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins,

    session: {
      expirationTime: 60 * 60 * 24 * 14, // 14 days in seconds
      freshAge: 60 * 60, // 1 hour
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Temporarily disable to test login issue
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },

    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: true,
          defaultValue: 'runner',
          input: true,
          output: true,
        },
        fullName: {
          type: 'string',
          required: false,
          input: true,
          output: true,
        },
      },
    },

    plugins: [
      nextCookies(), // This must be the last plugin - required for Next.js cookie handling
    ],
  })
  logger.info('Better Auth initialized successfully')
} catch (error) {
  logger.error('Failed to initialize Better Auth:', error)
  throw new Error(`Better Auth initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
}

export { auth }

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user & {
  role: 'runner' | 'coach'
  fullName?: string | null
}

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, closing database connections...`)
  betterAuthPool.end(() => {
    logger.info('Database pool connections closed')
    process.exit(0)
  })
}

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Type definitions for the application
declare module 'better-auth' {
  interface UserAdditionalFields {
    role: 'runner' | 'coach'
    full_name?: string
  }
}
