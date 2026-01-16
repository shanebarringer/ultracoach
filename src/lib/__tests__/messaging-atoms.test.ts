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
import type { Session } from '@/lib/better-auth-client'

// Mock the api-client module - sendMessageActionAtom uses axios, not fetch
const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  api: mockApi,
}))

// Mock the logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Helper to create axios response shape
function createMockAxiosResponse<T>(data: T, options: { status?: number } = {}) {
  return {
    data,
    status: options.status ?? 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} },
  }
}

describe('Messaging Atoms', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    vi.clearAllMocks()
    store = createStore()

    // Reset atoms and mock session
    store.set(messagesAtom, [])
    // Set a mock session that matches the Better Auth session structure
    store.set(sessionAtom, {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        emailVerified: false,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: 'session-id',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        token: 'test-token',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
    } as Session)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessageActionAtom', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        message: {
          id: 'real-msg-123',
          content: 'Test message',
          sender_id: 'test-user-id',
          recipient_id: 'recipient-id',
          created_at: new Date().toISOString(),
        },
      }

      mockApi.post.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

      // Send a message using the atom's write function
      await store.set(sendMessageActionAtom, {
        content: 'Test message',
        recipientId: 'recipient-id',
      })

      // Verify api.post was called correctly
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/messages',
        {
          content: 'Test message',
          recipientId: 'recipient-id',
          workoutId: undefined,
        },
        expect.any(Object)
      )

      // Verify message was added to store
      const messages = store.get(messagesAtom)
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Test message')
      expect(messages[0].id).toBe('real-msg-123') // Should be replaced with real message
    })

    it('should add optimistic message immediately', async () => {
      // Mock a slow response using a deferred promise
      let resolveResponse: (value: unknown) => void
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve as (value: unknown) => void
      })

      mockApi.post.mockReturnValueOnce(responsePromise)

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
      resolveResponse!(
        createMockAxiosResponse({
          message: {
            id: 'real-msg-123',
            content: 'Optimistic message',
            sender_id: 'test-user-id',
            recipient_id: 'recipient-id',
            created_at: new Date().toISOString(),
          },
        })
      )

      await sendPromise

      // Optimistic message should be replaced with real message
      const finalMessages = store.get(messagesAtom)
      expect(finalMessages).toHaveLength(1)
      expect(finalMessages[0].id).toBe('real-msg-123')
    })

    it('should handle message sending failure', async () => {
      // Mock axios error
      const axiosError = new Error('Failed to send message')
      ;(axiosError as unknown as { isAxiosError: boolean }).isAxiosError = true
      ;(axiosError as unknown as { response: object }).response = {
        status: 403,
        statusText: 'Forbidden',
        data: { error: 'No active relationship found' },
      }

      mockApi.post.mockRejectedValueOnce(axiosError)

      // Should throw an error
      await expect(
        store.set(sendMessageActionAtom, {
          content: 'Test message',
          recipientId: 'recipient-id',
        })
      ).rejects.toThrow()

      // Optimistic message should be removed on failure
      const messages = store.get(messagesAtom)
      expect(messages).toHaveLength(0)
    })

    it('should include workoutId when provided', async () => {
      const mockResponse = {
        message: {
          id: 'msg-123',
          content: 'Test message',
          workout_id: 'workout-123',
        },
      }

      mockApi.post.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

      await store.set(sendMessageActionAtom, {
        content: 'Test message',
        recipientId: 'recipient-id',
        workoutId: 'workout-123',
      })

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/messages',
        {
          content: 'Test message',
          recipientId: 'recipient-id',
          workoutId: 'workout-123',
        },
        expect.any(Object)
      )
    })

    it('should handle network errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network error'))

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
  })

  describe('Optimistic update behavior', () => {
    it('should replace optimistic message with real message', async () => {
      const mockResponse = {
        message: {
          id: 'real-msg-123',
          content: 'Test message',
          sender_id: 'test-user-id',
          recipient_id: 'recipient-id',
          created_at: new Date().toISOString(),
        },
      }

      mockApi.post.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

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
