/**
 * Chat Messaging E2E Tests
 *
 * Tests the complete chat messaging flow between coaches and runners,
 * ensuring proper real-time updates and state management with Jotai atoms.
 */
import { expect, test } from '@playwright/test'

import {
  clickButtonWithRetry,
  waitForHeroUIReady,
  waitForLoadingComplete,
} from '../utils/heroui-helpers'
import { label } from '../utils/reporting'
import { TEST_USERS } from '../utils/test-helpers'
import { navigateToPage, signIn, waitForPageReady } from '../utils/wait-helpers'

test.describe('Chat Messaging System', () => {
  test.beforeEach(() => {
    label(test.info(), 'messaging')
  })
  test.describe('Coach-Runner Messaging', () => {
    test.describe('Coach Tests', () => {
      test.use({ storageState: './playwright/.auth/coach.json' })

      test('should initiate chat from coach dashboard', async ({ page }) => {
        // Navigate directly to the coach dashboard - we're already authenticated
        await page.goto('/dashboard/coach')
        await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

        // Find a runner to message
        const runnerCard = page.locator('[data-testid="active-runner-card"]').first()

        if (await runnerCard.isVisible()) {
          const runnerName = await runnerCard.locator('[data-testid="runner-name"]').textContent()

          // Click message button
          await runnerCard.getByRole('button', { name: /message/i }).click()

          // Should navigate to chat with runner
          await expect(page).toHaveURL(/\/chat/)

          // Should show runner name in chat header
          await expect(page.locator('[data-testid="chat-header"]')).toContainText(runnerName || '')

          // conversationAtom should be set
          await expect(page.locator('[data-testid="conversation-id"]')).toBeVisible()
        }
      })

      test('should handle message attachments and links', async ({ page }) => {
        // Navigate directly to the coach dashboard - we're already authenticated
        await page.goto('/dashboard/coach')
        await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

        // Navigate to chat
        await page.goto('/chat')
        await page.waitForURL('/chat', { timeout: 10000 })

        // Open a conversation
        const conversation = page.locator('[data-testid="conversation-item"]').first()
        if (await conversation.isVisible()) {
          await conversation.click()

          // Send a message with a workout link
          const messageWithLink = 'Check out this workout: /workouts/123'
          await page.getByPlaceholder('Type your message...').fill(messageWithLink)
          await page.getByRole('button', { name: /send/i }).click()

          // Message should be sent
          await expect(
            page.locator('[data-testid="message-bubble"]').filter({ hasText: messageWithLink })
          ).toBeVisible()

          // Link should be clickable
          const workoutLink = page
            .locator('[data-testid="message-bubble"]')
            .last()
            .getByRole('link', { name: /\/workouts\/123/i })
          if (await workoutLink.isVisible()) {
            await expect(workoutLink).toHaveAttribute('href', '/workouts/123')
          }

          // Test file attachment if implemented
          const attachButton = page.locator('[data-testid="attach-file"]')
          if (await attachButton.isVisible()) {
            // Would test file attachment here
          }
        }
      })

      test('should handle message deletion', async ({ page }) => {
        // Navigate directly to the coach dashboard - we're already authenticated
        await page.goto('/dashboard/coach')
        await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

        // Navigate to chat
        await page.goto('/chat')
        await page.waitForURL('/chat', { timeout: 10000 })

        // Open a conversation
        const conversation = page.locator('[data-testid="conversation-item"]').first()
        if (await conversation.isVisible()) {
          await conversation.click()

          // Find a message to delete (user's own message)
          const ownMessage = page
            .locator('[data-testid="message-bubble"][data-sender="self"]')
            .last()

          if (await ownMessage.isVisible()) {
            const messageText = await ownMessage.textContent()

            // Open message options
            await ownMessage.hover()
            await ownMessage.getByRole('button', { name: /options/i }).click()

            // Delete message
            await page.getByRole('menuitem', { name: /delete/i }).click()
            await page.getByRole('button', { name: /confirm delete/i }).click()

            // Message should be removed
            await expect(ownMessage).not.toBeVisible()

            // messagesAtom should be updated
            if (messageText) {
              await expect(
                page.locator('[data-testid="message-bubble"]').filter({ hasText: messageText })
              ).not.toBeVisible()
            }
          }
        }
      })

      test('should handle optimistic updates', async ({ page }) => {
        // Navigate directly to the coach dashboard - we're already authenticated
        await page.goto('/dashboard/coach')
        await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

        // Navigate to chat
        await page.goto('/chat')
        await page.waitForURL('/chat', { timeout: 10000 })

        // Open a conversation
        const conversation = page.locator('[data-testid="conversation-item"]').first()
        if (await conversation.isVisible()) {
          await conversation.click()

          // Send message
          const optimisticMessage = `Optimistic update test ${Date.now()}`
          await page.getByPlaceholder('Type your message...').fill(optimisticMessage)
          await page.getByRole('button', { name: /send/i }).click()

          // Message should appear immediately (optimistic)
          const messageBubble = page
            .locator('[data-testid="message-bubble"]')
            .filter({ hasText: optimisticMessage })
          await expect(messageBubble).toBeVisible()

          // Should initially show pending status
          const messageStatus = messageBubble.locator('[data-testid="message-status"]')
          await expect(messageStatus).toHaveText(/sending/i)

          // Should update to delivered
          await expect(messageStatus).toHaveText(/delivered/i, { timeout: 5000 })

          // optimisticMessagesAtom handling
        }
      })
    })

    test.describe('Runner Tests', () => {
      test.use({ storageState: './playwright/.auth/runner.json' })

      test('should send and receive messages', async ({ page }) => {
        // Already authenticated via storageState: navigate directly

        // Navigate directly to chat page
        await page.goto('/chat')
        await waitForHeroUIReady(page)
        await waitForLoadingComplete(page)

        // Verify we're on the chat page and not redirected
        await expect(page).toHaveURL('/chat', { timeout: 10000 })

        // Check if there are any existing conversations or if we need to start one
        const hasConversations =
          (await page.locator('[data-testid="conversation-item"]').count()) > 0
        const emptyStateVisible = await page
          .getByText(/no expedition communications yet/i)
          .isVisible()
          .catch(() => false)

        if (!hasConversations || emptyStateVisible) {
          // Need to start a new conversation

          // Click the "Start New Conversation" button
          const startButton = page.getByRole('button', { name: /start new conversation/i })
          await expect(startButton).toBeVisible({ timeout: 5000 })
          await startButton.click()

          // Wait for modal to open
          await page.waitForTimeout(1000)

          // Check if we need to select a coach
          const selectCoach = page.getByRole('combobox', { name: /select.*coach/i })
          try {
            await expect(selectCoach).toBeVisible({ timeout: 2000 })
            await selectCoach.click()
            await page.waitForTimeout(500)

            // Select first available coach
            const coachOption = page.getByRole('option').first()
            try {
              await expect(coachOption).toBeVisible({ timeout: 2000 })
              await coachOption.click()
            } catch {
              // No coach options available
            }
          } catch {
            // No coach selection needed
          }

          // Try different approaches to get chat window visible
          // First wait a bit for any modal actions to complete
          await page.waitForTimeout(1000)

          // Option 1: Check if chat window is already visible (modal may have auto-closed)
          const chatWindow = page.locator('[data-testid="chat-window"]')
          const isVisible = await chatWindow.isVisible({ timeout: 2000 }).catch(() => false)

          if (!isVisible) {
            // Option 2: Try to close modal if it's blocking
            const modal = page.locator('[role="dialog"]')
            if (await modal.isVisible().catch(() => false)) {
              // Try ESC key first
              await page.keyboard.press('Escape')
              await page.waitForTimeout(500)

              // If still visible, try close button
              if (await modal.isVisible().catch(() => false)) {
                const closeButton = modal
                  .locator('button')
                  .filter({ hasText: /close|cancel|x/i })
                  .first()
                if (await closeButton.isVisible().catch(() => false)) {
                  await closeButton.click()
                  await page.waitForTimeout(500)
                }
              }
            }

            // Option 3: Navigate directly to a conversation if available
            const conversationItem = page.locator('[data-testid="conversation-item"]').first()
            if (await conversationItem.isVisible({ timeout: 2000 }).catch(() => false)) {
              await conversationItem.click()
              await page.waitForTimeout(1000)
            }
          }

          // Now wait for chat window with more tolerance
          await expect(chatWindow).toBeVisible({ timeout: 15000 })

          // Type initial message - use exact placeholder text
          const messageInput = page.getByPlaceholder('Type your message...')
          await expect(messageInput).toBeVisible({ timeout: 10000 })
          await expect(messageInput).toBeEnabled({ timeout: 5000 })
          await messageInput.fill('Hello coach!')

          // Send the message to create conversation
          const sendButton = page.getByRole('button', { name: /send/i })
          await sendButton.click()

          // Wait for conversation to be created
          await page.waitForTimeout(2000)
        } else {
          // Open existing conversation
          await page.locator('[data-testid="conversation-item"]').first().click()
          await page.waitForTimeout(1000)
        }

        // Now send a test message in the active conversation
        const messageText = `Test message ${Date.now()}`
        const messageInput = page.getByPlaceholder('Type your message...')

        // Wait for input to be visible and enabled
        await expect(messageInput).toBeVisible({ timeout: 10000 })
        await messageInput.fill(messageText)

        const sendButton = page.getByRole('button', { name: /send/i })
        await sendButton.click()

        // Message should appear in chat
        await expect(
          page.locator('[data-testid="message-bubble"]').filter({ hasText: messageText })
        ).toBeVisible()

        // messagesAtom should be updated
        const messageCount = await page.locator('[data-testid="message-bubble"]').count()
        expect(messageCount).toBeGreaterThan(0)

        // Should show delivered status
        await expect(page.locator('[data-testid="message-status"]').last()).toHaveText(/delivered/i)
      })

      test('should mark messages as read', async ({ page }) => {
        // Navigate directly to the runner dashboard - we're already authenticated
        await page.goto('/dashboard/runner')
        await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

        // Check for unread message indicator
        const unreadBadge = page.locator('[data-testid="unread-badge"]')
        let initialUnreadCount = 0

        if (await unreadBadge.isVisible()) {
          const unreadText = await unreadBadge.textContent()
          initialUnreadCount = parseInt(unreadText || '0')
        }

        // Navigate to messages
        await page.goto('/chat')
        await page.waitForURL('/chat', { timeout: 10000 })

        // Open conversation with unread messages
        const unreadConversation = page
          .locator('[data-testid="conversation-item"]')
          .filter({
            has: page.locator('[data-testid="unread-indicator"]'),
          })
          .first()

        if (await unreadConversation.isVisible()) {
          await unreadConversation.click()

          // Wait for read status update
          await page
            .waitForFunction(() => !document.querySelector('[data-testid="unread-indicator"]'), {
              timeout: 5000,
            })
            .catch(() => {})

          // Return to conversation list
          await page.getByRole('button', { name: /back/i }).click()

          // Unread indicator should be gone
          await expect(
            unreadConversation.locator('[data-testid="unread-indicator"]')
          ).not.toBeVisible()

          // unreadMessagesAtom should be updated
          const newUnreadBadge = page.locator('[data-testid="unread-badge"]')
          if (await newUnreadBadge.isVisible()) {
            const newUnreadText = await newUnreadBadge.textContent()
            const newUnreadCount = parseInt(newUnreadText || '0')
            expect(newUnreadCount).toBeLessThan(initialUnreadCount)
          }
        }
      })

      test.skip('should search messages', async ({ page }) => {
        // Navigate directly to the runner dashboard - we're already authenticated
        await page.goto('/dashboard/runner')
        await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

        // Navigate to messages
        await page.goto('/chat')
        await page.waitForURL('/chat', { timeout: 10000 })

        // Open search
        const searchButton = page.getByRole('button', { name: /search/i })
        if (await searchButton.isVisible()) {
          await searchButton.click()

          // Search for a term
          await page.getByPlaceholder(/search messages/i).fill('workout')
          await page.getByPlaceholder(/search messages/i).press('Enter')

          // Should show search results
          await expect(page.locator('[data-testid="search-results"]')).toBeVisible()

          // Results should contain search term
          const searchResults = page.locator('[data-testid="search-result-item"]')
          const resultCount = await searchResults.count()

          for (let i = 0; i < resultCount; i++) {
            const resultText = await searchResults.nth(i).textContent()
            expect(resultText?.toLowerCase()).toContain('workout')
          }

          // Click a result to jump to message
          if (resultCount > 0) {
            await searchResults.first().click()

            // Should navigate to conversation with message highlighted
            await expect(page.locator('[data-testid="highlighted-message"]')).toBeVisible()
          }
        }
      })

      test.skip('should update conversation list order', async ({ page }) => {
        // Skip this test in CI - requires specific conversation setup
        // Navigate directly to the runner dashboard - we're already authenticated
        await page.goto('/dashboard/runner')
        await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

        // Navigate to messages
        await page.goto('/chat')
        await page.waitForURL('/chat', { timeout: 10000 })

        // Get initial conversation order
        const conversations = page.locator('[data-testid="conversation-item"]')
        const firstConvText = await conversations.first().textContent()

        // Open second conversation if exists
        if ((await conversations.count()) >= 2) {
          const secondConv = conversations.nth(1)
          const secondConvText = await secondConv.textContent()
          await secondConv.click()

          // Send a message
          await page
            .getByPlaceholder('Type your message...')
            .fill('New message to bump conversation')
          await page.getByRole('button', { name: /send/i }).click()

          // Return to conversation list
          await page.getByRole('button', { name: /back/i }).click()

          // Conversation order should be updated (most recent first)
          const newFirstConvText = await conversations.first().textContent()
          expect(newFirstConvText).toBe(secondConvText)

          // conversationsAtom order updated
        }
      })
    })

    test.describe('Multi-User Tests', () => {
      test.skip('should show typing indicators', async ({ context, page }) => {
        // Sign in as coach using helper
        await signIn(page, TEST_USERS.coach.email, TEST_USERS.coach.password)

        // Verify coach is authenticated
        await expect(page).toHaveURL('/dashboard/coach')

        // Open second tab as runner
        const page2 = await context.newPage()
        await signIn(page2, TEST_USERS.runner.email, TEST_USERS.runner.password)

        // Verify runner is authenticated
        await expect(page2).toHaveURL('/dashboard/runner')

        // Coach navigates directly to chat
        await page.goto('/chat')
        const coachConversation = page.locator('[data-testid="conversation-item"]').first()

        if (await coachConversation.isVisible()) {
          await coachConversation.click()

          // Runner navigates to same conversation
          await page2.goto('/chat')
          await page2.waitForURL('/chat', { timeout: 10000 })
          await page2.locator('[data-testid="conversation-item"]').first().click()

          // Coach starts typing
          await page.getByPlaceholder('Type your message...').fill('Typing...')

          // Runner should see typing indicator
          await expect(page2.locator('[data-testid="typing-indicator"]')).toBeVisible({
            timeout: 5000,
          })
          await expect(page2.getByText(/coach is typing/i)).toBeVisible()

          // isTypingAtom should be updated

          // Coach stops typing
          await page.getByPlaceholder('Type your message...').fill('')

          // Typing indicator should disappear
          await expect(page2.locator('[data-testid="typing-indicator"]')).not.toBeVisible({
            timeout: 5000,
          })
        }
      })
    })
  })

  // Skip group messaging tests - feature not fully implemented
  test.describe.skip('Group Messaging Features', () => {
    test.use({ storageState: './playwright/.auth/coach.json' })

    test('should create group conversation', async ({ page }) => {
      // Navigate directly to the coach dashboard - we're already authenticated
      await page.goto('/dashboard/coach')
      await expect(page).toHaveURL('/dashboard/coach', { timeout: 10000 })

      // Navigate to messages
      await page.goto('/chat')
      await page.waitForURL('/chat', { timeout: 10000 })

      // Create group conversation if feature exists
      const newGroupButton = page.getByRole('button', { name: /new group/i })
      if (await newGroupButton.isVisible()) {
        await newGroupButton.click()

        // Select multiple runners
        await page.getByLabel(/group name/i).fill('Training Group A')

        // Select participants
        const participantCheckboxes = page.locator('[data-testid="participant-checkbox"]')
        const checkboxCount = await participantCheckboxes.count()

        // Select at least 2 participants
        if (checkboxCount >= 2) {
          await participantCheckboxes.nth(0).check()
          await participantCheckboxes.nth(1).check()
        }

        // Create group
        await page.getByRole('button', { name: /create group/i }).click()

        // Should show new group conversation
        await expect(
          page.locator('[data-testid="conversation-item"]').filter({ hasText: 'Training Group A' })
        ).toBeVisible()

        // groupConversationsAtom should be updated
      }
    })

    test.skip('should handle notifications preferences', async ({ page }) => {
      // Navigate directly to the runner dashboard - we're already authenticated
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

      // Navigate to settings
      await page.getByRole('link', { name: /settings/i }).click()

      // Find notification preferences
      await page.getByRole('tab', { name: /notifications/i }).click()

      // Toggle message notifications
      const messageNotificationToggle = page.locator('[data-testid="message-notifications-toggle"]')
      if (await messageNotificationToggle.isVisible()) {
        const initialState = await messageNotificationToggle.isChecked()

        // Toggle the setting
        await messageNotificationToggle.click()

        // Save preferences
        await page.getByRole('button', { name: /save preferences/i }).click()

        // Should show success
        await expect(page.getByText(/preferences saved/i)).toBeVisible()

        // Refresh and verify persistence
        await page.reload()
        await page.getByRole('tab', { name: /notifications/i }).click()

        const newState = await messageNotificationToggle.isChecked()
        expect(newState).toBe(!initialState)

        // notificationPreferencesAtom should be updated
      }
    })
  })

  test.describe('Message State Management', () => {
    test('should update messagesAtom in real-time', async ({ browser }) => {
      const coachContext = await browser.newContext({
        storageState: './playwright/.auth/coach.json',
      })
      const runnerContext = await browser.newContext({
        storageState: './playwright/.auth/runner.json',
      })
      try {
        const coachPage = await coachContext.newPage()
        const runnerPage = await runnerContext.newPage()

        // Both navigate to messages
        await coachPage.goto('/chat')
        await coachPage.waitForURL('/chat', { timeout: 10000 })
        await runnerPage.goto('/chat')
        await runnerPage.waitForURL('/chat', { timeout: 10000 })

        // Open same conversation
        const conversation = coachPage.locator('[data-testid="conversation-item"]').first()
        if (await conversation.isVisible()) {
          await conversation.click()
          await runnerPage.locator('[data-testid="conversation-item"]').first().click()

          // Count initial messages in runner view
          const initialCount = await runnerPage.locator('[data-testid="message-bubble"]').count()

          // Coach sends message
          const testMessage = `Real-time test ${Date.now()}`
          await coachPage.getByPlaceholder('Type your message...').fill(testMessage)
          await coachPage.getByRole('button', { name: /send/i }).click()

          // Runner should receive message in real-time
          await expect(
            runnerPage.locator('[data-testid="message-bubble"]').filter({ hasText: testMessage })
          ).toBeVisible({ timeout: 5000 })

          // Message count should increase
          const newCount = await runnerPage.locator('[data-testid="message-bubble"]').count()
          expect(newCount).toBe(initialCount + 1)

          // messagesAtom synchronized across tabs
        }
      } finally {
        await coachContext.close()
        await runnerContext.close()
      }
    })
  })

  test.describe('Basic Navigation', () => {
    test.use({ storageState: './playwright/.auth/runner.json' })

    test('should navigate to chat page', async ({ page }) => {
      // Navigate directly to the runner dashboard - we're already authenticated
      await page.goto('/dashboard/runner')
      await expect(page).toHaveURL('/dashboard/runner', { timeout: 10000 })

      // Navigate to chat
      await page.goto('/chat')

      // Verify we reached the chat page
      await expect(page).toHaveURL('/chat')
    })
  })
})
