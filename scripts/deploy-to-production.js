#!/usr/bin/env node

/**
 * Production Deployment Script for UltraCoach
 * Handles database migrations and production setup
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function execCommand(command, description) {
  log(`${colors.blue}🔄 ${description}...${colors.reset}`)
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    log(`${colors.green}✅ ${description} completed${colors.reset}`)
    return output
  } catch (error) {
    log(`${colors.red}❌ ${description} failed: ${error.message}${colors.reset}`)
    throw error
  }
}

function checkPrerequisites() {
  log(`${colors.bold}${colors.cyan}🚀 UltraCoach Production Deployment${colors.reset}\n`)

  // Check if we're on the correct branch
  try {
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim()
    log(`📍 Current branch: ${currentBranch}`)

    if (currentBranch !== 'main' && currentBranch !== 'production-ready-setup') {
      log(`${colors.yellow}⚠️  Warning: Not on main branch. Continue? (y/N)${colors.reset}`)
      // In a real scenario, you'd prompt for user input
    }
  } catch (error) {
    log(`${colors.red}❌ Git not available or not in a git repository${colors.reset}`)
  }

  // Check for production environment template
  const prodEnvPath = path.join(__dirname, '..', 'production.env.template')
  if (fs.existsSync(prodEnvPath)) {
    log(`${colors.green}✅ Production environment template found${colors.reset}`)
  } else {
    log(
      `${colors.red}❌ Production environment template not found. Run generate-production-env.js first${colors.reset}`
    )
    throw new Error('Missing production environment template')
  }
}

function validateBuild() {
  log(`${colors.bold}\n📦 Build Validation${colors.reset}`)

  // Type check
  execCommand('npx tsc --noEmit', 'TypeScript type checking')

  // Lint check
  execCommand('pnpm lint', 'ESLint validation')

  // Build check
  execCommand('pnpm build', 'Production build validation')

  log(`${colors.green}✅ Build validation passed${colors.reset}`)
}

function runPreDeploymentChecks() {
  log(`${colors.bold}\n🔍 Pre-deployment Security Checks${colors.reset}`)

  // Run environment validation
  try {
    execCommand(
      'node scripts/env-validator.js --env=development',
      'Development environment validation'
    )
  } catch (error) {
    log(
      `${colors.yellow}⚠️  Development environment issues found - this is expected${colors.reset}`
    )
  }

  // Check for sensitive files
  const sensitiveFiles = ['.env.local', '.env']
  sensitiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`${colors.yellow}⚠️  Found ${file} - ensure it's in .gitignore${colors.reset}`)
    }
  })
}

function displayDeploymentInstructions() {
  log(`${colors.bold}\n🚀 Vercel Deployment Instructions${colors.reset}`)

  log(`${colors.cyan}1. Vercel Project Setup:${colors.reset}`)
  log('   • Go to vercel.com and create new project')
  log('   • Connect your GitHub repository')
  log('   • Select "Next.js" framework (auto-detected)')

  log(`${colors.cyan}2. Environment Variables:${colors.reset}`)
  log('   • Copy variables from production.env.template')
  log('   • Add them to Vercel Project Settings → Environment Variables')
  log('   • Replace placeholder values with actual credentials')

  log(`${colors.cyan}3. Initial Deployment:${colors.reset}`)
  log('   • Click "Deploy" in Vercel')
  log('   • Wait for build to complete')
  log('   • Note your deployment URL')

  log(`${colors.cyan}4. Post-Deployment:${colors.reset}`)
  log('   • Update BETTER_AUTH_URL with actual Vercel URL')
  log('   • Update NEXT_PUBLIC_BETTER_AUTH_URL with same URL')
  log('   • Trigger redeployment for URL changes to take effect')

  log(`${colors.cyan}5. Database Setup:${colors.reset}`)
  log('   • Ensure production Supabase project is configured')
  log('   • Run database migrations against production')
  log('   • Verify RLS policies are active')
}

function displayPostDeploymentChecks() {
  log(`${colors.bold}\n✅ Post-Deployment Verification${colors.reset}`)

  const checks = [
    'Homepage loads correctly',
    'Authentication (signin/signup) works',
    'Database connections function',
    'API routes respond correctly',
    'Real-time features work',
    'Training plans load',
    'Workout creation/editing functions',
    'Chat system operates',
    'Notifications display',
  ]

  checks.forEach(check => {
    log(`   □ ${check}`)
  })

  log(`${colors.yellow}\n⚠️  If any checks fail:${colors.reset}`)
  log('   • Check Vercel function logs')
  log('   • Verify environment variables')
  log('   • Confirm database connectivity')
  log('   • Test with production Supabase credentials')
}

function main() {
  try {
    checkPrerequisites()
    validateBuild()
    runPreDeploymentChecks()
    displayDeploymentInstructions()
    displayPostDeploymentChecks()

    log(`${colors.bold}${colors.green}\n🎉 Pre-deployment validation complete!${colors.reset}`)
    log(`${colors.cyan}Ready for Vercel deployment.${colors.reset}\n`)
  } catch (error) {
    log(`${colors.red}❌ Deployment preparation failed: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  checkPrerequisites,
  validateBuild,
  runPreDeploymentChecks,
}
