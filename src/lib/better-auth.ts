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

// Create a dedicated database connection for Better Auth with production-optimized settings
let betterAuthPool: Pool

function createSSLConfig() {
  if (process.env.NODE_ENV === 'production') {
    // Production SSL configuration for Supabase
    return {
      rejectUnauthorized: false, // Supabase manages certificates
      sslmode: 'require', // Require SSL connection
    }
  }
  // No SSL for local development
  return false
}

function createPoolConfig() {
  const baseConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: createSSLConfig(),
    application_name: 'ultracoach-better-auth',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  }

  if (process.env.NODE_ENV === 'production') {
    // Production-optimized settings for Vercel serverless
    return {
      ...baseConfig,
      max: 3, // Conservative pool size for serverless
      min: 0, // No minimum connections in serverless
      idleTimeoutMillis: 30000, // Shorter timeout for serverless
      connectionTimeoutMillis: 10000, // Faster timeout for production
      acquireTimeoutMillis: 10000, // Timeout for acquiring connections
      createTimeoutMillis: 10000, // Timeout for creating connections
      destroyTimeoutMillis: 5000, // Timeout for destroying connections
      reapIntervalMillis: 1000, // More frequent connection reaping
      createRetryIntervalMillis: 200, // Retry interval for failed connections
      propagateCreateError: false, // Don't propagate creation errors immediately
    }
  } else {
    // Development settings
    return {
      ...baseConfig,
      max: 5,
      min: 1,
      idleTimeoutMillis: 300000, // 5 minutes
      connectionTimeoutMillis: 60000, // 60 seconds
    }
  }
}

try {
  const poolConfig = createPoolConfig()
  betterAuthPool = new Pool(poolConfig)
  
  logger.info('Better Auth database pool initialized with configuration:', {
    environment: process.env.NODE_ENV,
    hasSSL: !!poolConfig.ssl,
    maxConnections: poolConfig.max,
    minConnections: poolConfig.min,
  })
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

// Simplified trusted origins configuration following Better Auth best practices
function getTrustedOrigins(): string[] {
  const origins: string[] = []
  
  // Development origins
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000')
    origins.push('http://localhost:3001')
  }
  
  // Production - use VERCEL_URL if available (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }
  
  // Add main production domain
  origins.push('https://ultracoach.vercel.app')
  
  // Allow additional trusted origins from environment variable
  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    const additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
    origins.push(...additionalOrigins)
  }
  
  logger.info('Trusted origins configured:', origins)
  return origins
}

const apiBaseUrl = getBetterAuthBaseUrl()
const trustedOrigins = getTrustedOrigins()

logger.info('Initializing Better Auth with configuration:', {
  baseURL: apiBaseUrl,
  trustedOriginsCount: trustedOrigins.length,
  environment: process.env.NODE_ENV
})

let auth: ReturnType<typeof betterAuth>
try {
  logger.info('Better Auth initialization details:', {
    baseURL: apiBaseUrl,
    hasSecret: !!process.env.BETTER_AUTH_SECRET,
    secretLength: process.env.BETTER_AUTH_SECRET?.length,
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL ? '[SET]' : 'undefined',
    trustedOriginsCount: trustedOrigins.length
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

    // Production-optimized session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 days in seconds
      freshAge: 60 * 60, // 1 hour
      updateAge: 60 * 60 * 24, // Update session once per day
    },

    // Production-optimized cookie configuration
    advanced: {
      useSecureCookies: process.env.NODE_ENV === 'production', // Force secure cookies in production
      cookiePrefix: 'better-auth', // Consistent cookie prefix
      crossSubDomainCookies: false, // Disable for better security
      generateId: true, // Let Better Auth generate IDs
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Temporarily disable for testing
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
      nextCookies(), // Must be last plugin - handles Next.js cookie integration
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
