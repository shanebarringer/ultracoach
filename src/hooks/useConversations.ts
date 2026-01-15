'use client'

import { useAtom } from 'jotai'

import { useCallback, useEffect, useRef } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { chatUiStateAtom, conversationsAtom, loadingStatesAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Message } from '@/lib/supabase'
import type { User } from '@/lib/supabase'

const logger = createLogger('useConversations')

export function useConversations() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useAtom(conversationsAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)
  const [chatUiState, setChatUiState] = useAtom(chatUiStateAtom)

  // Debounce fetch to prevent race conditions - useRef avoids stale closure issues
  const lastFetchTimeRef = useRef(0)

  const fetchConversations = useCallback(
    async (isInitialLoad = false) => {
      if (!session?.user?.id) return

      // Debounce: prevent multiple fetches within 2 seconds
      const now = Date.now()
      if (!isInitialLoad && now - lastFetchTimeRef.current < 2000) {
        logger.debug('Skipping fetch due to debouncing')
        return
      }
      lastFetchTimeRef.current = now

      // Only show loading spinner on initial load, not on background updates
      if (isInitialLoad) {
        setLoadingStates(prev => ({ ...prev, conversations: true }))
      }

      try {
        const response = await fetch('/api/conversations')

        if (!response.ok) {
          logger.error('Error fetching conversations:', response.statusText)
          return
        }

        const data = await response.json()
        const fetchedConversations = data.conversations || []
        // Map API response to ConversationWithUser structure
        type ApiConversation = {
          user: User
          lastMessage?: Message
          unreadCount: number
        }
        const mappedConversations = (fetchedConversations as ApiConversation[]).map(conv => ({
          id: conv.lastMessage?.conversation_id || '',
          sender: {
            id: session.user.id,
            email: session.user.email,
            userType: session.user.userType,
            full_name: session.user.name || '',
            created_at: '', // Not available from session
            updated_at: '', // Not available from session
          },
          recipient: conv.user,
          sender_id: session.user.id,
          recipient_id: conv.user.id,
          last_message_at: conv.lastMessage?.created_at || '',
          created_at: conv.lastMessage?.created_at || '',
          unreadCount: conv.unreadCount || 0,
        }))
        setConversations(mappedConversations)

        logger.info('💬 useConversations: Fetched', fetchedConversations.length, 'conversations')

        // Mark as initially loaded once we've successfully fetched conversations
        if (isInitialLoad) {
          setChatUiState(prev => ({
            ...prev,
            hasInitiallyLoadedConversations: true,
          }))
        }
      } catch (error) {
        logger.error('Error fetching conversations:', error)
      } finally {
        // Only turn off loading if this was an initial load
        if (isInitialLoad) {
          setLoadingStates(prev => ({ ...prev, conversations: false }))
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      session?.user?.id,
      session?.user?.email,
      session?.user?.name,
      session?.user?.role,
      // Intentionally omitting Jotai setters to prevent infinite loops
      // lastFetchTimeRef is a ref and doesn't need to be in deps
    ]
  )

  const updateConversationFromMessage = useCallback(
    (message: Message) => {
      if (!session?.user?.id) return

      // Update conversations when a new message arrives
      setConversations(prev => {
        const otherUserId =
          message.sender_id === session.user.id ? message.recipient_id : message.sender_id

        const existingConvIndex = prev.findIndex(conv => {
          const otherUser = conv.sender.id === session.user.id ? conv.recipient : conv.sender
          return otherUser.id === otherUserId
        })

        if (existingConvIndex >= 0) {
          // Update existing conversation
          const updatedConversations = [...prev]
          const existingConv = updatedConversations[existingConvIndex]

          updatedConversations[existingConvIndex] = {
            ...existingConv,
            last_message_at: message.created_at,
            unreadCount:
              message.sender_id !== session.user.id
                ? existingConv.unreadCount + 1
                : existingConv.unreadCount,
          }

          // Move to front
          return [
            updatedConversations[existingConvIndex],
            ...updatedConversations.filter((_, i) => i !== existingConvIndex),
          ]
        } else {
          // This would be a new conversation, but we'd need user data
          // In practice, the real-time listener will trigger a full refetch
          return prev
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.user?.id] // Intentionally omitting setConversations as it's a stable Jotai setter
  )

  const markConversationAsRead = useCallback(
    async (userId: string) => {
      if (!session?.user?.id) return

      try {
        const response = await fetch('/api/messages/mark-read', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            senderId: userId,
            recipientId: session.user.id,
          }),
        })

        if (response.ok) {
          // Update local conversation state
          setConversations(prev =>
            prev.map(conv => {
              const otherUser = conv.sender.id === session.user.id ? conv.recipient : conv.sender
              return otherUser.id === userId ? { ...conv, unreadCount: 0 } : conv
            })
          )
        }
      } catch (error) {
        logger.error('Error marking conversation as read:', error)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.user?.id] // Intentionally omitting setConversations as it's a stable Jotai setter
  )

  // Fetch conversations on mount and when session changes, with polling fallback
  useEffect(() => {
    if (session?.user?.id) {
      // Initial load with loading spinner
      fetchConversations(true)

      // Polling fallback - refresh conversations (background updates)
      // This ensures conversation list stays updated even if real-time fails
      // Reduced frequency in test/CI environment to prevent timeout issues
      const pollIntervalMs = process.env.NODE_ENV === 'test' ? 60000 : 30000 // 60s for tests, 30s for dev
      const pollInterval = setInterval(() => {
        fetchConversations(false) // Background update, no loading spinner
      }, pollIntervalMs)

      return () => clearInterval(pollInterval)
    }
  }, [session?.user?.id, fetchConversations])

  // Real-time updates for messages (which affect conversations) with error handling
  // Temporarily disabled due to schema mismatch - relying on polling fallback
  useSupabaseRealtime({
    table: 'messages',
    disabled: true, // Disabled due to schema mismatch
    onInsert: payload => {
      try {
        const newMessage = payload.new as Message

        // Only process messages relevant to current user
        const isRelevantMessage =
          newMessage.sender_id === session?.user?.id ||
          newMessage.recipient_id === session?.user?.id

        if (isRelevantMessage) {
          // Refresh conversations to get updated unread counts and last messages (background update)
          fetchConversations(false)
        }
      } catch (error) {
        logger.error('Error processing realtime conversation insert:', error)
      }
    },
    onUpdate: payload => {
      try {
        const updatedMessage = payload.new as Message

        // Only process messages relevant to current user
        const isRelevantMessage =
          updatedMessage.sender_id === session?.user?.id ||
          updatedMessage.recipient_id === session?.user?.id

        if (isRelevantMessage) {
          // Refresh conversations to get updated read status (background update)
          fetchConversations(false)
        }
      } catch (error) {
        logger.error('Error processing realtime conversation update:', error)
      }
    },
  })

  const getConversationByUserId = useCallback(
    (userId: string) => {
      return conversations.find(conv => conv.sender.id === userId || conv.recipient.id === userId)
    },
    [conversations]
  )

  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0)

  return {
    conversations,
    loading: loadingStates.conversations && !chatUiState.hasInitiallyLoadedConversations, // Only show loading if we haven't loaded initially
    totalUnreadCount,
    fetchConversations,
    markConversationAsRead,
    getConversationByUserId,
    updateConversationFromMessage,
  }
}
