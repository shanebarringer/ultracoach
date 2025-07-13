'use client'

import { useAtom } from 'jotai'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect } from 'react'
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
  
  // Set current conversation when recipientId changes
  useEffect(() => {
    if (recipientId && recipientId !== currentConversationId) {
      setCurrentConversationId(recipientId)
    }
  }, [recipientId, currentConversationId, setCurrentConversationId])

  const fetchMessages = useCallback(async (targetRecipientId?: string) => {
    const targetId = targetRecipientId || recipientId
    if (!session?.user?.id || !targetId) return

    setLoadingStates(prev => ({ ...prev, messages: true }))

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
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoadingStates(prev => ({ ...prev, messages: false }))
    }
  }, [session?.user?.id, recipientId, setMessages, setLoadingStates])

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

  // Real-time updates for messages
  useSupabaseRealtime({
    table: 'messages',
    onInsert: (payload) => {
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
    },
    onUpdate: (payload) => {
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
    }
  })

  // Fetch messages when recipientId changes
  useEffect(() => {
    if (recipientId) {
      fetchMessages(recipientId)
    }
  }, [recipientId, fetchMessages])

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
    loading: loadingStates.messages,
    sendMessage,
    fetchMessages,
    markMessagesAsRead
  }
}