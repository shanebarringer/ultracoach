#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 *
 * Validates environment variables for common issues:
 * - Missing required variables
 * - Trailing/leading whitespace in secrets
 * - Invalid URL formats
 * - Common configuration mistakes
 *
 * Usage:
 *   pnpm env:validate           # Validate .env.local (development)
 *   pnpm env:validate --prod    # Validate .env.production
 *   pnpm env:validate --ci      # CI mode (exits with error code on failure)
 *
 * @module scripts/validate-env
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

interface ValidationResult {
  variable: string
  status: 'ok' | 'warning' | 'error'
  message: string
}

interface EnvVarConfig {
  name: string
  required: boolean
  isSecret?: boolean
  isUrl?: boolean
  description: string
  validateFn?: (value: string) => ValidationResult | null
}

// Environment variable definitions
const ENV_VARS: EnvVarConfig[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    isSecret: true,
    isUrl: true,
    description: 'PostgreSQL connection string',
  },

  // Better Auth
  {
    name: 'BETTER_AUTH_SECRET',
    required: true,
    isSecret: true,
    description: 'Better Auth encryption secret (min 32 chars recommended)',
    validateFn: value => {
      if (value.length < 32) {
        return {
          variable: 'BETTER_AUTH_SECRET',
          status: 'warning',
          message: `Secret is ${value.length} chars, recommend at least 32 for security`,
        }
      }
      return null
    },
  },
  {
    name: 'BETTER_AUTH_URL',
    required: false,
    isUrl: true,
    description: 'Better Auth base URL (optional, auto-detected on Vercel)',
  },
  {
    name: 'BETTER_AUTH_TRUSTED_ORIGINS',
    required: false,
    description: 'Comma-separated list of trusted origins',
  },

  // Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    isUrl: true,
    description: 'Supabase project URL',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public key',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false,
    isSecret: true,
    description: 'Supabase service role key (for admin operations)',
  },

  // Strava Integration
  {
    name: 'STRAVA_CLIENT_ID',
    required: false,
    description: 'Strava OAuth client ID',
  },
  {
    name: 'STRAVA_CLIENT_SECRET',
    required: false,
    isSecret: true,
    description: 'Strava OAuth client secret',
  },
  {
    name: 'STRAVA_REDIRECT_URI',
    required: false,
    isUrl: true,
    description: 'Strava OAuth callback URL',
  },
  {
    name: 'STRAVA_WEBHOOK_VERIFY_TOKEN',
    required: false,
    isSecret: true,
    description: 'Strava webhook verification token',
  },

  // Email (Resend)
  {
    name: 'RESEND_API_KEY',
    required: false,
    isSecret: true,
    description: 'Resend API key for transactional emails',
  },
  {
    name: 'RESEND_FROM_EMAIL',
    required: false,
    description: 'From email address for Resend',
  },

  // Vercel/Deployment
  {
    name: 'VERCEL_URL',
    required: false,
    description: 'Vercel deployment URL (auto-set by Vercel)',
  },

  // Application
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    isUrl: true,
    description: 'Public application URL',
  },
  {
    name: 'NEXT_PUBLIC_BASE_URL',
    required: false,
    isUrl: true,
    description: 'Base URL for API calls',
  },

  // Cron/Scheduled Jobs
  {
    name: 'CRON_SECRET',
    required: false,
    isSecret: true,
    description: 'Secret for authenticating cron job requests',
  },

  // Debug/Development
  {
    name: 'NEXT_PUBLIC_DEBUG_ENABLED',
    required: false,
    description: 'Enable debug features in production',
  },
  {
    name: 'DEBUG_AUTH_KEY',
    required: false,
    isSecret: true,
    description: 'Key for accessing debug auth page',
  },
]

/**
 * Check if a value has whitespace issues
 */
function checkWhitespace(name: string, value: string): { hasIssue: boolean; details: string[] } {
  const issues: string[] = []

  if (value !== value.trim()) {
    if (value.startsWith(' ') || value.startsWith('\t')) {
      issues.push('has leading whitespace')
    }
    if (value.endsWith(' ') || value.endsWith('\t')) {
      issues.push('has trailing whitespace')
    }
  }

  if (value.includes('\n')) {
    issues.push('contains newline characters')
  }

  if (value.includes('\r')) {
    issues.push('contains carriage return characters')
  }

  // Check for common copy-paste issues
  if (value.includes('\u00A0')) {
    issues.push('contains non-breaking space (common copy-paste issue)')
  }

  if (value.includes('\u200B')) {
    issues.push('contains zero-width space (common copy-paste issue)')
  }

  return {
    hasIssue: issues.length > 0,
    details: issues,
  }
}

/**
 * Validate a URL format
 */
function validateUrl(name: string, value: string): ValidationResult | null {
  try {
    // Skip validation for placeholder values
    if (value.includes('your-') || value.includes('dummy')) {
      return {
        variable: name,
        status: 'warning',
        message: 'Appears to be a placeholder value',
      }
    }

    new URL(value)
    return null
  } catch {
    // Special case for DATABASE_URL which uses postgres:// protocol
    if (name === 'DATABASE_URL' && value.startsWith('postgres://')) {
      try {
        new URL(value.replace('postgres://', 'http://'))
        return null
      } catch {
        return {
          variable: name,
          status: 'error',
          message: 'Invalid database URL format',
        }
      }
    }

    return {
      variable: name,
      status: 'error',
      message: `Invalid URL format: ${value.substring(0, 30)}...`,
    }
  }
}

/**
 * Validate a single environment variable
 */
function validateEnvVar(config: EnvVarConfig, value: string | undefined): ValidationResult[] {
  const results: ValidationResult[] = []

  // Check if required variable is missing
  if (!value) {
    if (config.required) {
      results.push({
        variable: config.name,
        status: 'error',
        message: `Missing required variable: ${config.description}`,
      })
    }
    return results
  }

  // Check for whitespace issues (critical for secrets)
  const whitespaceCheck = checkWhitespace(config.name, value)
  if (whitespaceCheck.hasIssue) {
    results.push({
      variable: config.name,
      status: config.isSecret ? 'error' : 'warning',
      message: `Whitespace issue: ${whitespaceCheck.details.join(', ')}`,
    })
  }

  // Check URL format
  if (config.isUrl) {
    const urlResult = validateUrl(config.name, value)
    if (urlResult) {
      results.push(urlResult)
    }
  }

  // Run custom validation
  if (config.validateFn) {
    const customResult = config.validateFn(value)
    if (customResult) {
      results.push(customResult)
    }
  }

  // Check for empty values
  if (value.trim() === '') {
    results.push({
      variable: config.name,
      status: config.required ? 'error' : 'warning',
      message: 'Variable is set but empty',
    })
  }

  return results
}

/**
 * Print a formatted result
 */
function printResult(result: ValidationResult): void {
  const icon = result.status === 'ok' ? '✓' : result.status === 'warning' ? '⚠' : '✗'
  const color =
    result.status === 'ok' ? colors.green : result.status === 'warning' ? colors.yellow : colors.red

  console.log(`  ${color}${icon}${colors.reset} ${result.variable}: ${result.message}`)
}

/**
 * Print a success message for a variable
 */
function printSuccess(name: string, isSecret: boolean): void {
  const maskedInfo = isSecret ? ' (validated, value hidden)' : ''
  console.log(`  ${colors.green}✓${colors.reset} ${name}: OK${maskedInfo}`)
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const isProd = args.includes('--prod') || args.includes('--production')
  const isCi = args.includes('--ci') || process.env.CI === 'true'
  const isVerbose = args.includes('--verbose') || args.includes('-v')

  // Determine which env file to load
  const envFile = isProd ? '.env.production' : '.env.local'
  const envPath = resolve(process.cwd(), envFile)

  console.log(`\n${colors.cyan}━━━ Environment Variable Validation ━━━${colors.reset}\n`)
  console.log(`${colors.dim}Environment:${colors.reset} ${isProd ? 'Production' : 'Development'}`)
  console.log(`${colors.dim}File:${colors.reset} ${envFile}`)
  console.log(`${colors.dim}Mode:${colors.reset} ${isCi ? 'CI (strict)' : 'Interactive'}\n`)

  // Check if env file exists
  if (!existsSync(envPath)) {
    console.log(`${colors.yellow}⚠${colors.reset} Environment file not found: ${envFile}`)
    console.log(`  ${colors.dim}Will check existing process.env values${colors.reset}\n`)
  } else {
    // Load environment variables
    config({ path: envPath })
    console.log(`${colors.green}✓${colors.reset} Loaded ${envFile}\n`)
  }

  const allResults: ValidationResult[] = []
  let errorCount = 0
  let warningCount = 0

  // Group variables by category for cleaner output
  const categories = [
    { name: 'Database', prefix: 'DATABASE' },
    { name: 'Better Auth', prefix: 'BETTER_AUTH' },
    { name: 'Supabase', prefix: 'SUPABASE' },
    { name: 'Strava', prefix: 'STRAVA' },
    { name: 'Email', prefix: 'RESEND' },
    { name: 'Application', prefix: 'NEXT_PUBLIC' },
    { name: 'Other', prefix: '' },
  ]

  for (const category of categories) {
    const categoryVars = ENV_VARS.filter(v => {
      if (category.prefix === '') {
        // "Other" category catches anything not in above categories
        return !categories.slice(0, -1).some(c => v.name.includes(c.prefix))
      }
      return v.name.includes(category.prefix)
    })

    if (categoryVars.length === 0) continue

    console.log(`${colors.blue}${category.name}:${colors.reset}`)

    for (const envConfig of categoryVars) {
      const value = process.env[envConfig.name]
      const results = validateEnvVar(envConfig, value)

      if (results.length > 0) {
        for (const result of results) {
          printResult(result)
          allResults.push(result)
          if (result.status === 'error') errorCount++
          if (result.status === 'warning') warningCount++
        }
      } else if (value && isVerbose) {
        printSuccess(envConfig.name, envConfig.isSecret ?? false)
      } else if (value) {
        // Show condensed success
        printSuccess(envConfig.name, envConfig.isSecret ?? false)
      } else if (isVerbose) {
        console.log(`  ${colors.dim}○ ${envConfig.name}: Not set (optional)${colors.reset}`)
      }
    }

    console.log() // Add spacing between categories
  }

  // Summary
  console.log(`${colors.cyan}━━━ Summary ━━━${colors.reset}\n`)

  if (errorCount === 0 && warningCount === 0) {
    console.log(
      `${colors.green}✓ All environment variables validated successfully!${colors.reset}\n`
    )
  } else {
    if (errorCount > 0) {
      console.log(`${colors.red}✗ ${errorCount} error(s) found${colors.reset}`)
    }
    if (warningCount > 0) {
      console.log(`${colors.yellow}⚠ ${warningCount} warning(s) found${colors.reset}`)
    }
    console.log()
  }

  // Helpful tips for common issues
  if (allResults.some(r => r.message.includes('whitespace'))) {
    console.log(`${colors.cyan}Tip:${colors.reset} Whitespace issues are often caused by:`)
    console.log('  • Copy-pasting from web interfaces or documents')
    console.log('  • Editor auto-formatting adding trailing newlines')
    console.log('  • Shell history with extra spaces')
    console.log(
      `  • Use ${colors.dim}cat -A .env.local | grep VAR_NAME${colors.reset} to inspect\n`
    )
  }

  // Exit with error code in CI mode
  if (isCi && errorCount > 0) {
    console.log(`${colors.red}Exiting with error code 1 (CI mode)${colors.reset}\n`)
    process.exit(1)
  }

  // In CI, also fail on warnings for secrets
  if (isCi && allResults.some(r => r.status === 'warning' && r.message.includes('whitespace'))) {
    console.log(
      `${colors.yellow}Exiting with error code 1 (whitespace warnings in CI)${colors.reset}\n`
    )
    process.exit(1)
  }
}

main().catch(error => {
  console.error(`${colors.red}Validation script error:${colors.reset}`, error)
  process.exit(1)
})
