#!/usr/bin/env node

/**
 * Create Test User via Better Auth API
 * 
 * Creates a test user by calling the Better Auth signup API directly
 * This ensures the password is hashed correctly by Better Auth
 */

const axios = require('axios')

async function createUserViaAPI() {
  console.log('🔧 Creating test user via Better Auth API...')
  
  const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:3001'
  const email = 'coach1@ultracoach.dev'
  const password = 'password123'
  const name = 'Sarah Mountain'
  
  try {
    console.log(`Making request to: ${baseURL}/api/auth/sign-up/email`)
    
    const response = await axios.post(`${baseURL}/api/auth/sign-up/email`, {
      email,
      password,
      name,
      role: 'coach' // Add the role field
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    })
    
    console.log('✅ User created successfully via API:')
    console.log('Response status:', response.status)
    console.log('Response data:', response.data)
    
    console.log('\n🎯 Test credentials:')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log(`Role: coach`)
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText)
      console.error('Response data:', error.response.data)
    } else if (error.request) {
      console.error('❌ Network Error:', error.message)
    } else {
      console.error('❌ Error:', error.message)
    }
    
    console.log('\n💡 Alternative: Try creating user in production at:')
    console.log('https://your-app.vercel.app/auth/signup')
  }
}

if (require.main === module) {
  createUserViaAPI()
}