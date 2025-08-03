import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { resolve } from 'path'
import postgres from 'postgres'

import { createLogger } from './logger'
import * as schema from './schema'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('database')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create postgres client with optimized settings for Supabase
const client = postgres(process.env.DATABASE_URL, {
  // Supabase specific optimizations
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: process.env.NODE_ENV === 'production' ? 3 : 5, // Conservative pool size for serverless
  idle_timeout: process.env.NODE_ENV === 'production' ? 30 : 300, // Seconds
  connect_timeout: 10, // Seconds
  prepare: false, // Required for Supabase transaction pooler
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL compatibility
  },
  debug: process.env.NODE_ENV === 'development',
})

// Initialize Drizzle with the schema
export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
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