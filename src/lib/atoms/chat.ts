// Chat and messaging atoms
import { atom } from 'jotai'
import { atomFamily, atomWithStorage } from 'jotai/utils'

import type { OptimisticMessage, Workout } from '@/lib/supabase'
import type { Conversation } from '@/types/chat'

import { sessionAtom } from './auth'

// Message input interface
interface MessageInput {
  message: string
  linkedWorkout: Workout | null
  linkType: 'reference' | 'attachment'
  showWorkoutSelector: boolean
}

// Core chat atoms
export const conversationsAtom = atom<Conversation[]>([])
export const messagesAtom = atom<OptimisticMessage[]>([])
export const conversationsLoadingAtom = atom(false)
export const messagesLoadingAtom = atom(false)

// Async chat atoms with suspense support
export const asyncConversationsAtom = atom(async () => {
  // SSR-safe fetch for conversations
  try {
    const response = await fetch('/api/conversations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store', // Ensure fresh data for SSR
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Validate and type-check the response
    if (!Array.isArray(data.conversations)) {
      throw new Error('Invalid conversations response format')
    }

    return data.conversations as Conversation[]
  } catch (error) {
    // Re-throw to trigger Suspense/ErrorBoundary
    throw error instanceof Error ? error : new Error('Failed to fetch conversations')
  }
})

// Selected conversation atoms
export const selectedConversationAtom = atom<Conversation | null>(null)
export const selectedConversationIdAtom = atom<string | null>(null)

// Chat UI state atoms
export const typingIndicatorAtom = atom<Record<string, boolean>>({})
export const unreadMessagesCountAtom = atom<Record<string, number>>({})
export const isTypingAtom = atom(false)

// Chat preferences
export const chatSoundEnabledAtom = atomWithStorage('chatSoundEnabled', true)
export const chatNotificationsEnabledAtom = atomWithStorage('chatNotificationsEnabled', true)

// Current conversation atom
export const currentConversationIdAtom = atom<string | null>(null)

// Message input atom with proper structure
export const messageInputAtom = atom<MessageInput>({
  message: '',
  linkedWorkout: null,
  linkType: 'reference',
  showWorkoutSelector: false,
})

// Chat UI state
export const chatUiStateAtom = atom({
  isTyping: false,
  typingUsers: [] as string[],
  messageInput: '',
  isLoadingMessages: false,
  hasMoreMessages: true,
  scrollPosition: 0,
  activeView: 'list' as 'list' | 'conversation',
  unreadCounts: {} as Record<string, number>,
  lastRead: {} as Record<string, string>,
  showNewMessage: false,
  sending: false,
  filterWorkoutId: null as string | null,
  selectedChatWorkout: null as Workout | null,
  showWorkoutModal: false,
  hasInitiallyLoadedMessages: false,
  hasInitiallyLoadedConversations: false,
})

// Message input state
export const messageInputStateAtom = atom({
  text: '',
  attachments: [] as string[],
  replyTo: null as string | null,
  mentions: [] as string[],
})

// New message modal state
export const newMessageModalAtom = atom({
  isOpen: false,
  recipientId: null as string | null,
  initialMessage: '',
})

// Typing status atoms
export const typingStatusAtom = atom<
  Record<
    string,
    {
      isTyping: boolean
      isRecipientTyping: boolean
      lastTypingUpdate: number
    }
  >
>({})

// Offline message type
export interface OfflineMessage {
  id: string
  recipientId: string
  content: string
  workoutId?: string
  contextType?: string
  timestamp: number
  retryCount: number
}

// Offline message queue
export const offlineMessageQueueAtom = atomWithStorage<OfflineMessage[]>('offline-messages', [])

// Derived atom to sync recipient selection with chat UI state
export const selectedRecipientAtom = atom(
  get => get(currentConversationIdAtom),
  (get, set, recipientId: string | null) => {
    // Sync both atoms to maintain consistency
    set(currentConversationIdAtom, recipientId)
    set(selectedConversationIdAtom, recipientId)
  }
)

// Conversation messages atoms family - stores messages per conversation
export const conversationMessagesAtomsFamily = atomFamily((_conversationId: string) =>
  atom<OptimisticMessage[]>([])
)

// Async atom family for fetching messages - separate from storage
export const fetchConversationMessagesFamily = atomFamily((conversationId: string) =>
  atom(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (response.ok) {
        const data = await response.json()
        return Array.isArray(data) ? data : data.messages || []
      }
      return []
    } catch (error) {
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, error)
      return []
    }
  })
)

/**
 * Write-only atom for sending messages between users.
 * Implements optimistic updates for instant UI feedback while the message is sent to the backend.
 * Automatically handles failure cases by removing optimistic messages if sending fails.
 *
 * @param payload.recipientId - The ID of the user to send the message to
 * @param payload.content - The message content
 * @param payload.workoutId - Optional workout ID to link the message to
 * @returns The created message object from the server
 * @throws Error if no session is available or if sending fails
 */
export const sendMessageActionAtom = atom(
  null,
  async (
    get,
    set,
    payload: {
      recipientId: string
      content: string
      workoutId?: string
    }
  ) => {
    const session = get(sessionAtom)
    // Type guard and validation for Better Auth session
    if (
      !session ||
      typeof session !== 'object' ||
      !session.user ||
      typeof session.user !== 'object'
    ) {
      throw new Error('No session available')
    }

    const user = session.user as { id: string; email: string; name?: string; userType?: string }
    if (!user.id) throw new Error('No user ID available')

    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      tempId,
      conversation_id: '',
      sender_id: user.id,
      recipient_id: payload.recipientId,
      content: payload.content,
      workout_id: payload.workoutId || null,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        email: user.email,
        userType: (user.userType || 'runner') as 'runner' | 'coach',
        full_name: user.name || '',
        created_at: '',
        updated_at: '',
      },
      read: false,
      optimistic: true,
    }

    // Add optimistic message immediately
    set(messagesAtom, prev => [...prev, optimisticMessage])

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: payload.content,
          recipientId: payload.recipientId,
          workoutId: payload.workoutId,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      const realMessage = data.message || data

      // Replace optimistic message with real message
      set(messagesAtom, prev =>
        prev.map(msg => (msg.tempId === tempId ? { ...realMessage, optimistic: false } : msg))
      )

      // Trigger a refetch of messages to ensure UI is in sync
      // This is a workaround for the real-time updates being disabled
      setTimeout(async () => {
        try {
          const refreshResponse = await fetch(`/api/messages?recipientId=${payload.recipientId}`)
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            const fetchedMessages = refreshData.messages || []

            // Update messages atom with fetched messages
            set(messagesAtom, fetchedMessages)
          }
        } catch (error) {
          console.error('Failed to refresh messages after sending:', error)
        }
      }, 500)

      return realMessage
    } catch (error) {
      // Remove optimistic message on failure
      set(messagesAtom, prev => prev.filter(msg => msg.tempId !== tempId))
      throw error
    }
  }
)
