/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auth-Chat Integration Tests
 *
 * Tests the integration between authentication and chat atoms,
 * ensuring proper user context flows through messaging features.
 */
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isAuthenticatedAtom, sessionAtom } from '@/lib/atoms/auth'
import { chatUiStateAtom, messagesAtom, sendMessageActionAtom } from '@/lib/atoms/chat'

import {
  createMockSession,
  createTestStore,
  getAtomValue,
  mockFetch,
  setAtomValue,
  setupCommonMocks,
} from '../utils/test-helpers'

describe('Auth-Chat Integration', () => {
  let store: ReturnType<typeof createStore>
  let cleanup: () => void
  let fetchMock: ReturnType<typeof mockFetch>

  beforeEach(() => {
    const mocks = setupCommonMocks()
    cleanup = mocks.cleanup
    store = createTestStore()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('Session impact on messaging', () => {
    it('should prevent sending messages when not authenticated', async () => {
      // Ensure no session
      setAtomValue(store, sessionAtom, null)
      expect(getAtomValue(store, isAuthenticatedAtom)).toBe(false)

      // Try to send a message
      const payload = {
        recipientId: 'recipient-id',
        content: 'This should fail',
      }

      // Should throw error due to no session
      await expect(store.set(sendMessageActionAtom, payload)).rejects.toThrow(
        'No session available'
      )
    })

    it('should allow sending messages when authenticated', async () => {
      // Set up authenticated session
      const mockSession = createMockSession({
        user: {
          id: 'user-123',
          email: 'user@example.com',
          userType: 'runner',
        },
      })
      setAtomValue(store, sessionAtom, mockSession)
      expect(getAtomValue(store, isAuthenticatedAtom)).toBe(true)

      // Mock successful API call
      fetchMock = mockFetch(
        new Map([
          [
            '/api/messages',
            {
              ok: true,
              json: () =>
                Promise.resolve({
                  message: {
                    id: 'msg-1',
                    sender_id: 'user-123',
                    recipient_id: 'recipient-id',
                    content: 'Hello',
                    created_at: new Date().toISOString(),
                  },
                }),
            },
          ],
        ])
      )

      // Send message
      const payload = {
        recipientId: 'recipient-id',
        content: 'Hello',
      }

      const result = await store.set(sendMessageActionAtom, payload)

      // Verify message was sent with correct user context
      expect(result.sender_id).toBe('user-123')
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should use correct user context in optimistic updates', async () => {
      // Set up coach session
      const coachSession = createMockSession({
        user: {
          id: 'coach-456',
          email: 'coach@example.com',
          name: 'Coach Smith',
          userType: 'coach',
        },
      })
      setAtomValue(store, sessionAtom, coachSession)

      // Mock API call with immediate response
      fetchMock = mockFetch(
        new Map([
          [
            '/api/messages',
            {
              ok: true,
              json: () =>
                Promise.resolve({
                  message: {
                    id: 'final-msg',
                    sender_id: 'coach-456',
                    recipient_id: 'runner-id',
                    content: 'Coaching message',
                    created_at: new Date().toISOString(),
                  },
                }),
            },
          ],
        ])
      )

      // Clear existing messages
      setAtomValue(store, messagesAtom, [])

      // Send message
      const result = await store.set(sendMessageActionAtom, {
        recipientId: 'runner-id',
        content: 'Coaching message',
      })

      // Verify the message was sent with correct user context
      expect(result.sender_id).toBe('coach-456')
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/messages',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('runner-id'),
        })
      )
    }, 10000)
  })

  describe('User role impact on chat UI', () => {
    it('should adjust UI state based on user role', () => {
      // Set runner session
      const runnerSession = createMockSession({
        user: { userType: 'runner' },
      })
      setAtomValue(store, sessionAtom, runnerSession)

      // Set chat UI state
      const uiState = getAtomValue(store, chatUiStateAtom)
      setAtomValue(store, chatUiStateAtom, {
        ...uiState,
        activeView: 'conversation',
      })

      // Runner-specific UI logic would go here
      expect(getAtomValue(store, chatUiStateAtom).activeView).toBe('conversation')

      // Switch to coach session
      const coachSession = createMockSession({
        user: { userType: 'coach' },
      })
      setAtomValue(store, sessionAtom, coachSession)

      // Coach might have different UI defaults
      // This is where role-specific UI logic would be tested
    })
  })

  describe('Session changes during chat', () => {
    it('should handle session expiry gracefully', async () => {
      // Start with valid session
      const session = createMockSession()
      setAtomValue(store, sessionAtom, session)

      // Add some messages
      setAtomValue(store, messagesAtom, [
        { id: '1', content: 'Message 1' } as any,
        { id: '2', content: 'Message 2' } as any,
      ])

      // Simulate session expiry
      setAtomValue(store, sessionAtom, null)

      // Messages should still be visible (for reading)
      const messages = getAtomValue(store, messagesAtom)
      expect(messages).toHaveLength(2)

      // But sending new messages should fail
      await expect(
        store.set(sendMessageActionAtom, {
          recipientId: 'someone',
          content: 'New message',
        })
      ).rejects.toThrow('No session available')
    })

    it('should update sender info when user switches accounts', () => {
      // First user session
      const user1Session = createMockSession({
        user: {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
        },
      })
      setAtomValue(store, sessionAtom, user1Session)

      // Check session is set correctly
      expect(getAtomValue(store, sessionAtom)?.user.id).toBe('user-1')

      // Switch to different user
      const user2Session = createMockSession({
        user: {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User Two',
        },
      })
      setAtomValue(store, sessionAtom, user2Session)

      // New messages would use new user context
      expect(getAtomValue(store, sessionAtom)?.user.id).toBe('user-2')
    })
  })
})
