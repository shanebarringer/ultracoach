'use client'

import { useAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import {
  chatUiStateAtom,
  currentConversationIdAtom,
  loadingStatesAtom,
  messagesAtom,
  messagesByConversationLoadableFamily,
  messagesFetchTimestampAtom,
  selectedRecipientAtom,
  sendMessageActionAtom,
  uiStateAtom,
} from '@/lib/atoms'
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

  // Use atomFamily for conversation-specific messages
  const [conversationMessages] = useAtom(
    recipientId ? messagesByConversationLoadableFamily(recipientId) : messagesAtom
  )

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
        const response = await fetch(`/api/messages?recipientId=${targetId}`)

        if (!response.ok) {
          logger.error('Error fetching messages:', response.statusText)
          return
        }

        const data = await response.json()
        const fetchedMessages = data.messages || []

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
            const readResponse = await fetch('/api/messages/mark-read', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                senderId: targetId,
                recipientId: session.user.id,
              }),
            })

            if (!readResponse.ok) {
              logger.error('Error marking messages as read:', readResponse.statusText)
            }
          } catch (error) {
            logger.error('Error marking messages as read:', error)
          }
        }
        // Mark as initially loaded once we've successfully fetched messages
        if (isInitialLoad) {
          setChatUiState(prev => ({
            ...prev,
            hasInitiallyLoadedMessages: true,
            currentRecipientId: targetId,
          }))
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
    ]
  )

  const markMessagesAsRead = useCallback(
    async (targetRecipientId?: string) => {
      const targetId = targetRecipientId || recipientId
      if (!session?.user?.id || !targetId) return

      try {
        const response = await fetch('/api/messages/mark-read', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            senderId: targetId,
            recipientId: session.user.id,
          }),
        })

        if (!response.ok) {
          logger.error('Error marking messages as read:', response.statusText)
        }
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
  useSupabaseRealtime({
    table: 'messages',
    onInsert: payload => {
      try {
        const newMessage = payload.new as Message

        // Only process messages relevant to current user
        const isRelevantMessage =
          newMessage.sender_id === session?.user?.id ||
          newMessage.recipient_id === session?.user?.id

        if (!isRelevantMessage) return

        // Fetch the sender info for the new message
        fetch(`/api/users/${newMessage.sender_id}`)
          .then(response => response.json())
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
      // Only trigger initial load if we haven't loaded this conversation before
      // or if the conversation has changed
      const needsInitialLoad =
        !chatUiState.hasInitiallyLoadedMessages || chatUiState.currentRecipientId !== recipientId

      if (needsInitialLoad) {
        setChatUiState(prev => ({
          ...prev,
          hasInitiallyLoadedMessages: false,
          currentRecipientId: recipientId,
        }))

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
  }, [
    recipientId,
    chatUiState.currentRecipientId,
    chatUiState.hasInitiallyLoadedMessages,
    setChatUiState,
    fetchMessages,
    setUiState,
  ])

  // Get messages for current conversation using loadable pattern
  const getConversationMessages = () => {
    if (!recipientId) return []

    if (
      conversationMessages &&
      typeof conversationMessages === 'object' &&
      'state' in conversationMessages
    ) {
      // Using loadable atom
      if (conversationMessages.state === 'hasData') {
        return conversationMessages.data || []
      }
      return []
    }

    // Fallback to filtering global messages
    if (!session?.user?.id) return []
    return messages.filter(
      message =>
        (message.sender_id === session.user.id && message.recipient_id === recipientId) ||
        (message.sender_id === recipientId && message.recipient_id === session.user.id)
    )
  }

  const getLoadingState = () => {
    if (!recipientId) return loadingStates.messages && !chatUiState.hasInitiallyLoadedMessages

    if (
      conversationMessages &&
      typeof conversationMessages === 'object' &&
      'state' in conversationMessages
    ) {
      return conversationMessages.state === 'loading'
    }

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
