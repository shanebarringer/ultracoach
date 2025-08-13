#!/usr/bin/env tsx
/**
 * Production Database Seeding Script
 *
 * Uses the shared database operations module to seed production database
 * with proper Better Auth schema and test data.
 */
import { seedDatabase } from './lib/database-operations'

async function main() {
  try {
    await seedDatabase('production')
    process.exit(0)
  } catch (error) {
    console.error('Production seeding failed:', error)
    process.exit(1)
  }
}

main()
