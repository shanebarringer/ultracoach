#!/usr/bin/env tsx
import 'dotenv/config'

// Test production API endpoints for runners
async function testProductionRunnersAPI() {
  const baseUrl = 'https://ultracoach.vercel.app'

  console.log('🔍 Testing production runners API endpoints...')

  try {
    // Test basic API health
    console.log('\n1. Testing API health...')
    const healthResponse = await fetch(`${baseUrl}/api/health`)
    console.log('Health response status:', healthResponse.status)

    // Test runners endpoint without auth (should return 401)
    console.log('\n2. Testing runners endpoint without auth...')
    const runnersResponse = await fetch(`${baseUrl}/api/runners`)
    console.log('Runners response status:', runnersResponse.status)
    const runnersData = await runnersResponse.json()
    console.log('Runners response:', runnersData)

    // Test available runners endpoint without auth (should return 401)
    console.log('\n3. Testing available runners endpoint without auth...')
    const availableResponse = await fetch(`${baseUrl}/api/runners/available`)
    console.log('Available runners response status:', availableResponse.status)
    const availableData = await availableResponse.json()
    console.log('Available runners response:', availableData)
  } catch (error) {
    console.error('Error testing production API:', error)
  }
}

testProductionRunnersAPI()
