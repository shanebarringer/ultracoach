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

const logger = createLogger('better-auth')

// Create a dedicated database connection for Better Auth with optimized settings
const betterAuthPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true } 
    : { rejectUnauthorized: false }, // Only disable SSL verification in development
  max: 5, // Reduced pool size to prevent connection limits
  min: 1, // Keep fewer connections alive
  idleTimeoutMillis: 300000, // 5 minutes idle timeout (increased)
  connectionTimeoutMillis: 60000, // 60 seconds connection timeout for Supabase
  application_name: 'ultracoach-better-auth', // Help identify connections
  keepAlive: true, // Keep connections alive
  keepAliveInitialDelayMillis: 10000, // 10 seconds
})

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

export const apiBaseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'

export const auth = betterAuth({
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

  session: {
    maxAge: 14 * 24 * 60 * 60, // 14 days
    freshAge: 60 * 60, // 1 hour
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production', // Enable email verification in production
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
    nextCookies(), // This must be the last plugin
  ],
})

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
