/**
 * Messaging Atoms Unit Tests
 *
 * Tests the core messaging atom functionality:
 * - sendMessageActionAtom
 * - Optimistic message handling
 * - Error handling
 */
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import after mocks
import { messagesAtom, sendMessageActionAtom, sessionAtom } from '@/lib/atoms/index'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('Messaging Atoms', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    vi.clearAllMocks()
    store = createStore()

    // Reset atoms and mock session
    store.set(messagesAtom, [])
    store.set(sessionAtom, {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'coach',
        fullName: 'Test User',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessageActionAtom', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            message: {
              id: 'real-msg-123',
              content: 'Test message',
              sender_id: 'test-user-id',
              recipient_id: 'recipient-id',
              created_at: new Date().toISOString(),
            },
          }),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      // Send a message using the atom's write function
      await store.set(sendMessageActionAtom, {
        content: 'Test message',
        recipientId: 'recipient-id',
      })

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test message',
          recipientId: 'recipient-id',
        }),
        credentials: 'include',
      })

      // Verify message was added to store
      const messages = store.get(messagesAtom)
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Test message')
      expect(messages[0].id).toBe('real-msg-123') // Should be replaced with real message
    })

    it('should add optimistic message immediately', async () => {
      // Mock a slow response
      let resolveResponse: (value: unknown) => void
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve as (value: unknown) => void
      })

      mockFetch.mockReturnValueOnce(responsePromise)

      // Start sending message (don't await yet)
      const sendPromise = store.set(sendMessageActionAtom, {
        content: 'Optimistic message',
        recipientId: 'recipient-id',
      })

      // Message should be added immediately (optimistically)
      const messages = store.get(messagesAtom)
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Optimistic message')
      expect(messages[0].id).toMatch(/^temp-/) // Should have temp ID

      // Resolve the response
      resolveResponse!({
        ok: true,
        json: () =>
          Promise.resolve({
            message: {
              id: 'real-msg-123',
              content: 'Optimistic message',
              sender_id: 'test-user-id',
              recipient_id: 'recipient-id',
              created_at: new Date().toISOString(),
            },
          }),
      })

      await sendPromise

      // Optimistic message should be replaced with real message
      const finalMessages = store.get(messagesAtom)
      expect(finalMessages).toHaveLength(1)
      expect(finalMessages[0].id).toBe('real-msg-123')
    })

    it('should handle message sending failure', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('No active relationship found'),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      // Should throw an error
      await expect(
        store.set(sendMessageActionAtom, {
          content: 'Test message',
          recipientId: 'recipient-id',
        })
      ).rejects.toThrow('Failed to send message')

      // Optimistic message should be removed on failure
      const messages = store.get(messagesAtom)
      expect(messages).toHaveLength(0)
    })

    it('should include workoutId when provided', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            message: {
              id: 'msg-123',
              content: 'Test message',
              workout_id: 'workout-123',
            },
          }),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await store.set(sendMessageActionAtom, {
        content: 'Test message',
        recipientId: 'recipient-id',
        workoutId: 'workout-123',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test message',
          recipientId: 'recipient-id',
          workoutId: 'workout-123',
        }),
        credentials: 'include',
      })
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        store.set(sendMessageActionAtom, {
          content: 'Test message',
          recipientId: 'recipient-id',
        })
      ).rejects.toThrow('Network error')

      // Optimistic message should be removed on failure
      const messages = store.get(messagesAtom)
      expect(messages).toHaveLength(0)
    })

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await expect(
        store.set(sendMessageActionAtom, {
          content: 'Test message',
          recipientId: 'recipient-id',
        })
      ).rejects.toThrow('Invalid JSON')
    })
  })

  describe('Optimistic update behavior', () => {
    it('should replace optimistic message with real message', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            message: {
              id: 'real-msg-123',
              content: 'Test message',
              sender_id: 'test-user-id',
              recipient_id: 'recipient-id',
              created_at: new Date().toISOString(),
            },
          }),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await store.set(sendMessageActionAtom, {
        content: 'Test message',
        recipientId: 'recipient-id',
      })

      // Should have the real message (optimistic message replaced)
      const messages = store.get(messagesAtom)
      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe('real-msg-123')
      expect(messages[0].content).toBe('Test message')
    })
  })
})
