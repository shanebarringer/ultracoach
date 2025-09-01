import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { resolve } from 'path'
import postgres from 'postgres'

import { createLogger } from './logger'
import * as schema from './schema'

// Load environment variables (skip in CI/test where env vars are set directly)
// Also check if .env.local exists before trying to load it
if (process.env.NODE_ENV !== 'test') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    const envPath = resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      config({ path: envPath })
    }
  } catch {
    // Silently continue if .env.local doesn't exist or can't be loaded
  }
}

const logger = createLogger('database')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Safety check: Prevent production deployment from using localhost database
// Allow localhost during builds (CI/development) but not in actual production deployment
const isProductionDeployment =
  process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production'
if (isProductionDeployment && process.env.DATABASE_URL!.includes('127.0.0.1')) {
  throw new Error('Production DATABASE_URL still points to localhost!')
}

// Create postgres client with optimized settings for Supabase
const client = postgres(process.env.DATABASE_URL, {
  // Supabase specific optimizations
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: process.env.NODE_ENV === 'production' ? 3 : 5, // Conservative pool size for serverless
  idle_timeout: process.env.NODE_ENV === 'production' ? 30 : 300, // Seconds
  connect_timeout: process.env.NODE_ENV === 'test' ? 60 : process.env.CI ? 30 : 10, // Extended timeout for CI/test
  prepare: false, // Required for Supabase transaction pooler
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL compatibility
  },
  debug: process.env.NODE_ENV === 'development',
})

// Initialize Drizzle with the schema
export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})

// Export the client for Better Auth if needed
export { client }

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Closing database connection...')
  client.end()
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

logger.info('Database client initialized successfully')
