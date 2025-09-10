/**
 * Messaging System E2E Tests
 *
 * Tests the complete messaging flow between coach and runner:
 * - Authentication for both roles
 * - Navigation to chat interface
 * - Sending and receiving messages
 * - Bidirectional communication
 * - Real-time message updates
 */
import { BrowserContext, Page, expect, test } from '@playwright/test'

// Test credentials
const COACH_CREDENTIALS = {
  email: 'emma@ultracoach.dev',
  password: 'UltraCoach2025!',
  name: 'Emma Mountain',
  userId: 'c3HWnxRfbQ8kUbATjsVEMZURVLdTddEQ', // Updated with actual emma user ID
}

const RUNNER_CREDENTIALS = {
  email: 'riley.parker@ultracoach.dev',
  password: 'RunnerPass2025!',
  name: 'Riley Parker',
  userId: 'gLjsdc0nO2QwaajQSp9nMH7PqNtdssWH', // Updated with actual user ID
}

// Alternative runner credentials for testing
const ALT_RUNNER_CREDENTIALS = {
  email: 'alex.rivera@ultracoach.dev',
  password: 'RunnerPass2025!',
  name: 'Alex Rivera',
  userId: '11IIOMv5CTucdjk0YXUubKVr3i61wLUZ', // Updated with actual user ID
}

async function signIn(page: Page, credentials: typeof COACH_CREDENTIALS) {
  await page.goto('/auth/signin')

  // Wait for form to be ready
  await page.waitForSelector('input[name="email"]')

  await page.fill('input[name="email"]', credentials.email)
  await page.fill('input[name="password"]', credentials.password)

  // Click sign in button
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard or chat (with generous timeout for CI)
  await page.waitForURL(
    url =>
      url.pathname.includes('/dashboard') || url.pathname.includes('/chat') || url.pathname === '/',
    { timeout: 30000 }
  )

  // Wait a bit for session to fully establish
  await page.waitForTimeout(1000)

  // Verify we're actually logged in by checking we're not on signin page
  const currentUrl = page.url()
  if (currentUrl.includes('/auth/signin')) {
    throw new Error(`Login failed - still on signin page. URL: ${currentUrl}`)
  }
}

async function navigateToChat(page: Page, recipientUserId: string) {
  // Navigate directly to chat with specific user
  await page.goto(`/chat/${recipientUserId}`)

  // Check if we got redirected to signin (session expired)
  if (page.url().includes('/auth/signin')) {
    throw new Error(`Redirected to signin - session may have expired. Current URL: ${page.url()}`)
  }

  // Wait for chat interface to load (increased timeout for CI)
  await page.waitForSelector('[data-testid="chat-window"]', { timeout: 30000 })
}

async function sendMessage(page: Page, message: string) {
  // Wait for message input
  await page.waitForSelector('textarea[placeholder*="Type your message"]')

  // Type the message
  await page.fill('textarea[placeholder*="Type your message"]', message)

  // Send the message
  await page.click('button[type="submit"]', { timeout: 5000 })

  // Wait for message to appear in chat
  await page.waitForSelector(`text="${message}"`, { timeout: 10000 })
}

async function waitForMessage(page: Page, message: string, timeout = 15000) {
  await page.waitForSelector(`text="${message}"`, { timeout })
}

test.describe('Messaging System E2E', () => {
  test.describe.configure({ mode: 'parallel' })

  test('Coach can send message to runner', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Sign in as coach
      await signIn(page, COACH_CREDENTIALS)

      // Navigate to chat with runner
      await navigateToChat(page, RUNNER_CREDENTIALS.userId)

      // Send a message
      const testMessage = `Coach message at ${Date.now()}`
      await sendMessage(page, testMessage)

      // Verify message appears in chat
      await expect(page.locator(`text="${testMessage}"`)).toBeVisible()

      // Verify message appears in sender's perspective
      const messageElements = page.locator('[data-testid="message"]')
      await expect(messageElements.filter({ hasText: testMessage })).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Runner can send message to coach', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Sign in as runner
      await signIn(page, RUNNER_CREDENTIALS)

      // Navigate to chat with coach
      await navigateToChat(page, COACH_CREDENTIALS.userId)

      // Send a message
      const testMessage = `Runner message at ${Date.now()}`
      await sendMessage(page, testMessage)

      // Verify message appears in chat
      await expect(page.locator(`text="${testMessage}"`)).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Bidirectional messaging flow', async ({ browser }) => {
    // Create two browser contexts for coach and runner
    const coachContext = await browser.newContext()
    const runnerContext = await browser.newContext()

    const coachPage = await coachContext.newPage()
    const runnerPage = await runnerContext.newPage()

    try {
      // Sign in both users
      await Promise.all([
        signIn(coachPage, COACH_CREDENTIALS),
        signIn(runnerPage, RUNNER_CREDENTIALS),
      ])

      // Navigate both to the same conversation
      await Promise.all([
        navigateToChat(coachPage, RUNNER_CREDENTIALS.userId),
        navigateToChat(runnerPage, COACH_CREDENTIALS.userId),
      ])

      // Coach sends a message
      const coachMessage = `Coach: Let's discuss your training plan - ${Date.now()}`
      await sendMessage(coachPage, coachMessage)

      // Runner should see the coach's message (real-time or after refresh)
      await runnerPage.reload()
      await waitForMessage(runnerPage, coachMessage)

      // Runner responds
      const runnerMessage = `Runner: Sounds great! I'm ready - ${Date.now()}`
      await sendMessage(runnerPage, runnerMessage)

      // Coach should see the runner's message
      await coachPage.reload()
      await waitForMessage(coachPage, runnerMessage)

      // Verify both messages are visible in both conversations
      await expect(coachPage.locator(`text="${coachMessage}"`)).toBeVisible()
      await expect(coachPage.locator(`text="${runnerMessage}"`)).toBeVisible()
      await expect(runnerPage.locator(`text="${coachMessage}"`)).toBeVisible()
      await expect(runnerPage.locator(`text="${runnerMessage}"`)).toBeVisible()
    } finally {
      await Promise.all([coachContext.close(), runnerContext.close()])
    }
  })

  test('Message persistence across page reloads', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Sign in as coach
      await signIn(page, COACH_CREDENTIALS)

      // Navigate to chat
      await navigateToChat(page, RUNNER_CREDENTIALS.userId)

      // Send a message
      const persistentMessage = `Persistent message - ${Date.now()}`
      await sendMessage(page, persistentMessage)

      // Reload the page
      await page.reload()

      // Wait for chat to reload
      await page.waitForSelector('[data-testid="chat-window"]')

      // Verify message is still there
      await waitForMessage(page, persistentMessage)
      await expect(page.locator(`text="${persistentMessage}"`)).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Navigation from conversation list', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Sign in as coach
      await signIn(page, COACH_CREDENTIALS)

      // Go to main chat page
      await page.goto('/chat')

      // Wait for the main chat interface to load
      await page.waitForSelector('[data-testid="conversation-list"]', { timeout: 10000 })

      // Click "Start New Conversation" button to open the new message modal
      await page.click('button:has-text("Start New Conversation")')

      // Wait for the new message modal to open
      await page.waitForSelector('[data-testid="new-message-modal"]', { timeout: 5000 })

      // Look for runner in the available users list using data-testid
      const runnerUserId = RUNNER_CREDENTIALS.userId
      await page.click(`[data-testid="user-option-${runnerUserId}"]`)

      // Should navigate to the specific chat
      await page.waitForURL(`**/chat/${runnerUserId}`)
      await page.waitForSelector('[data-testid="chat-window"]', { timeout: 10000 })

      // Verify we're in the right conversation
      const runnerName = RUNNER_CREDENTIALS.name
      await expect(page.locator(`text="${runnerName}"`)).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Error handling for unauthorized access', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Try to access chat without authentication
      await page.goto('/chat/some-random-user-id')

      // Should redirect to sign in
      await page.waitForURL('**/auth/signin')
    } finally {
      await context.close()
    }
  })

  test('Message input validation', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Sign in as coach
      await signIn(page, COACH_CREDENTIALS)

      // Navigate to chat
      await navigateToChat(page, RUNNER_CREDENTIALS.userId)

      // Try to send empty message
      await page.click('button[type="submit"]')

      // Should not send (button should be disabled or no message appears)
      await page.waitForTimeout(2000) // Give time for any potential message to appear

      // Verify no empty message was sent
      const messageElements = await page.locator('[data-testid="message"]').count()
      const initialCount = messageElements

      // Send a real message
      const realMessage = `Real message - ${Date.now()}`
      await sendMessage(page, realMessage)

      // Should have exactly one more message than before
      const finalCount = await page.locator('[data-testid="message"]').count()
      expect(finalCount).toBe(initialCount + 1)
    } finally {
      await context.close()
    }
  })
})

test.describe('Message Features', () => {
  test('Workout context messaging', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Sign in as coach
      await signIn(page, COACH_CREDENTIALS)

      // Navigate to chat
      await navigateToChat(page, RUNNER_CREDENTIALS.userId)

      // Look for workout link button (if implemented)
      const workoutLinkButton = page.locator(
        'button[aria-label*="workout"], button:has-text("Link")'
      )

      if (await workoutLinkButton.isVisible()) {
        await workoutLinkButton.click()

        // If workout selector modal opens, select a workout
        await page.waitForTimeout(1000)

        // Look for first workout in list
        const firstWorkout = page.locator('[data-testid="workout-item"]').first()
        if (await firstWorkout.isVisible()) {
          await firstWorkout.click()
        }
      }

      // Send message with or without workout context
      const contextMessage = `Workout discussion - ${Date.now()}`
      await sendMessage(page, contextMessage)

      // Verify message was sent
      await expect(page.locator(`text="${contextMessage}"`)).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
