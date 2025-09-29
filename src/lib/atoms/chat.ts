// Chat and messaging atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

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
conversationsAtom.debugLabel = 'conversationsAtom'
export const messagesAtom = atom<OptimisticMessage[]>([])
messagesAtom.debugLabel = 'messagesAtom'
export const conversationsLoadingAtom = atom(false)
conversationsLoadingAtom.debugLabel = 'conversationsLoadingAtom'
export const messagesLoadingAtom = atom(false)
messagesLoadingAtom.debugLabel = 'messagesLoadingAtom'

// Async chat atoms with suspense support
export const asyncConversationsAtom = atom(async () => {
  // SSR-safe fetch for conversations
  try {
    const response = await fetch('/api/conversations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
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
asyncConversationsAtom.debugLabel = 'asyncConversationsAtom'

// Selected conversation atoms
export const selectedConversationAtom = atom<Conversation | null>(null)
selectedConversationAtom.debugLabel = 'selectedConversationAtom'
export const selectedConversationIdAtom = atom<string | null>(null)
selectedConversationIdAtom.debugLabel = 'selectedConversationIdAtom'

// Chat UI state atoms
export const typingIndicatorAtom = atom<Record<string, boolean>>({})
typingIndicatorAtom.debugLabel = 'typingIndicatorAtom'
export const unreadMessagesCountAtom = atom<Record<string, number>>({})
unreadMessagesCountAtom.debugLabel = 'unreadMessagesCountAtom'
export const isTypingAtom = atom(false)
isTypingAtom.debugLabel = 'isTypingAtom'

// Chat preferences
export const chatSoundEnabledAtom = atomWithStorage('chatSoundEnabled', true)
chatSoundEnabledAtom.debugLabel = 'chatSoundEnabledAtom'
export const chatNotificationsEnabledAtom = atomWithStorage('chatNotificationsEnabled', true)
chatNotificationsEnabledAtom.debugLabel = 'chatNotificationsEnabledAtom'

// Current conversation atom
export const currentConversationIdAtom = atom<string | null>(null)
currentConversationIdAtom.debugLabel = 'currentConversationIdAtom'

// Message input atom with proper structure
export const messageInputAtom = atom<MessageInput>({
  message: '',
  linkedWorkout: null,
  linkType: 'reference',
  showWorkoutSelector: false,
})

// Chat UI state
messageInputAtom.debugLabel = 'messageInputAtom'
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
chatUiStateAtom.debugLabel = 'chatUiStateAtom'
export const messageInputStateAtom = atom({
  text: '',
  attachments: [] as string[],
  replyTo: null as string | null,
  mentions: [] as string[],
})

// New message modal state
messageInputStateAtom.debugLabel = 'messageInputStateAtom'
export const newMessageModalAtom = atom({
  isOpen: false,
  recipientId: null as string | null,
  initialMessage: '',
})

// Typing status atoms
newMessageModalAtom.debugLabel = 'newMessageModalAtom'
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
typingStatusAtom.debugLabel = 'typingStatusAtom'
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
offlineMessageQueueAtom.debugLabel = 'offlineMessageQueueAtom'

// Derived atom to sync recipient selection with chat UI state
export const selectedRecipientAtom = atom(
  get => get(currentConversationIdAtom),
  (get, set, recipientId: string | null) => {
    // Sync both atoms to maintain consistency
    set(currentConversationIdAtom, recipientId)
    set(selectedConversationIdAtom, recipientId)
  }
)

// Note: Removed conversationMessagesAtomsFamily and fetchConversationMessagesFamily
selectedRecipientAtom.debugLabel = 'selectedRecipientAtom'
// We now use derived atoms to filter messages from the global messagesAtom
// This follows Jotai best practices: derive state, don't duplicate it

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
      updated_at: new Date().toISOString(),
      sender: {
        id: user.id,
        email: user.email,
        userType: (user.userType || 'runner') as 'runner' | 'coach',
        full_name: user.name || user.email || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      read: false,
      optimistic: true,
      // Add additional fields that might be expected
      context_type: payload.workoutId ? 'workout' : 'general',
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
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      let messageWithSender
      if (response.status === 204) {
        // Handle 204 No Content - fall back to optimistic message, now finalized
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tempId, ...finalizedMessage } = optimisticMessage
        messageWithSender = { ...finalizedMessage, optimistic: false }
      } else {
        const data = await response.json()
        const realMessage = data.message || data

        // Ensure the real message has sender data and sender_id for compatibility
        messageWithSender = {
          ...realMessage,
          sender_id: realMessage.sender_id || user.id, // Ensure sender_id is set
          sender: realMessage.sender || {
            id: user.id,
            email: user.email,
            userType: (user.userType || 'runner') as 'runner' | 'coach',
            full_name: user.name || user.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          optimistic: false,
        }
      }

      // Replace optimistic message with real message
      set(messagesAtom, prev => prev.map(msg => (msg.tempId === tempId ? messageWithSender : msg)))

      // Don't refetch - the optimistic update and replacement should be enough
      // The polling mechanism in useMessages will catch any missed updates

      return messageWithSender
    } catch (error) {
      // Remove optimistic message on failure
      set(messagesAtom, prev => prev.filter(msg => msg.tempId !== tempId))
      throw error
    }
  }
)
sendMessageActionAtom.debugLabel = 'sendMessageActionAtom'
