/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Chat Atoms Unit Tests
 *
 * Tests the chat and messaging atoms:
 * - conversationsAtom
 * - messagesAtom
 * - sendMessageActionAtom
 * - typing indicators
 * - message input state
 * - optimistic updates
 */
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sessionAtom } from '@/lib/atoms/auth'
import {
  chatUiStateAtom,
  conversationsAtom,
  conversationsLoadingAtom,
  currentConversationIdAtom,
  messageInputAtom,
  messagesAtom,
  messagesLoadingAtom,
  selectedConversationAtom,
  selectedConversationIdAtom,
  sendMessageActionAtom,
  typingIndicatorAtom,
} from '@/lib/atoms/chat'

import {
  createMockConversation,
  createMockMessage,
  createMockSession,
  createTestStore,
  getAtomValue,
  mockFetch,
  setAtomValue,
  setupCommonMocks,
} from './utils/test-helpers'

describe('Chat Atoms', () => {
  let store: ReturnType<typeof createStore>
  let cleanup: () => void
  let fetchMock: ReturnType<typeof mockFetch>

  beforeEach(() => {
    const mocks = setupCommonMocks()
    cleanup = mocks.cleanup
    store = createTestStore()

    // Set up mock session for authenticated tests
    const mockSession = createMockSession()
    setAtomValue(store, sessionAtom, mockSession)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('conversationsAtom', () => {
    it('should have empty array as initial value', () => {
      const conversations = getAtomValue(store, conversationsAtom)
      expect(conversations).toEqual([])
    })

    it('should store conversations', () => {
      const mockConversations = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2' }),
      ]

      setAtomValue(store, conversationsAtom, mockConversations as any)

      const conversations = getAtomValue(store, conversationsAtom) as any
      expect(conversations).toHaveLength(2)
      expect(conversations[0].id).toBe('conv-1')
      expect(conversations[1].id).toBe('conv-2')
    })
  })

  describe('messagesAtom', () => {
    it('should have empty array as initial value', () => {
      const messages = getAtomValue(store, messagesAtom)
      expect(messages).toEqual([])
    })

    it('should store messages', () => {
      const mockMessages = [
        createMockMessage({ id: 'msg-1', content: 'Hello' }),
        createMockMessage({ id: 'msg-2', content: 'Hi there' }),
      ]

      setAtomValue(store, messagesAtom, mockMessages)

      const messages = getAtomValue(store, messagesAtom)
      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('Hello')
      expect(messages[1].content).toBe('Hi there')
    })

    it('should handle optimistic messages', () => {
      const optimisticMessage = createMockMessage({
        id: 'temp-123',
        tempId: 'temp-123',
        content: 'Sending...',
        optimistic: true,
      })

      setAtomValue(store, messagesAtom, [optimisticMessage])

      const messages = getAtomValue(store, messagesAtom)
      expect(messages[0].optimistic).toBe(true)
      expect(messages[0].tempId).toBe('temp-123')
    })
  })

  describe('sendMessageActionAtom', () => {
    beforeEach(() => {
      // Set up fetch mock for sending messages
      fetchMock = mockFetch(
        new Map([
          [
            '/api/messages',
            {
              ok: true,
              json: () =>
                Promise.resolve({
                  message: createMockMessage({
                    id: 'msg-sent',
                    content: 'Test message',
                    sender_id: 'test-user-id',
                  }),
                }),
            },
          ],
        ])
      )
    })

    it('should send a message successfully', async () => {
      const payload = {
        recipientId: 'recipient-id',
        content: 'Hello, this is a test message',
        workoutId: undefined,
      }

      // Send message
      await store.set(sendMessageActionAtom, payload)

      // Check that optimistic message was added and then replaced
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/messages',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: payload.content,
            recipientId: payload.recipientId,
            workoutId: undefined,
          }),
        })
      )
    })

    it('should add optimistic message immediately', async () => {
      const payload = {
        recipientId: 'recipient-id',
        content: 'Optimistic message',
      }

      // Track messages during send
      let messagesDuringSend: any[] = []
      const unsubscribe = store.sub(messagesAtom, () => {
        messagesDuringSend = [...getAtomValue(store, messagesAtom)]
      })

      // Send message
      const sendPromise = store.set(sendMessageActionAtom, payload)

      // Check optimistic message was added immediately
      const messages = getAtomValue(store, messagesAtom)
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Optimistic message')
      expect(messages[0].optimistic).toBe(true)
      expect(messages[0].tempId).toMatch(/^temp-/)

      await sendPromise
      unsubscribe()
    })

    it('should handle send failure and remove optimistic message', async () => {
      // Mock failed API call
      fetchMock = mockFetch(
        new Map([
          [
            '/api/messages',
            {
              ok: false,
              json: () => Promise.resolve({ error: 'Failed to send' }),
            },
          ],
        ])
      )

      const payload = {
        recipientId: 'recipient-id',
        content: 'Failed message',
      }

      // Clear existing messages
      setAtomValue(store, messagesAtom, [])

      // Attempt to send message and expect failure
      await expect(store.set(sendMessageActionAtom, payload)).rejects.toThrow()

      // Check that optimistic message was removed
      const messages = getAtomValue(store, messagesAtom)
      expect(messages).toHaveLength(0)
    })

    it('should throw error when no session', async () => {
      // Clear session
      setAtomValue(store, sessionAtom, null)

      const payload = {
        recipientId: 'recipient-id',
        content: 'No session message',
      }

      await expect(store.set(sendMessageActionAtom, payload)).rejects.toThrow(
        'No session available'
      )
    })
  })

  describe('selectedConversationAtom', () => {
    it('should have null as initial value', () => {
      const selected = getAtomValue(store, selectedConversationAtom)
      expect(selected).toBeNull()
    })

    it('should store selected conversation', () => {
      const mockConversation = createMockConversation({ id: 'selected-conv' })
      setAtomValue(store, selectedConversationAtom, mockConversation)

      const selected = getAtomValue(store, selectedConversationAtom)
      expect(selected?.id).toBe('selected-conv')
    })
  })

  describe('typingIndicatorAtom', () => {
    it('should have empty object as initial value', () => {
      const typing = getAtomValue(store, typingIndicatorAtom)
      expect(typing).toEqual({})
    })

    it('should track typing status by user', () => {
      setAtomValue(store, typingIndicatorAtom, {
        'user-1': true,
        'user-2': false,
      })

      const typing = getAtomValue(store, typingIndicatorAtom)
      expect(typing['user-1']).toBe(true)
      expect(typing['user-2']).toBe(false)
    })
  })

  describe('messageInputAtom', () => {
    it('should have default structure', () => {
      const input = getAtomValue(store, messageInputAtom)
      expect(input).toEqual({
        message: '',
        linkedWorkout: null,
        linkType: 'reference',
        showWorkoutSelector: false,
      })
    })

    it('should update message input', () => {
      setAtomValue(store, messageInputAtom, {
        message: 'New message text',
        linkedWorkout: null,
        linkType: 'reference',
        showWorkoutSelector: false,
      })

      const input = getAtomValue(store, messageInputAtom)
      expect(input.message).toBe('New message text')
    })

    it('should handle workout linking', () => {
      const mockWorkout = { id: 'workout-1', name: 'Long Run' }
      setAtomValue(store, messageInputAtom, {
        message: 'Check out this workout',
        linkedWorkout: mockWorkout as any,
        linkType: 'attachment',
        showWorkoutSelector: true,
      })

      const input = getAtomValue(store, messageInputAtom)
      expect(input.linkedWorkout?.id).toBe('workout-1')
      expect(input.linkType).toBe('attachment')
      expect(input.showWorkoutSelector).toBe(true)
    })
  })

  describe('chatUiStateAtom', () => {
    it('should have correct initial state', () => {
      const uiState = getAtomValue(store, chatUiStateAtom)
      expect(uiState).toEqual({
        isTyping: false,
        typingUsers: [],
        messageInput: '',
        isLoadingMessages: false,
        hasMoreMessages: true,
        scrollPosition: 0,
        activeView: 'list',
        unreadCounts: {},
        lastRead: {},
        showNewMessage: false,
        sending: false,
        filterWorkoutId: null,
        selectedChatWorkout: null,
        showWorkoutModal: false,
        hasInitiallyLoadedMessages: false,
        hasInitiallyLoadedConversations: false,
      })
    })

    it('should update UI state properties', () => {
      const newState = {
        ...getAtomValue(store, chatUiStateAtom),
        isTyping: true,
        typingUsers: ['user-1', 'user-2'],
        messageInput: 'Typing a message...',
        activeView: 'conversation' as const,
      }

      setAtomValue(store, chatUiStateAtom, newState)

      const uiState = getAtomValue(store, chatUiStateAtom)
      expect(uiState.isTyping).toBe(true)
      expect(uiState.typingUsers).toEqual(['user-1', 'user-2'])
      expect(uiState.messageInput).toBe('Typing a message...')
      expect(uiState.activeView).toBe('conversation')
    })
  })

  describe('loading states', () => {
    it('should track conversations loading state', () => {
      setAtomValue(store, conversationsLoadingAtom, true)
      expect(getAtomValue(store, conversationsLoadingAtom)).toBe(true)

      setAtomValue(store, conversationsLoadingAtom, false)
      expect(getAtomValue(store, conversationsLoadingAtom)).toBe(false)
    })

    it('should track messages loading state', () => {
      setAtomValue(store, messagesLoadingAtom, true)
      expect(getAtomValue(store, messagesLoadingAtom)).toBe(true)

      setAtomValue(store, messagesLoadingAtom, false)
      expect(getAtomValue(store, messagesLoadingAtom)).toBe(false)
    })
  })

  describe('conversation selection', () => {
    it('should sync conversation ID atoms', () => {
      // Set current conversation ID
      setAtomValue(store, currentConversationIdAtom, 'conv-123')
      expect(getAtomValue(store, currentConversationIdAtom)).toBe('conv-123')

      // Set selected conversation ID
      setAtomValue(store, selectedConversationIdAtom, 'conv-456')
      expect(getAtomValue(store, selectedConversationIdAtom)).toBe('conv-456')
    })

    it('should handle null conversation selection', () => {
      setAtomValue(store, currentConversationIdAtom, 'conv-123')
      setAtomValue(store, currentConversationIdAtom, null)

      expect(getAtomValue(store, currentConversationIdAtom)).toBeNull()
    })
  })

  describe('204 No Content Response Handling', () => {
    it('should handle 204 response and finalize optimistic message', async () => {
      // Mock 204 No Content response
      fetchMock = mockFetch(
        new Map([
          [
            '/api/messages',
            {
              ok: true,
              status: 204,
              statusText: 'No Content',
              json: async () => {
                throw new Error('204 responses have no content')
              },
              text: async () => '',
            },
          ],
        ])
      )

      const payload = {
        recipientId: 'recipient-id',
        content: 'Test 204 message',
      }

      // Clear existing messages
      setAtomValue(store, messagesAtom, [])

      // Send message
      const result = await store.set(sendMessageActionAtom, payload)

      // Check that the optimistic message was finalized (not server data)
      const messages = getAtomValue(store, messagesAtom)
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Test 204 message')
      expect(messages[0].optimistic).toBe(false) // Should be finalized
      expect(messages[0].tempId).toBeUndefined() // Should be removed from finalized message

      // Check return value is the finalized optimistic message
      expect(result.content).toBe('Test 204 message')
      expect(result.optimistic).toBe(false)
    })
  })
})
