// Chat and messaging atoms
import { atom } from 'jotai'
import { atomWithStorage, atomFamily } from 'jotai/utils'

import type { Conversation } from '@/types/chat'
import type { OptimisticMessage } from '@/lib/supabase'

// Core chat atoms
export const conversationsAtom = atom<Conversation[]>([])
export const messagesAtom = atom<OptimisticMessage[]>([])
export const conversationsLoadingAtom = atom(false)
export const messagesLoadingAtom = atom(false)

// Async chat atoms with suspense support
export const asyncConversationsAtom = atom(async () => {
  // This would be populated with actual async data fetching
  return [] as Conversation[]
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
export const messageInputAtom = atom({
  message: '',
  linkedWorkout: null as any,
  linkType: null as string | null,
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
  selectedChatWorkout: null as any,
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

// Offline message queue
export const offlineMessageQueueAtom = atomWithStorage<any[]>('offline-messages', [])

// Derived atom to sync recipient selection with chat UI state
export const selectedRecipientAtom = atom(
  get => (get(chatUiStateAtom) as any).currentRecipientId,
  (get, set, recipientId: string | null) => {
    set(chatUiStateAtom, prev => ({
      ...prev,
      currentRecipientId: recipientId,
      selectedConversationId: recipientId, // Sync conversation selection
    } as any))
    set(currentConversationIdAtom, recipientId)
  }
)

// Conversation messages atoms family - using atomFamily for proper typing
export const conversationMessagesAtomsFamily = atomFamily(
  (conversationId: string) => atom<OptimisticMessage[]>([])
)