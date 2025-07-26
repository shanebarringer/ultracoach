#!/usr/bin/env node

/**
 * Secret Rotation System
 *
 * This script helps rotate sensitive credentials safely across environments.
 * It provides backup, validation, and rollback capabilities.
 *
 * Usage:
 *   node scripts/rotate-secrets.js [--secret=name] [--environment=dev|prod] [--dry-run]
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { EnvironmentValidator } = require('./env-validator')

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

// Secrets that can be rotated
const ROTATABLE_SECRETS = {
  BETTER_AUTH_SECRET: {
    type: 'random',
    length: 32,
    format: 'hex',
    description: 'Better Auth encryption secret',
    critical: true,
    requiresRestart: true,
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    type: 'external',
    description: 'Supabase service role key',
    critical: true,
    requiresRestart: true,
    rotationInstructions: [
      '1. Go to Supabase Dashboard > Settings > API',
      '2. Generate new service role key',
      '3. Update environment variable',
      '4. Restart application',
      '5. Revoke old key in dashboard',
    ],
  },
  DATABASE_PASSWORD: {
    type: 'external',
    description: 'Database password',
    critical: true,
    requiresRestart: true,
    rotationInstructions: [
      '1. Connect to database as admin',
      '2. Change user password',
      '3. Update DATABASE_URL with new password',
      '4. Restart application',
      '5. Test database connectivity',
    ],
  },
}

class SecretRotator {
  constructor(options = {}) {
    this.environment = options.environment || 'development'
    this.dryRun = options.dryRun || false
    this.targetSecret = options.secret
    this.backupDir = path.join(process.cwd(), '.env-backups')
    this.rotationLog = path.join(this.backupDir, 'rotation-log.json')
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

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
      this.log('info', `Created backup directory: ${this.backupDir}`)
    }
  }

  loadRotationLog() {
    try {
      if (fs.existsSync(this.rotationLog)) {
        return JSON.parse(fs.readFileSync(this.rotationLog, 'utf8'))
      }
    } catch (error) {
      this.log('warn', 'Failed to load rotation log:', error.message)
    }
    return { rotations: [] }
  }

  saveRotationLog(log) {
    try {
      fs.writeFileSync(this.rotationLog, JSON.stringify(log, null, 2), 'utf8')
    } catch (error) {
      this.log('error', 'Failed to save rotation log:', error.message)
    }
  }

  generateSecret(config) {
    switch (config.type) {
      case 'random':
        if (config.format === 'hex') {
          return crypto.randomBytes(config.length).toString('hex')
        } else if (config.format === 'base64') {
          return crypto.randomBytes(config.length).toString('base64')
        } else {
          return crypto.randomBytes(config.length).toString('base64url').slice(0, config.length)
        }
      default:
        throw new Error(`Cannot generate secret of type: ${config.type}`)
    }
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

  saveEnvironmentFile(envPath, env) {
    const content = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    if (!this.dryRun) {
      fs.writeFileSync(envPath, content, 'utf8')
    }
  }

  createBackup(envPath) {
    if (!fs.existsSync(envPath)) {
      return null
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `env-${this.environment}-${timestamp}.backup`
    const backupPath = path.join(this.backupDir, backupName)

    if (!this.dryRun) {
      fs.copyFileSync(envPath, backupPath)
    }

    this.log('info', `${this.dryRun ? '[DRY RUN] ' : ''}Created backup: ${backupPath}`)
    return backupPath
  }

  async validateEnvironment(envPath) {
    this.log('info', 'Validating environment after rotation...')

    const validator = new EnvironmentValidator({ env: this.environment })
    const env = this.loadEnvironmentFile(envPath)

    // Mock the environment for validation
    Object.entries(env).forEach(([key, value]) => {
      process.env[key] = value
    })

    try {
      const result = await validator.validate()
      return result.valid
    } catch (error) {
      this.log('error', 'Environment validation failed:', error.message)
      return false
    }
  }

  async rotateSecret(secretName) {
    const config = ROTATABLE_SECRETS[secretName]
    if (!config) {
      throw new Error(`Unknown secret: ${secretName}`)
    }

    this.log('info', `${this.dryRun ? '[DRY RUN] ' : ''}Rotating secret: ${secretName}`)
    this.log('info', `Description: ${config.description}`)

    const envPath = path.join(process.cwd(), '.env.local')
    const env = this.loadEnvironmentFile(envPath)

    if (!env[secretName]) {
      throw new Error(`Secret ${secretName} not found in environment file`)
    }

    const oldValue = env[secretName]
    let newValue

    if (config.type === 'random') {
      newValue = this.generateSecret(config)
      this.log('success', `Generated new ${secretName}`)
    } else if (config.type === 'external') {
      this.log('warn', `${secretName} requires manual rotation:`)
      config.rotationInstructions.forEach(instruction => {
        console.log(`  ${instruction}`)
      })

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      newValue = await new Promise(resolve => {
        readline.question(`Enter new value for ${secretName}: `, answer => {
          readline.close()
          resolve(answer.trim())
        })
      })

      if (!newValue) {
        throw new Error('No new value provided')
      }
    }

    // Create backup before rotation
    const backupPath = this.createBackup(envPath)

    // Update environment with new secret
    const updatedEnv = { ...env, [secretName]: newValue }

    if (!this.dryRun) {
      this.saveEnvironmentFile(envPath, updatedEnv)
    }

    this.log('info', `${this.dryRun ? '[DRY RUN] ' : ''}Updated ${secretName} in ${envPath}`)

    // Validate the updated environment
    if (!this.dryRun) {
      const isValid = await this.validateEnvironment(envPath)
      if (!isValid) {
        this.log('error', 'Environment validation failed after rotation')
        this.log('warn', 'You may need to rollback and fix issues manually')
        return false
      }
    }

    // Log the rotation
    const rotationLog = this.loadRotationLog()
    rotationLog.rotations.push({
      secret: secretName,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      backupPath: backupPath,
      oldValueHash: crypto.createHash('sha256').update(oldValue).digest('hex').slice(0, 8),
      newValueHash: crypto.createHash('sha256').update(newValue).digest('hex').slice(0, 8),
      dryRun: this.dryRun,
    })

    if (!this.dryRun) {
      this.saveRotationLog(rotationLog)
    }

    // Show post-rotation instructions
    if (config.requiresRestart) {
      this.log('warn', `⚠️  Application restart required for ${secretName} changes to take effect`)
    }

    if (config.critical) {
      this.log('warn', '🔐 This is a critical secret - monitor application closely after rotation')
    }

    return true
  }

  async rotateAll() {
    this.log(
      'info',
      `${this.dryRun ? '[DRY RUN] ' : ''}Starting bulk secret rotation for ${this.environment}`
    )

    const results = {}

    for (const [secretName, config] of Object.entries(ROTATABLE_SECRETS)) {
      if (config.type === 'random') {
        // Only auto-rotate random secrets
        try {
          const success = await this.rotateSecret(secretName)
          results[secretName] = success
        } catch (error) {
          this.log('error', `Failed to rotate ${secretName}:`, error.message)
          results[secretName] = false
        }
      } else {
        this.log('info', `Skipping ${secretName} (requires manual rotation)`)
        results[secretName] = 'skipped'
      }
    }

    return results
  }

  listBackups() {
    this.ensureBackupDirectory()

    try {
      const files = fs
        .readdirSync(this.backupDir)
        .filter(file => file.endsWith('.backup'))
        .map(file => {
          const stat = fs.statSync(path.join(this.backupDir, file))
          return {
            name: file,
            size: stat.size,
            created: stat.mtime,
          }
        })
        .sort((a, b) => b.created - a.created)

      console.log(`\n${colors.bold}Environment Backups:${colors.reset}`)
      if (files.length === 0) {
        console.log('No backups found')
      } else {
        files.forEach(file => {
          console.log(`  ${file.name} (${file.size} bytes, ${file.created.toISOString()})`)
        })
      }
    } catch (error) {
      this.log('error', 'Failed to list backups:', error.message)
    }
  }

  showRotationHistory() {
    const log = this.loadRotationLog()

    console.log(`\n${colors.bold}Rotation History:${colors.reset}`)
    if (log.rotations.length === 0) {
      console.log('No rotations recorded')
      return
    }

    log.rotations
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10) // Show last 10 rotations
      .forEach(rotation => {
        const status = rotation.dryRun ? '[DRY RUN]' : '[APPLIED]'
        console.log(`  ${rotation.timestamp} - ${rotation.secret} ${status}`)
        console.log(`    Environment: ${rotation.environment}`)
        console.log(
          `    Old hash: ${rotation.oldValueHash}... → New hash: ${rotation.newValueHash}...`
        )
        if (rotation.backupPath) {
          console.log(`    Backup: ${path.basename(rotation.backupPath)}`)
        }
        console.log('')
      })
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2)
  const options = {}
  let command = 'rotate'

  args.forEach(arg => {
    if (arg.startsWith('--environment=') || arg.startsWith('--env=')) {
      options.environment = arg.split('=')[1]
    } else if (arg.startsWith('--secret=')) {
      options.secret = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--list-backups') {
      command = 'list-backups'
    } else if (arg === '--history') {
      command = 'history'
    } else if (arg === '--help') {
      console.log(`
Secret Rotation System

Usage: node scripts/rotate-secrets.js [options] [command]

Commands:
  rotate              Rotate secrets (default)
  --list-backups      List available backups
  --history           Show rotation history

Options:
  --environment=<env>  Target environment (development|production)
  --secret=<name>      Rotate specific secret only
  --dry-run           Show what would be done without making changes
  --help              Show this help message

Examples:
  node scripts/rotate-secrets.js --dry-run
  node scripts/rotate-secrets.js --secret=BETTER_AUTH_SECRET
  node scripts/rotate-secrets.js --environment=production
  node scripts/rotate-secrets.js --list-backups
      `)
      process.exit(0)
    }
  })

  const rotator = new SecretRotator(options)
  rotator.ensureBackupDirectory()

  try {
    switch (command) {
      case 'list-backups':
        rotator.listBackups()
        break
      case 'history':
        rotator.showRotationHistory()
        break
      case 'rotate':
      default:
        if (options.secret) {
          const success = await rotator.rotateSecret(options.secret)
          process.exit(success ? 0 : 1)
        } else {
          const results = await rotator.rotateAll()
          const failures = Object.values(results).filter(r => r === false).length
          process.exit(failures > 0 ? 1 : 0)
        }
        break
    }
  } catch (error) {
    console.error(`${colors.red}[ERROR]${colors.reset} Secret rotation failed:`, error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { SecretRotator, ROTATABLE_SECRETS }
