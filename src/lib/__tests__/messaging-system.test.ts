/**
 * Messaging System Unit Tests
 * 
 * Tests the core messaging functionality including:
 * - Message sending and receiving
 * - Relationship verification
 * - Bidirectional communication
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAtom } from 'jotai'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the authentication
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'coach',
    fullName: 'Test User',
  },
}

// Mock the auth session hook
const mockUseSession = vi.fn(() => ({ data: mockSession }))
vi.mock('@/hooks/useBetterSession', () => ({
  useSession: mockUseSession,
}))

// Mock the logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Import after mocks
import { useMessages } from '@/hooks/useMessages'
import { messagesAtom } from '@/lib/atoms'

describe('Messaging System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Message Sending', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          message: {
            id: 'msg-123',
            content: 'Test message',
            sender_id: 'test-user-id',
            recipient_id: 'recipient-id',
            created_at: new Date().toISOString(),
          },
        }),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useMessages('recipient-id'))

      await act(async () => {
        const success = await result.current.sendMessage('Test message')
        expect(success).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test message',
          recipientId: 'recipient-id',
          workoutId: undefined,
        }),
        credentials: 'include',
      })
    })

    it('should handle message sending failure', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('No active relationship found'),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useMessages('recipient-id'))

      await act(async () => {
        const success = await result.current.sendMessage('Test message')
        expect(success).toBe(false)
      })
    })

    it('should include workoutId when provided', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ message: {} }),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useMessages('recipient-id'))

      await act(async () => {
        await result.current.sendMessage('Test message', 'workout-123')
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
  })

  describe('Message Fetching', () => {
    it('should fetch messages for a conversation', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Hello',
          sender_id: 'test-user-id',
          recipient_id: 'recipient-id',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'msg-2',
          content: 'Hi there!',
          sender_id: 'recipient-id',
          recipient_id: 'test-user-id',
          created_at: '2024-01-01T00:01:00Z',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      })

      const { result } = renderHook(() => useMessages('recipient-id'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/messages?recipientId=recipient-id'
      )
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useMessages('recipient-id'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should not crash and should handle the error
      expect(result.current.messages).toEqual([])
    })
  })

  describe('Bidirectional Communication', () => {
    it('should work from coach perspective', async () => {
      const coachSession = {
        user: {
          id: 'coach-id',
          email: 'coach@example.com',
          role: 'coach',
          fullName: 'Coach User',
        },
      }

      mockUseSession.mockReturnValue({
        data: coachSession,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: {} }),
      })

      const { result } = renderHook(() => useMessages('runner-id'))

      await act(async () => {
        await result.current.sendMessage('Coach message to runner')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Coach message to runner',
          recipientId: 'runner-id',
          workoutId: undefined,
        }),
        credentials: 'include',
      })
    })

    it('should work from runner perspective', async () => {
      const runnerSession = {
        user: {
          id: 'runner-id',
          email: 'runner@example.com',
          role: 'runner',
          fullName: 'Runner User',
        },
      }

      mockUseSession.mockReturnValue({
        data: runnerSession,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: {} }),
      })

      const { result } = renderHook(() => useMessages('coach-id'))

      await act(async () => {
        await result.current.sendMessage('Runner message to coach')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Runner message to coach',
          recipientId: 'coach-id',
          workoutId: undefined,
        }),
        credentials: 'include',
      })
    })
  })

  describe('Relationship Verification', () => {
    it('should handle 403 error when no relationship exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('No active relationship found with this user'),
      })

      const { result } = renderHook(() => useMessages('unrelated-user-id'))

      await act(async () => {
        const success = await result.current.sendMessage('Unauthorized message')
        expect(success).toBe(false)
      })
    })
  })

  describe('Message State Management', () => {
    it('should add optimistic message immediately', async () => {
      // Mock a slow response
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ message: {} }),
              }),
            100
          )
        )
      )

      const { result } = renderHook(() => useAtom(messagesAtom))
      const { result: messageHook } = renderHook(() => useMessages('recipient-id'))

      const initialMessageCount = result.current[0].length

      await act(async () => {
        messageHook.current.sendMessage('Optimistic message')
        // Message should be added immediately
        expect(result.current[0].length).toBe(initialMessageCount + 1)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useMessages('recipient-id'))

      await act(async () => {
        const success = await result.current.sendMessage('Test message')
        expect(success).toBe(false)
      })
    })

    it('should handle malformed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      const { result } = renderHook(() => useMessages('recipient-id'))

      await act(async () => {
        const success = await result.current.sendMessage('Test message')
        expect(success).toBe(false)
      })
    })
  })
})