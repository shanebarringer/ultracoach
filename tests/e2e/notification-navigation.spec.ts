/**
 * Notification Navigation E2E Tests
 *
 * Tests the notification system's navigation functionality,
 * specifically the "Reply" button for message notifications.
 *
 * Feature: ULT-XXX - Fix notification reply navigation
 */
import { expect, test } from '@playwright/test'

import { waitForHeroUIReady, waitForLoadingComplete } from '../utils/heroui-helpers'

test.describe('Notification Navigation', () => {
  test.describe('Message Notification Reply Navigation', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test.skip('should navigate to conversation when clicking Reply on message notification', async ({
      browser,
    }) => {
      // Skip: Requires seeded conversation data that doesn't exist in CI
      // To run this test locally, ensure coach-runner conversations exist
      // Set up two contexts - one for runner (receiving notifications) and one for coach (sending messages)
      const runnerContext = await browser.newContext({
        storageState: './playwright/.auth/runner.json',
      })
      const coachContext = await browser.newContext({
        storageState: './playwright/.auth/coach.json',
      })

      try {
        const runnerPage = await runnerContext.newPage()
        const coachPage = await coachContext.newPage()

        // Step 1: Runner navigates to dashboard
        await runnerPage.goto('/dashboard/runner')
        await expect(runnerPage).toHaveURL('/dashboard/runner', { timeout: 10000 })
        await waitForHeroUIReady(runnerPage)

        // Step 2: Coach navigates to chat and sends a message to runner
        await coachPage.goto('/chat')
        await expect(coachPage).toHaveURL('/chat', { timeout: 10000 })
        await waitForLoadingComplete(coachPage)

        // Find and open a conversation with the runner
        const conversation = coachPage.locator('[data-testid="conversation-item"]').first()
        await expect(conversation).toBeVisible({ timeout: 5000 })
        await conversation.click()
        await coachPage.waitForTimeout(1000)

        // Send a test message that will create a notification
        const testMessage = `Notification test message ${Date.now()}`
        const messageInput = coachPage.getByPlaceholder(/type.*message/i)
        await expect(messageInput).toBeVisible({ timeout: 5000 })
        await messageInput.fill(testMessage)

        const sendButton = coachPage.getByRole('button', { name: /send/i })
        await sendButton.click()

        // Verify message was sent
        await expect(
          coachPage.locator('[data-testid="message-bubble"]').filter({ hasText: testMessage })
        ).toBeVisible({ timeout: 5000 })

        // Wait for notification to be created (backend async)
        await runnerPage.waitForTimeout(2000)

        // Step 3: Runner checks for notification
        const notificationBell = runnerPage
          .locator('button')
          .filter({ has: runnerPage.locator('[class*="lucide-bell"]') })
        await expect(notificationBell).toBeVisible({ timeout: 5000 })

        // Click notification bell
        await notificationBell.click()
        await runnerPage.waitForTimeout(500)

        // Step 4: Verify notification appears with message content
        const notificationDropdown = runnerPage.locator('[role="menu"]')
        await expect(notificationDropdown).toBeVisible({ timeout: 5000 })

        // Look for the notification with our test message
        const messageNotification = runnerPage
          .locator('[data-testid="message-badge"]')
          .or(runnerPage.getByText(/new message from/i))
          .first()

        await expect(messageNotification).toBeVisible({ timeout: 5000 })

        // Step 5: Find and click the Reply button
        const replyButton = runnerPage.getByRole('button', { name: /reply/i })
        await expect(replyButton).toBeVisible({ timeout: 5000 })

        // Get the current URL before clicking
        const currentUrl = runnerPage.url()

        // Click the Reply button
        await replyButton.click()

        // Step 6: Verify navigation to chat page
        await expect(runnerPage).toHaveURL(/\/chat\/[a-zA-Z0-9-_]+/, {
          timeout: 10000,
        })

        // Verify we're no longer on the dashboard
        expect(runnerPage.url()).not.toBe(currentUrl)

        // Step 7: Verify we're in the correct conversation
        // The chat interface should be visible
        await expect(runnerPage.getByPlaceholder(/type.*message/i)).toBeVisible({
          timeout: 5000,
        })

        // The message we received should be visible in the conversation
        await expect(
          runnerPage.locator('[data-testid="message-bubble"]').filter({ hasText: testMessage })
        ).toBeVisible({ timeout: 5000 })
      } finally {
        await runnerContext.close()
        await coachContext.close()
      }
    })

    test.skip('should handle notification click to navigate to conversation', async ({ page }) => {
      // Skip: Requires existing message notifications
      // This test verifies clicking the entire notification item navigates to the conversation
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })
      await waitForHeroUIReady(page)

      // Open notification bell
      const notificationBell = page
        .locator('button')
        .filter({ has: page.locator('[class*="lucide-bell"]') })

      await expect(notificationBell).toBeVisible({ timeout: 5000 })
      await notificationBell.click()
      await page.waitForTimeout(500)

      // Find a message notification
      const messageNotifications = page.locator('[role="menuitem"]').filter({ hasText: /message/i })

      // Assert that we have at least one message notification
      expect(await messageNotifications.count()).toBeGreaterThan(0)

      const firstNotification = messageNotifications.first()
      const currentUrl = page.url()

      // Click the entire notification item (not just the Reply button)
      await firstNotification.click()

      // Should navigate to the conversation
      await expect(page).toHaveURL(/\/chat\/[a-zA-Z0-9-_]+/, {
        timeout: 10000,
      })

      // Verify we navigated away from dashboard
      expect(page.url()).not.toBe(currentUrl)

      // Chat interface should be visible
      await expect(page.getByPlaceholder(/type.*message/i)).toBeVisible({
        timeout: 5000,
      })
    })

    test.skip('should store sender_id in notification data field', async ({ page }) => {
      // Skip: Requires existing message notifications with data field
      // This test verifies that the data field is properly populated with sender_id
      // Navigate to the app first to establish origin and session
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })
      await waitForHeroUIReady(page)

      // Make an API call to fetch notifications
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/notifications?limit=10', {
          credentials: 'same-origin',
        })
        return res.json()
      })

      // Verify response structure
      expect(response).toHaveProperty('notifications')
      expect(Array.isArray(response.notifications)).toBe(true)

      // Find a message type notification
      const messageNotifications = response.notifications.filter(
        (n: { type: string }) => n.type === 'message'
      )

      // Assert we have at least one message notification
      expect(messageNotifications.length).toBeGreaterThan(0)

      const notification = messageNotifications[0]

      // Verify the notification has the data field
      expect(notification).toHaveProperty('data')
      expect(notification.data).toBeTruthy()

      // Verify the data field contains sender_id
      // Data is stored as JSONB object (not string)
      const data = notification.data

      expect(data).toHaveProperty('sender_id')
      expect(typeof data.sender_id).toBe('string')
      expect(data.sender_id.length).toBeGreaterThan(0)

      // Verify message_id is also present
      expect(data).toHaveProperty('message_id')
      expect(typeof data.message_id).toBe('string')
    })
  })

  test.describe('Notification Data Integrity', () => {
    test.use({ storageState: './playwright/.auth/coach.json' })

    test.skip('should create notification with proper metadata when sending message', async ({
      browser,
    }) => {
      // Skip: Requires coach-runner conversation setup
      // To test this locally, ensure coach and runner have active conversations
      const coachContext = await browser.newContext({
        storageState: './playwright/.auth/coach.json',
      })
      const runnerContext = await browser.newContext({
        storageState: './playwright/.auth/runner.json',
      })

      try {
        const coachPage = await coachContext.newPage()
        const runnerPage = await runnerContext.newPage()

        // Runner navigates to dashboard to establish session and origin
        await runnerPage.goto('/dashboard/runner')
        await expect(runnerPage).toHaveURL('/dashboard/runner', { timeout: 10000 })

        // Coach sends a message
        await coachPage.goto('/chat')
        await expect(coachPage).toHaveURL('/chat', { timeout: 10000 })

        const conversation = coachPage.locator('[data-testid="conversation-item"]').first()
        await expect(conversation).toBeVisible({ timeout: 5000 })
        await conversation.click()
        await coachPage.waitForTimeout(1000)

        // Send message
        const testMessage = `Metadata test ${Date.now()}`
        await coachPage.getByPlaceholder(/type.*message/i).fill(testMessage)
        await coachPage.getByRole('button', { name: /send/i }).click()

        // Wait for message to be sent and notification to be created
        await coachPage.waitForTimeout(2000)

        // Runner fetches notifications via API (now with proper origin)
        const runnerNotifications = await runnerPage.evaluate(async () => {
          const res = await fetch('/api/notifications?limit=5&unreadOnly=true', {
            credentials: 'same-origin',
          })
          return res.json()
        })

        // Find the notification for our test message
        const matchingNotification = runnerNotifications.notifications.find(
          (n: { message: string; type: string }) =>
            n.type === 'message' && n.message.includes(testMessage.substring(0, 20))
        )

        // Assert we found the notification
        expect(matchingNotification).toBeDefined()

        // Verify data field structure
        expect(matchingNotification.data).toBeTruthy()

        // Data is stored as JSONB object (not string)
        const data = matchingNotification.data

        // Should have sender_id (the coach's user ID)
        expect(data.sender_id).toBeTruthy()
        expect(typeof data.sender_id).toBe('string')

        // Should have message_id
        expect(data.message_id).toBeTruthy()
        expect(typeof data.message_id).toBe('string')
      } finally {
        await coachContext.close()
        await runnerContext.close()
      }
    })
  })
})
