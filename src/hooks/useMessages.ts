'use client'

import { useAtom } from 'jotai'

import { useCallback, useEffect, useRef } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { api } from '@/lib/api-client'
import {
  chatUiStateAtom,
  currentConversationIdAtom,
  loadingStatesAtom,
  messagesAtom,
  messagesFetchTimestampAtom,
  selectedRecipientAtom,
  sendMessageActionAtom,
  uiStateAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Message, MessageWithUser } from '@/lib/supabase'

const logger = createLogger('useMessages')

export function useMessages(recipientId?: string) {
  const { data: session } = useSession()
  const [messages, setMessages] = useAtom(messagesAtom)
  const [currentConversationId, setCurrentConversationId] = useAtom(currentConversationIdAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)
  const [chatUiState, setChatUiState] = useAtom(chatUiStateAtom)
  const [, setSelectedRecipient] = useAtom(selectedRecipientAtom)
  const [, setUiState] = useAtom(uiStateAtom)

  // Debounce message fetching to prevent race conditions using atoms
  const [lastMessagesFetchTime, setLastMessagesFetchTime] = useAtom(messagesFetchTimestampAtom)

  // Use ref to track loaded conversations without causing re-renders
  const loadedConversationsRef = useRef<Set<string>>(new Set())

  // Use action atom for sending messages
  const [, sendMessageAction] = useAtom(sendMessageActionAtom)

  // Set current conversation when recipientId changes
  useEffect(() => {
    if (recipientId && recipientId !== currentConversationId) {
      setCurrentConversationId(recipientId)
      setSelectedRecipient(recipientId) // Sync with global state
    }
  }, [recipientId, currentConversationId, setCurrentConversationId, setSelectedRecipient])

  const fetchMessages = useCallback(
    async (targetRecipientId?: string, isInitialLoad = false) => {
      const targetId = targetRecipientId || recipientId
      if (!session?.user?.id || !targetId) return

      // Debounce: prevent multiple fetches within 1 second
      const now = Date.now()
      if (!isInitialLoad && now - lastMessagesFetchTime < 1000) {
        logger.debug('Skipping messages fetch due to debouncing')
        return
      }
      setLastMessagesFetchTime(now)

      // Only show loading spinner on initial load, not on background updates
      if (isInitialLoad) {
        setLoadingStates(prev => ({ ...prev, messages: true }))
      }

      try {
        const response = await api.get<{ messages: MessageWithUser[] }>(
          `/api/messages?recipientId=${targetId}`,
          { suppressGlobalToast: true }
        )

        const fetchedMessages = response.data.messages || []

        // Enhanced message deduplication and sorting
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const newMessages = fetchedMessages.filter((m: MessageWithUser) => !existingIds.has(m.id))

          // Merge and sort by creation time to ensure proper order
          const merged = [...prev, ...newMessages].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )

          return merged
        })
        // Mark messages as read - call directly to avoid circular dependency
        if (targetId) {
          try {
            await api.patch(
              '/api/messages/mark-read',
              {
                senderId: targetId,
                recipientId: session.user.id,
              },
              { suppressGlobalToast: true }
            )
          } catch (error) {
            logger.error('Error marking messages as read:', error)
          }
        }
        // Mark as initially loaded once we've successfully fetched messages
        if (isInitialLoad) {
          setChatUiState(prev => ({
            ...prev,
            hasInitiallyLoadedMessages: true,
          }))
          // Update the conversation ID using the proper atom
          setCurrentConversationId(targetId)
        }
      } catch (error) {
        logger.error('Error fetching messages:', error)
      } finally {
        // Only turn off loading if this was an initial load
        if (isInitialLoad) {
          setLoadingStates(prev => ({ ...prev, messages: false }))
        }
      }
    },
    [
      session?.user?.id,
      recipientId,
      setMessages,
      setLoadingStates,
      setChatUiState,
      lastMessagesFetchTime,
      setLastMessagesFetchTime,
      setCurrentConversationId,
    ]
  )

  const markMessagesAsRead = useCallback(
    async (targetRecipientId?: string) => {
      const targetId = targetRecipientId || recipientId
      if (!session?.user?.id || !targetId) return

      try {
        await api.patch(
          '/api/messages/mark-read',
          {
            senderId: targetId,
            recipientId: session.user.id,
          },
          { suppressGlobalToast: true }
        )
      } catch (error) {
        logger.error('Error marking messages as read:', error)
      }
    },
    [session?.user?.id, recipientId]
  )

  const sendMessage = useCallback(
    async (content: string, workoutId?: string, targetRecipientId?: string) => {
      const targetId = targetRecipientId || recipientId
      if (!targetId) return false

      try {
        await sendMessageAction({
          recipientId: targetId,
          content,
          workoutId,
        })
        return true
      } catch (error) {
        logger.error('Error sending message:', error)
        return false
      }
    },
    [recipientId, sendMessageAction]
  )

  // Real-time updates for messages with error handling
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

        if (!isRelevantMessage) return

        // Fetch the sender info for the new message
        api
          .get<{ user: MessageWithUser['sender'] }>(`/api/users/${newMessage.sender_id}`, {
            suppressGlobalToast: true,
          })
          .then(response => response.data)
          .then(({ user: sender }) => {
            if (sender) {
              const messageWithUser: MessageWithUser = {
                ...newMessage,
                sender,
              }

              setMessages(prev => {
                // Check if message already exists to avoid duplicates
                const exists = prev.some(msg => msg.id === newMessage.id)
                if (exists) return prev

                // Check if this is replacing an optimistic message
                const optimisticIndex = prev.findIndex(
                  msg =>
                    msg.id.startsWith('temp-') &&
                    msg.sender_id === newMessage.sender_id &&
                    msg.recipient_id === newMessage.recipient_id &&
                    msg.content === newMessage.content
                )

                if (optimisticIndex >= 0) {
                  // Replace optimistic message with real one
                  return prev.map((msg, index) =>
                    index === optimisticIndex ? messageWithUser : msg
                  )
                }

                return [...prev, messageWithUser]
              })

              // Mark message as read if it's from the other user and we're in their conversation
              if (
                newMessage.sender_id === currentConversationId &&
                newMessage.recipient_id === session?.user?.id
              ) {
                markMessagesAsRead(newMessage.sender_id)
              }
            }
          })
          .catch(error => {
            logger.error('Error fetching sender info:', error)
          })
      } catch (error) {
        logger.error('Error processing realtime message insert:', error)
      }
    },
    onUpdate: payload => {
      try {
        const updatedMessage = payload.new as Message

        // Only process messages relevant to current user
        const isRelevantMessage =
          updatedMessage.sender_id === session?.user?.id ||
          updatedMessage.recipient_id === session?.user?.id

        if (!isRelevantMessage) return

        setMessages(prev =>
          prev.map(msg => (msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg))
        )
      } catch (error) {
        logger.error('Error processing realtime message update:', error)
      }
    },
  })

  // Enhanced polling with exponential backoff and error recovery
  useEffect(() => {
    if (recipientId) {
      // Check if we need to load this conversation
      const needsInitialLoad = !loadedConversationsRef.current.has(recipientId)

      if (needsInitialLoad) {
        // Mark as loading this conversation
        loadedConversationsRef.current.add(recipientId)

        // Initial load with loading spinner
        fetchMessages(recipientId, true)
      }

      // Enhanced polling with exponential backoff for better performance
      let currentInterval = 5000 // Start at 5 seconds
      let consecutiveErrors = 0
      let pollTimeout: NodeJS.Timeout | null = null

      const pollMessages = async () => {
        try {
          await fetchMessages(recipientId, false) // Background update, no loading spinner
          // Reset on successful fetch
          currentInterval = 5000
          consecutiveErrors = 0
          setUiState(prev => ({ ...prev, connectionStatus: 'connected' }))
        } catch (error) {
          logger.error('Error in message polling:', error)
          consecutiveErrors++
          // Exponential backoff on errors, max 60 seconds
          currentInterval = Math.min(currentInterval * Math.pow(2, consecutiveErrors), 60000)

          // Update connection status based on error count
          if (consecutiveErrors >= 3) {
            setUiState(prev => ({ ...prev, connectionStatus: 'disconnected' }))
          } else {
            setUiState(prev => ({ ...prev, connectionStatus: 'reconnecting' }))
          }
        }

        // Schedule next poll with current interval
        pollTimeout = setTimeout(pollMessages, currentInterval)
      }

      // Start polling
      pollTimeout = setTimeout(pollMessages, currentInterval)

      return () => {
        if (pollTimeout) {
          clearTimeout(pollTimeout)
        }
      }
    }
  }, [recipientId, setChatUiState, fetchMessages, setUiState])

  // Get messages for current conversation by filtering global messages
  const getConversationMessages = () => {
    if (!recipientId || !session?.user?.id) return []

    // Filter messages for this specific conversation
    return messages.filter(
      message =>
        (message.sender_id === session.user.id && message.recipient_id === recipientId) ||
        (message.sender_id === recipientId && message.recipient_id === session.user.id)
    )
  }

  const getLoadingState = () => {
    return loadingStates.messages && !chatUiState.hasInitiallyLoadedMessages
  }

  return {
    messages: getConversationMessages(),
    allMessages: messages,
    loading: getLoadingState(),
    sendMessage,
    fetchMessages,
    markMessagesAsRead,
  }
}
