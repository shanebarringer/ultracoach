'use client'

import { useAtom } from 'jotai'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { 
  messagesAtom, 
  currentConversationIdAtom,
  loadingStatesAtom
} from '@/lib/atoms'
import type { MessageWithUser, Message } from '@/lib/atoms'

export function useMessages(recipientId?: string) {
  const { data: session } = useSession()
  const [messages, setMessages] = useAtom(messagesAtom)
  const [currentConversationId, setCurrentConversationId] = useAtom(currentConversationIdAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  
  // Set current conversation when recipientId changes
  useEffect(() => {
    if (recipientId && recipientId !== currentConversationId) {
      setCurrentConversationId(recipientId)
    }
  }, [recipientId, currentConversationId, setCurrentConversationId])

  const fetchMessages = useCallback(async (targetRecipientId?: string, isInitialLoad = false) => {
    const targetId = targetRecipientId || recipientId
    if (!session?.user?.id || !targetId) return

    // Only show loading spinner on initial load, not on background updates
    if (isInitialLoad) {
      setLoadingStates(prev => ({ ...prev, messages: true }))
    }

    try {
      const response = await fetch(`/api/messages?recipientId=${targetId}`)
      
      if (!response.ok) {
        console.error('Error fetching messages:', response.statusText)
        return
      }

      const data = await response.json()
      const fetchedMessages = data.messages || []
      
      // Update messages atom with new messages, filtering out duplicates
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMessages = fetchedMessages.filter((m: MessageWithUser) => !existingIds.has(m.id))
        return [...prev, ...newMessages]
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
              recipientId: session.user.id
            }),
          })

          if (!readResponse.ok) {
            console.error('Error marking messages as read:', readResponse.statusText)
          }
        } catch (error) {
          console.error('Error marking messages as read:', error)
        }
      }
      // Mark as initially loaded once we've successfully fetched messages
      if (isInitialLoad) {
        setHasInitiallyLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      // Only turn off loading if this was an initial load
      if (isInitialLoad) {
        setLoadingStates(prev => ({ ...prev, messages: false }))
      }
    }
  }, [session?.user?.id, recipientId, setMessages, setLoadingStates, setHasInitiallyLoaded])

  const markMessagesAsRead = useCallback(async (targetRecipientId?: string) => {
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
          recipientId: session.user.id
        }),
      })

      if (!response.ok) {
        console.error('Error marking messages as read:', response.statusText)
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [session?.user?.id, recipientId])

  const sendMessage = useCallback(async (content: string, targetRecipientId?: string) => {
    const targetId = targetRecipientId || recipientId
    if (!session?.user?.id || !targetId) return false

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          recipientId: targetId
        }),
      })

      if (!response.ok) {
        console.error('Error sending message:', response.statusText)
        return false
      }

      // Real-time will handle adding the message to state
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }, [session?.user?.id, recipientId])

  // Real-time updates for messages with error handling
  useSupabaseRealtime({
    table: 'messages',
    onInsert: (payload) => {
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
                sender
              }
              
              setMessages(prev => {
                // Check if message already exists to avoid duplicates
                const exists = prev.some(msg => msg.id === newMessage.id)
                if (exists) return prev
                
                return [...prev, messageWithUser]
              })

              // Mark message as read if it's from the other user and we're in their conversation
              if (newMessage.sender_id === currentConversationId && newMessage.recipient_id === session?.user?.id) {
                markMessagesAsRead(newMessage.sender_id)
              }
            }
          })
          .catch((error) => {
            console.error('Error fetching sender info:', error)
          })
      } catch (error) {
        console.error('Error processing realtime message insert:', error)
      }
    },
    onUpdate: (payload) => {
      try {
        const updatedMessage = payload.new as Message
        
        // Only process messages relevant to current user
        const isRelevantMessage = 
          updatedMessage.sender_id === session?.user?.id || 
          updatedMessage.recipient_id === session?.user?.id
        
        if (!isRelevantMessage) return

        setMessages(prev => 
          prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...msg, ...updatedMessage }
              : msg
          )
        )
      } catch (error) {
        console.error('Error processing realtime message update:', error)
      }
    }
  })

  // Fetch messages when recipientId changes and set up polling fallback
  useEffect(() => {
    if (recipientId) {
      // Reset loading state when switching conversations
      setHasInitiallyLoaded(false)
      
      // Initial load with loading spinner
      fetchMessages(recipientId, true)
      
      // Polling fallback - refresh messages every 5 seconds (background updates)
      // This ensures chat works even if real-time fails
      const pollInterval = setInterval(() => {
        fetchMessages(recipientId, false) // Background update, no loading spinner
      }, 5000)

      return () => clearInterval(pollInterval)
    }
  }, [recipientId, fetchMessages, setHasInitiallyLoaded])

  // Get messages for current conversation
  const conversationMessages = messages.filter(message => {
    if (!recipientId || !session?.user?.id) return false
    
    return (
      (message.sender_id === session.user.id && message.recipient_id === recipientId) ||
      (message.sender_id === recipientId && message.recipient_id === session.user.id)
    )
  })

  return {
    messages: conversationMessages,
    allMessages: messages,
    loading: loadingStates.messages && !hasInitiallyLoaded, // Only show loading if we haven't loaded initially
    sendMessage,
    fetchMessages,
    markMessagesAsRead
  }
}