#!/usr/bin/env tsx
/**
 * Test messaging functionality after Jotai refactor
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('test-messaging')

async function testMessaging() {
  logger.info('Testing messaging functionality...')

  // Sign in as a coach
  const signInResponse = await fetch('http://localhost:3001/api/auth/sign-in/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'sarah@ultracoach.dev',
      password: 'coach123',
    }),
  })

  if (!signInResponse.ok) {
    logger.error('Failed to sign in:', await signInResponse.text())
    return
  }

  const signInData = await signInResponse.json()
  logger.info('Signed in successfully', { userId: signInData.user?.id })

  // Get the session token from cookies
  const cookies = signInResponse.headers.get('set-cookie')
  const sessionToken = cookies?.match(/better-auth.session_token=([^;]+)/)?.[1]

  if (!sessionToken) {
    logger.error('No session token found')
    return
  }

  logger.info('Session token obtained')

  // Send a test message to a runner
  const recipientId = 'rDzHxmyEKJRBdgV8qAGP4XdLCRmq4pOX' // Alex Rivers
  const messageContent = `Test message from Jotai refactor - ${new Date().toISOString()}`

  const sendResponse = await fetch('http://localhost:3001/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
    body: JSON.stringify({
      content: messageContent,
      recipientId: recipientId,
    }),
  })

  if (!sendResponse.ok) {
    logger.error('Failed to send message:', await sendResponse.text())
    return
  }

  const sendData = await sendResponse.json()
  logger.info('Message sent successfully', { messageId: sendData.message?.id })

  // Fetch messages to verify it was stored
  const fetchResponse = await fetch(
    `http://localhost:3001/api/messages?recipientId=${recipientId}`,
    {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    }
  )

  if (!fetchResponse.ok) {
    logger.error('Failed to fetch messages:', await fetchResponse.text())
    return
  }

  const fetchData = await fetchResponse.json()
  const messages = fetchData.messages || []
  const sentMessage = messages.find((msg: any) => msg.content === messageContent)

  if (sentMessage) {
    logger.info('✅ Message found in fetch response - messaging is working!', {
      messageId: sentMessage.id,
      content: sentMessage.content,
    })
  } else {
    logger.error('❌ Message not found in fetch response', {
      totalMessages: messages.length,
      lastMessage: messages[messages.length - 1]?.content,
    })
  }
}

testMessaging().catch(error => {
  logger.error('Test failed:', error)
  process.exit(1)
})
