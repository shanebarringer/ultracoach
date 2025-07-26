#!/usr/bin/env node

/**
 * Environment Variable Validator and Security Checker
 *
 * This script validates environment variables, checks for security issues,
 * and provides guidance for secure environment management.
 *
 * Usage:
 *   node scripts/env-validator.js [--env=development|production] [--fix]
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

// Environment variable definitions
const ENV_DEFINITIONS = {
  // Database Configuration
  DATABASE_URL: {
    required: true,
    type: 'url',
    description: 'PostgreSQL connection string',
    example: 'postgresql://user:pass@host:5432/db',
    security: 'high',
    environments: ['development', 'production'],
  },

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    type: 'url',
    description: 'Supabase project URL',
    example: 'https://project-ref.supabase.co',
    security: 'low',
    environments: ['development', 'production'],
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    type: 'key',
    description: 'Supabase anonymous key',
    example: 'sb_publishable_...',
    security: 'low',
    environments: ['development', 'production'],
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    type: 'key',
    description: 'Supabase service role key',
    example: 'sb_secret_...',
    security: 'critical',
    environments: ['development', 'production'],
  },

  // Better Auth Configuration
  BETTER_AUTH_SECRET: {
    required: true,
    type: 'secret',
    description: 'Better Auth encryption secret',
    example: 'random-32-character-string',
    security: 'critical',
    minLength: 32,
    environments: ['development', 'production'],
  },
  BETTER_AUTH_URL: {
    required: true,
    type: 'url',
    description: 'Better Auth base URL',
    example: 'http://localhost:3001',
    security: 'medium',
    environments: ['development', 'production'],
  },
  NEXT_PUBLIC_BETTER_AUTH_URL: {
    required: true,
    type: 'url',
    description: 'Better Auth public URL',
    example: 'http://localhost:3001',
    security: 'low',
    environments: ['development', 'production'],
  },

  // Application Configuration
  PORT: {
    required: false,
    type: 'number',
    description: 'Application port',
    example: '3001',
    security: 'low',
    default: '3001',
    environments: ['development', 'production'],
  },
  NODE_ENV: {
    required: false,
    type: 'enum',
    description: 'Node environment',
    example: 'development',
    security: 'low',
    values: ['development', 'production', 'test'],
    default: 'development',
    environments: ['development', 'production'],
  },
}

class EnvironmentValidator {
  constructor(options = {}) {
    this.environment = options.env || process.env.NODE_ENV || 'development'
    this.fix = options.fix || false
    this.issues = []
    this.warnings = []
    this.suggestions = []
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString()
    const levelColors = {
      error: colors.red,
      warn: colors.yellow,
      info: colors.blue,
      success: colors.green,
      debug: colors.magenta,
    }

    console.log(
      `${colors.bold}[${timestamp}]${colors.reset} ${levelColors[level]}[${level.toUpperCase()}]${colors.reset} ${message}`,
      ...args
    )
  }

  loadEnvironmentFile(envPath) {
    try {
      if (!fs.existsSync(envPath)) {
        return {}
      }

      const content = fs.readFileSync(envPath, 'utf8')
      const env = {}

      content.split('\n').forEach(line => {
        line = line.trim()
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=')
          if (key && valueParts.length > 0) {
            env[key] = valueParts.join('=').replace(/^["'](.*)["']$/, '$1')
          }
        }
      })

      return env
    } catch (error) {
      this.log('error', `Failed to load environment file: ${envPath}`, error.message)
      return {}
    }
  }

  validateVariable(key, value, definition) {
    const issues = []

    // Check if required variable is missing
    if (definition.required && (!value || value.trim() === '')) {
      issues.push({
        level: 'error',
        message: `Missing required environment variable: ${key}`,
        suggestion: `Add ${key}=${definition.example} to your .env.local file`,
      })
      return issues
    }

    // Skip validation if variable is not set and not required
    if (!value) {
      return issues
    }

    // Type validation
    switch (definition.type) {
      case 'url':
        try {
          new URL(value)
        } catch {
          issues.push({
            level: 'error',
            message: `Invalid URL format for ${key}: ${value}`,
            suggestion: `Use format: ${definition.example}`,
          })
        }
        break

      case 'number':
        if (isNaN(parseInt(value))) {
          issues.push({
            level: 'error',
            message: `Invalid number format for ${key}: ${value}`,
            suggestion: `Use a numeric value like: ${definition.example}`,
          })
        }
        break

      case 'enum':
        if (!definition.values.includes(value)) {
          issues.push({
            level: 'error',
            message: `Invalid value for ${key}: ${value}`,
            suggestion: `Use one of: ${definition.values.join(', ')}`,
          })
        }
        break

      case 'secret':
        if (definition.minLength && value.length < definition.minLength) {
          issues.push({
            level: 'error',
            message: `${key} is too short (${value.length} chars, minimum ${definition.minLength})`,
            suggestion: `Generate a secure secret with: openssl rand -hex 32`,
          })
        }
        break

      case 'key':
        // Validate Supabase key format
        if (key.includes('SUPABASE')) {
          if (key.includes('ANON') && !value.startsWith('eyJ')) {
            issues.push({
              level: 'warn',
              message: `${key} doesn't look like a Supabase anon key`,
              suggestion: 'Verify this is the correct anon key from your Supabase dashboard',
            })
          }
          if (key.includes('SERVICE') && !value.startsWith('eyJ')) {
            issues.push({
              level: 'warn',
              message: `${key} doesn't look like a Supabase service key`,
              suggestion:
                'Verify this is the correct service role key from your Supabase dashboard',
            })
          }
        }
        break
    }

    // Security checks
    this.performSecurityChecks(key, value, definition, issues)

    return issues
  }

  performSecurityChecks(key, value, definition, issues) {
    // Check for common insecure values
    const insecureValues = [
      'password',
      'secret',
      'key',
      'changeme',
      'admin',
      'root',
      '123456',
      'password123',
      'test',
      'development',
      'localhost',
    ]

    if (
      definition.security === 'critical' &&
      insecureValues.some(bad => value.toLowerCase().includes(bad.toLowerCase()))
    ) {
      issues.push({
        level: 'error',
        message: `${key} contains potentially insecure value`,
        suggestion: 'Use a cryptographically secure random value',
      })
    }

    // Check for exposed secrets in public variables
    if (key.startsWith('NEXT_PUBLIC_') && definition.security === 'critical') {
      issues.push({
        level: 'error',
        message: `Critical secret ${key} is exposed as public variable`,
        suggestion: 'Remove NEXT_PUBLIC_ prefix for server-side secrets',
      })
    }

    // Check for hardcoded localhost in production
    if (this.environment === 'production' && value.includes('localhost')) {
      issues.push({
        level: 'error',
        message: `${key} contains localhost in production environment`,
        suggestion: 'Use production URLs for production environment',
      })
    }

    // Check for development values in production
    if (this.environment === 'production' && value.includes('development')) {
      issues.push({
        level: 'warn',
        message: `${key} contains development-related value in production`,
        suggestion: 'Verify this is the correct production value',
      })
    }
  }

  generateSecureValue(definition) {
    switch (definition.type) {
      case 'secret':
        return crypto.randomBytes(32).toString('hex')
      case 'key':
        return crypto.randomBytes(32).toString('base64')
      default:
        return definition.default || definition.example
    }
  }

  createBackup(envPath) {
    if (fs.existsSync(envPath)) {
      const backupPath = `${envPath}.backup.${Date.now()}`
      fs.copyFileSync(envPath, backupPath)
      this.log('info', `Created backup: ${backupPath}`)
      return backupPath
    }
    return null
  }

  fixIssues(env, envPath) {
    if (!this.fix) {
      return env
    }

    let modified = false
    const fixedEnv = { ...env }

    // Generate missing required variables
    Object.entries(ENV_DEFINITIONS).forEach(([key, definition]) => {
      if (definition.required && !fixedEnv[key]) {
        if (definition.type === 'secret' || definition.type === 'key') {
          fixedEnv[key] = this.generateSecureValue(definition)
          this.log('info', `Generated secure value for ${key}`)
          modified = true
        } else if (definition.default) {
          fixedEnv[key] = definition.default
          this.log('info', `Set default value for ${key}: ${definition.default}`)
          modified = true
        }
      }
    })

    // Save fixed environment file
    if (modified) {
      this.createBackup(envPath)
      this.saveEnvironmentFile(envPath, fixedEnv)
      this.log('success', `Fixed environment file: ${envPath}`)
    }

    return fixedEnv
  }

  saveEnvironmentFile(envPath, env) {
    const content = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    fs.writeFileSync(envPath, content, 'utf8')
  }

  async validate() {
    this.log('info', `Validating environment for: ${colors.bold}${this.environment}${colors.reset}`)

    // Determine environment file path
    const envPath = path.join(process.cwd(), '.env.local')
    const examplePath = path.join(process.cwd(), '.env.example')

    // Load environment variables
    const env = this.loadEnvironmentFile(envPath)
    const exampleEnv = this.loadEnvironmentFile(examplePath)

    this.log('info', `Loaded ${Object.keys(env).length} variables from ${envPath}`)

    // Validate each defined variable
    let totalIssues = 0
    let criticalIssues = 0

    Object.entries(ENV_DEFINITIONS).forEach(([key, definition]) => {
      // Skip variables not relevant to current environment
      if (!definition.environments.includes(this.environment)) {
        return
      }

      const value = env[key] || process.env[key]
      const issues = this.validateVariable(key, value, definition)

      issues.forEach(issue => {
        const level = issue.level
        this.log(level, `${key}: ${issue.message}`)
        if (issue.suggestion) {
          this.log('info', `  Suggestion: ${issue.suggestion}`)
        }

        if (level === 'error') {
          totalIssues++
          if (definition.security === 'critical') {
            criticalIssues++
          }
        }
      })
    })

    // Check for unknown variables
    Object.keys(env).forEach(key => {
      if (!ENV_DEFINITIONS[key]) {
        this.log('warn', `Unknown environment variable: ${key}`)
        this.log('info', '  Consider documenting this variable or removing if unused')
      }
    })

    // Fix issues if requested
    if (this.fix && totalIssues > 0) {
      this.log('info', 'Attempting to fix issues...')
      this.fixIssues(env, envPath)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    this.log('info', `Environment validation complete for ${this.environment}`)

    if (totalIssues === 0) {
      this.log('success', '✅ All environment variables are valid!')
    } else {
      this.log('error', `❌ Found ${totalIssues} issues (${criticalIssues} critical)`)
      if (!this.fix) {
        this.log('info', 'Run with --fix to attempt automatic fixes')
      }
    }

    // Security recommendations
    this.printSecurityRecommendations()

    return {
      valid: totalIssues === 0,
      issues: totalIssues,
      critical: criticalIssues,
    }
  }

  printSecurityRecommendations() {
    console.log(`\n${colors.bold}${colors.blue}Security Recommendations:${colors.reset}`)
    console.log('• Rotate secrets regularly (every 90 days)')
    console.log('• Use different values for development and production')
    console.log('• Never commit .env.local to version control')
    console.log('• Use a password manager for sensitive values')
    console.log('• Monitor for exposed secrets in logs and code')
    console.log('• Implement secret scanning in CI/CD pipelines')

    if (this.environment === 'production') {
      console.log('• Use secure secret management services (AWS Secrets Manager, etc.)')
      console.log('• Enable database SSL/TLS connections')
      console.log('• Implement IP whitelisting where possible')
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2)
  const options = {}

  args.forEach(arg => {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1]
    } else if (arg === '--fix') {
      options.fix = true
    } else if (arg === '--help') {
      console.log(`
Environment Variable Validator

Usage: node scripts/env-validator.js [options]

Options:
  --env=<environment>  Target environment (development|production)
  --fix               Attempt to fix issues automatically
  --help              Show this help message

Examples:
  node scripts/env-validator.js
  node scripts/env-validator.js --env=production
  node scripts/env-validator.js --fix
      `)
      process.exit(0)
    }
  })

  const validator = new EnvironmentValidator(options)
  const result = await validator.validate()

  process.exit(result.valid ? 0 : 1)
}

if (require.main === module) {
  main().catch(error => {
    console.error('Validation failed:', error)
    process.exit(1)
  })
}

module.exports = { EnvironmentValidator, ENV_DEFINITIONS }
