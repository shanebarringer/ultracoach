import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Determine SSL configuration based on environment
const isProduction = process.env.NODE_ENV === 'production'
const isLocalDatabase =
  process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')

// Configure SSL based on environment
const sslConfig = isLocalDatabase || !isProduction ? false : { rejectUnauthorized: false }

// Configure connection pool with optimizations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  // Connection pool optimizations
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const db = drizzle(pool, { schema })
