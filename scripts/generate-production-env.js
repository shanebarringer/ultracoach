#!/usr/bin/env node

/**
 * Production Environment Generator for Vercel Deployment
 * Generates secure environment variables for production use
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Generate cryptographically secure random strings
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex')
}

// Generate production environment template
function generateProductionEnv() {
  const timestamp = new Date().toISOString()
  const betterAuthSecret = generateSecureSecret(32) // 64 character hex string

  const productionEnv = `# UltraCoach Production Environment Variables
# Generated: ${timestamp}
# 
# IMPORTANT: 
# - Replace YOUR_PROJECT_REF with your actual Supabase project reference
# - Replace YOUR_PASSWORD with your actual database password
# - Replace your-app-name with your actual Vercel app name
# - Replace placeholder keys with actual Supabase production keys

# Better Auth Configuration (PRODUCTION - SECURE)
BETTER_AUTH_SECRET=${betterAuthSecret}
BETTER_AUTH_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-app-name.vercel.app

# Database Configuration (PRODUCTION)
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres

# Supabase Configuration (PRODUCTION)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key-here

# Production Settings
NODE_ENV=production
PORT=3000

# MCP Server Environment Variables (Optional)
GITHUB_TOKEN=your-github-token-here
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

# Security Notes:
# - All secrets above are newly generated for production
# - Never use development secrets in production
# - Rotate secrets regularly (every 90 days)
# - Monitor for exposed secrets in logs
`

  return {
    content: productionEnv,
    betterAuthSecret,
    timestamp,
  }
}

// Main execution
function main() {
  console.log('🔐 Generating Production Environment Variables...\n')

  const { content, betterAuthSecret, timestamp } = generateProductionEnv()

  // Write to file
  const outputPath = path.join(__dirname, '..', 'production.env.template')
  fs.writeFileSync(outputPath, content)

  console.log('✅ Production environment template generated!')
  console.log(`📁 Location: ${outputPath}`)
  console.log(`⏰ Generated: ${timestamp}\n`)

  console.log('🚀 Next Steps for Vercel Deployment:')
  console.log('1. Copy variables from production.env.template')
  console.log('2. Replace placeholder values with actual Supabase credentials')
  console.log('3. Add all variables to Vercel project settings')
  console.log('4. Update BETTER_AUTH_URL after first deployment\n')

  console.log('🔑 Generated Secrets:')
  console.log(`BETTER_AUTH_SECRET: ${betterAuthSecret}`)
  console.log("\n⚠️  Save this secret securely - it's needed for production!\n")

  console.log('📋 Vercel Environment Variables Checklist:')
  console.log('□ BETTER_AUTH_SECRET (generated above)')
  console.log('□ BETTER_AUTH_URL (update after deployment)')
  console.log('□ NEXT_PUBLIC_BETTER_AUTH_URL (update after deployment)')
  console.log('□ DATABASE_URL (production Supabase)')
  console.log('□ NEXT_PUBLIC_SUPABASE_URL (production)')
  console.log('□ NEXT_PUBLIC_SUPABASE_ANON_KEY (production)')
  console.log('□ SUPABASE_SERVICE_ROLE_KEY (production)')
  console.log('□ NODE_ENV=production')
  console.log('□ PORT=3000')
}

if (require.main === module) {
  main()
}

module.exports = { generateProductionEnv, generateSecureSecret }
