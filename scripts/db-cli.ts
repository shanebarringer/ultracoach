#!/usr/bin/env tsx
/**
 * UltraCoach Database CLI
 * 
 * Unified command-line interface for all database operations.
 * Consolidates functionality from multiple duplicate scripts.
 * 
 * Usage: pnpm tsx scripts/db-cli.ts <command> [options]
 */

import { Command } from 'commander'

const program = new Command()

program
  .name('db-cli')
  .description('UltraCoach Database Management CLI')
  .version('1.0.0')

// Seed commands
program
  .command('seed')
  .description('Seed the database with test data')
  .option('-p, --production', 'Seed production database (use with caution)')
  .option('-c, --comprehensive', 'Use comprehensive seeding with all test data')
  .action(async (options) => {
    if (options.production) {
      console.log('🚨 Production seeding - importing comprehensive-seed.ts')
      await import('./comprehensive-seed.js')
    } else if (options.comprehensive) {
      console.log('📊 Comprehensive seeding - importing comprehensive-seed.ts')
      await import('./comprehensive-seed.js')
    } else {
      console.log('🌱 Basic seeding - importing seed-database.ts')
      await import('./seed-database.js')
    }
  })

// User management commands
program
  .command('create-users')
  .description('Create test users')
  .option('-a, --automated', 'Use automated browser-based creation')
  .option('-h, --http', 'Use HTTP API creation')
  .action(async (options) => {
    if (options.automated) {
      console.log('🤖 Creating users via automated browser - importing create-test-users-automated.ts')
      await import('./create-test-users-automated.js')
    } else if (options.http) {
      console.log('🌐 Creating users via HTTP API - importing create-test-users-http.ts')
      await import('./create-test-users-http.js')
    } else {
      console.log('👥 Creating users via Better Auth - importing create-test-users-better-auth.ts')
      await import('./create-test-users-better-auth.js')
    }
  })

// Password management commands  
program
  .command('fix-passwords')
  .description('Fix user password hashes for Better Auth compatibility')
  .option('-p, --production', 'Fix production passwords (use with caution)')
  .action(async (options) => {
    if (options.production) {
      console.log('🔐 Fixing production passwords - importing fix-production-passwords.ts')
      await import('./fix-production-passwords.js')
    } else {
      console.log('🔐 Fixing password hashes - importing fix-better-auth-password-hashes.ts') 
      await import('./fix-better-auth-password-hashes.js')
    }
  })

// Database management commands
program
  .command('reset')
  .description('Reset database to clean state')
  .option('-p, --production', 'Reset production database (DANGEROUS)')
  .action(async (options) => {
    if (options.production) {
      console.log('⚠️  DANGER: Production database reset - importing reset-production-database.ts')
      await import('./reset-production-database.js')
    } else {
      console.log('🔄 Resetting database - importing reset-database.ts')
      await import('./reset-database.js')
    }
  })

// Utility commands
program
  .command('clear-users')
  .description('Clear all users from database')
  .action(async () => {
    console.log('🧹 Clearing users - importing clear-users.ts')
    await import('./clear-users.js')
  })

program
  .command('test-auth')
  .description('Test authentication system')
  .action(async () => {
    console.log('🧪 Testing auth - importing test-better-auth-signin.ts')
    await import('./test-better-auth-signin.js')
  })

program
  .command('fresh-setup')
  .description('Fresh test user setup (cleans and recreates)')
  .action(async () => {
    console.log('🆕 Fresh test setup - importing fresh-test-user-setup.ts')
    await import('./fresh-test-user-setup.js')
  })

// Display help for available commands
program
  .command('list')
  .description('List all available database scripts')
  .action(() => {
    console.log('\n📋 Available Database Scripts:')
    console.log('  seed                - Basic database seeding')
    console.log('  seed --comprehensive - Full test data seeding')
    console.log('  seed --production   - Production seeding (CAUTION)')
    console.log('  create-users        - Create test users (Better Auth)')
    console.log('  create-users --automated - Browser-automated user creation')
    console.log('  create-users --http - HTTP API user creation')
    console.log('  fix-passwords       - Fix password compatibility')
    console.log('  fix-passwords --production - Fix production passwords (CAUTION)')
    console.log('  reset               - Reset local database')
    console.log('  reset --production  - Reset production database (DANGER)')
    console.log('  clear-users         - Remove all users')
    console.log('  test-auth          - Test authentication')
    console.log('  fresh-setup        - Clean setup with new test users')
    console.log('\n💡 Example usage:')
    console.log('  pnpm tsx scripts/db-cli.ts seed --comprehensive')
    console.log('  pnpm tsx scripts/db-cli.ts create-users --automated')
    console.log('  pnpm tsx scripts/db-cli.ts fix-passwords')
    console.log('')
  })

// If no command provided, show help
if (process.argv.length <= 2) {
  program.help()
}

program.parse()