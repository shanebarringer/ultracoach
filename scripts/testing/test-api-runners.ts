#!/usr/bin/env npx tsx
/**
 * Test script to debug /api/runners endpoint issues
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

async function testRunnersAPI() {
  console.log('Testing /api/runners endpoint...')
  console.log('Environment variables:')
  console.log('- BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL)
  console.log('- NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
  const endpoints = [
    `${baseUrl}/api/runners`,
    `${baseUrl}/api/runners/available`,
    `${baseUrl}/api/health`,
  ]

  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing: ${endpoint}`)

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UltraCoach-Test-Script',
        },
      })

      console.log(`Status: ${response.status} ${response.statusText}`)
      console.log('Headers:', Object.fromEntries(response.headers.entries()))

      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = await response.json()
          console.log('Response:', JSON.stringify(data, null, 2))
        } catch (e) {
          console.log('Failed to parse JSON response')
        }
      } else {
        const text = await response.text()
        console.log('Response text (first 200 chars):', text.substring(0, 200))
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
    }
  }
}

// Run the test
testRunnersAPI().catch(console.error)
