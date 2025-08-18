#!/usr/bin/env tsx
/**
 * Test script to debug messaging API issues
 * Tests authentication and message sending
 */
import { config } from 'dotenv'
import fetch from 'node-fetch'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'

interface LoginResponse {
  user: {
    id: string
    email: string
    fullName: string
    role: string
  }
  session: {
    token: string
    expiresAt: string
  }
}

async function testMessagingAPI() {
  console.log('🧪 Testing Messaging API')
  console.log('========================')

  try {
    // Step 1: Sign in as Sarah Chen (coach)
    console.log('1. Signing in as Sarah Chen (coach)...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.TEST_COACH_EMAIL || 'sarah@ultracoach.dev',
        password: process.env.TEST_COACH_PASSWORD || 'UltraCoach2025!',
      }),
    })

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', await loginResponse.text())
      return
    }

    const loginData = (await loginResponse.json()) as LoginResponse
    console.log('✅ Login successful:', {
      userId: loginData.user.id,
      email: loginData.user.email,
      role: loginData.user.role,
    })

    // Extract session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie')
    const sessionCookie = setCookieHeader?.split(';')[0]
    console.log('🍪 Session cookie:', sessionCookie)

    // Step 2: Test sending a message to Alex Rivera (runner)
    console.log('\n2. Sending test message to Alex Rivera...')
    const recipientId = 'i42DUNNIJyQ8zSSrc67jVqooWOW4uJRO' // Alex Rivera's ID
    const testMessage = `Test message from test script at ${new Date().toISOString()}`

    const messageResponse = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie || '',
      },
      body: JSON.stringify({
        content: testMessage,
        recipientId: recipientId,
      }),
    })

    console.log('📡 Message API Response Status:', messageResponse.status)
    console.log(
      '📡 Message API Response Headers:',
      Object.fromEntries(messageResponse.headers.entries())
    )

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error('❌ Message send failed:', errorText)

      // Try to get more details
      try {
        const errorJson = JSON.parse(errorText)
        console.error('💥 Error details:', errorJson)
      } catch {
        console.error('💥 Raw error:', errorText)
      }
      return
    }

    const messageData = await messageResponse.json()
    console.log('✅ Message sent successfully:', {
      messageId: messageData.message?.id,
      content: messageData.message?.content,
      recipientId: messageData.message?.recipient_id,
    })

    // Step 3: Verify message was stored by fetching messages
    console.log('\n3. Fetching messages to verify storage...')
    const fetchResponse = await fetch(`${BASE_URL}/api/messages?recipientId=${recipientId}`, {
      headers: {
        Cookie: sessionCookie || '',
      },
    })

    if (!fetchResponse.ok) {
      console.error('❌ Fetch failed:', await fetchResponse.text())
      return
    }

    const fetchData = await fetchResponse.json()
    console.log('✅ Messages fetched successfully:', {
      messageCount: fetchData.messages?.length || 0,
      latestMessage: fetchData.messages?.[fetchData.messages.length - 1],
    })
  } catch (error) {
    console.error('💥 Test failed with error:', error)
  }
}

// Run the test
if (require.main === module) {
  testMessagingAPI()
}
