#!/usr/bin/env tsx
/**
 * Create the missing demo runner user
 */
import { config } from 'dotenv'

// Simple console logger for scripts
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
}

// Load production environment variables
config({ path: '.env.production' })

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL

const user = {
  email: 'demo.runner@ultracoach.com',
  password: 'DemoRunner2024!',
  name: 'Demo Runner',
  role: 'runner',
}

async function createUser() {
  try {
    logger.info(`Creating user: ${user.email}`)

    const response = await fetch(`${BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UltraCoach-Production-Seeder/1.0',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        name: user.name,
        role: user.role,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    logger.info(`✅ Created user: ${user.email} (ID: ${result.user?.id})`)
  } catch (error) {
    logger.error(`❌ Failed to create user:`, error)
  }
}

createUser()
