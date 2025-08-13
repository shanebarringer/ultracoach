#!/usr/bin/env tsx
/**
 * Local Database Seeding Script
 *
 * Uses the shared database operations module to seed local database
 * with proper Better Auth schema and test data.
 */
import { seedDatabase } from './lib/database-operations'

async function main() {
  try {
    await seedDatabase('local')
    process.exit(0)
  } catch (error) {
    console.error('Local seeding failed:', error)
    process.exit(1)
  }
}

main()
