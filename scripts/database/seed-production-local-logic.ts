#!/usr/bin/env tsx
/**
 * Production Seeding Using Local Logic
 *
 * Uses the exact same logic and data as our local seed-database.ts script
 * but forces production environment configuration
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Import and run the main seed function from our consolidated seed-database.ts
import { seedDatabase } from './seed-database'

// Force production environment and set up .env.production
process.env.NODE_ENV = 'production'
config({ path: resolve(process.cwd(), '.env.production') })

// Validate production environment
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.production')
  process.exit(1)
}

console.log('🌍 Production environment configured')
console.log(`📊 Using DATABASE_URL: ${DATABASE_URL.substring(0, 20)}...`)

async function main() {
  console.log('🚀 Starting production seeding using local seed logic...')
  console.log('⚠️  WARNING: Running in production environment!')

  try {
    // Use the exact same seeding logic as local
    await seedDatabase()
    console.log('✅ Production seeding completed successfully!')
  } catch (error) {
    console.error('❌ Production seeding failed:', error)
    process.exit(1)
  }
}

main()
