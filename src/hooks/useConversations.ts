'use client'

import { useAtom } from 'jotai'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect } from 'react'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { 
  conversationsAtom,
  loadingStatesAtom
} from '@/lib/atoms'
import type { Message } from '@/lib/atoms'

export function useConversations() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useAtom(conversationsAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)

  const fetchConversations = useCallback(async () => {
    if (!session?.user?.id) return

    setLoadingStates(prev => ({ ...prev, conversations: true }))

    try {
      const response = await fetch('/api/conversations')
      
      if (!response.ok) {
        console.error('Error fetching conversations:', response.statusText)
        return
      }

      const data = await response.json()
      const fetchedConversations = data.conversations || []
      
      console.log('💬 useConversations: Fetched', fetchedConversations.length, 'conversations')
      
      setConversations(fetchedConversations)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoadingStates(prev => ({ ...prev, conversations: false }))
    }
  }, [session?.user?.id, setConversations, setLoadingStates])

  const updateConversationFromMessage = useCallback((message: Message) => {
    if (!session?.user?.id) return

    // Update conversations when a new message arrives
    setConversations(prev => {
      const otherUserId = message.sender_id === session.user.id 
        ? message.recipient_id 
        : message.sender_id

      const existingConvIndex = prev.findIndex(conv => conv.user.id === otherUserId)
      
      if (existingConvIndex >= 0) {
        // Update existing conversation
        const updatedConversations = [...prev]
        const existingConv = updatedConversations[existingConvIndex]
        
        updatedConversations[existingConvIndex] = {
          ...existingConv,
          lastMessage: message,
          unreadCount: message.sender_id !== session.user.id 
            ? existingConv.unreadCount + 1 
            : existingConv.unreadCount
        }
        
        // Move to front
        return [updatedConversations[existingConvIndex], ...updatedConversations.filter((_, i) => i !== existingConvIndex)]
      } else {
        // This would be a new conversation, but we'd need user data
        // In practice, the real-time listener will trigger a full refetch
        return prev
      }
    })
  }, [session?.user?.id, setConversations])

  const markConversationAsRead = useCallback(async (userId: string) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/messages/mark-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: userId,
          recipientId: session.user.id
        }),
      })

      if (response.ok) {
        // Update local conversation state
        setConversations(prev => 
          prev.map(conv => 
            conv.user.id === userId 
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        )
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error)
    }
  }, [session?.user?.id, setConversations])

  // Fetch conversations on mount and when session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations()
    }
  }, [session?.user?.id, fetchConversations])

  // Real-time updates for messages (which affect conversations)
  useSupabaseRealtime({
    table: 'messages',
    onInsert: (payload) => {
      const newMessage = payload.new as Message
      
      // Only process messages relevant to current user
      const isRelevantMessage = 
        newMessage.sender_id === session?.user?.id || 
        newMessage.recipient_id === session?.user?.id
      
      if (isRelevantMessage) {
        // Refresh conversations to get updated unread counts and last messages
        fetchConversations()
      }
    },
    onUpdate: (payload) => {
      const updatedMessage = payload.new as Message
      
      // Only process messages relevant to current user
      const isRelevantMessage = 
        updatedMessage.sender_id === session?.user?.id || 
        updatedMessage.recipient_id === session?.user?.id
      
      if (isRelevantMessage) {
        // Refresh conversations to get updated read status
        fetchConversations()
      }
    }
  })

  const getConversationByUserId = useCallback((userId: string) => {
    return conversations.find(conv => conv.user.id === userId)
  }, [conversations])

  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0)

  return {
    conversations,
    loading: loadingStates.conversations,
    totalUnreadCount,
    fetchConversations,
    markConversationAsRead,
    getConversationByUserId,
    updateConversationFromMessage
  }
}