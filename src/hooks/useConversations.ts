'use client'

import { useAtom } from 'jotai'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect } from 'react'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { 
  conversationsAtom,
  loadingStatesAtom,
  chatUiStateAtom
} from '@/lib/atoms'
import type { Message } from '@/lib/atoms'

export function useConversations() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useAtom(conversationsAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)
  const [chatUiState, setChatUiState] = useAtom(chatUiStateAtom)

  const fetchConversations = useCallback(async (isInitialLoad = false) => {
    if (!session?.user?.id) return

    // Only show loading spinner on initial load, not on background updates
    if (isInitialLoad) {
      setLoadingStates(prev => ({ ...prev, conversations: true }))
    }

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
      
      // Mark as initially loaded once we've successfully fetched conversations
      if (isInitialLoad) {
        setChatUiState(prev => ({ 
          ...prev, 
          hasInitiallyLoadedConversations: true
        }))
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      // Only turn off loading if this was an initial load
      if (isInitialLoad) {
        setLoadingStates(prev => ({ ...prev, conversations: false }))
      }
    }
  }, [session?.user?.id, setConversations, setLoadingStates, setChatUiState])

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

  // Fetch conversations on mount and when session changes, with polling fallback
  useEffect(() => {
    if (session?.user?.id) {
      // Initial load with loading spinner
      fetchConversations(true)
      
      // Polling fallback - refresh conversations every 10 seconds (background updates)
      // This ensures conversation list stays updated even if real-time fails
      const pollInterval = setInterval(() => {
        fetchConversations(false) // Background update, no loading spinner
      }, 10000)

      return () => clearInterval(pollInterval)
    }
  }, [session?.user?.id, fetchConversations])

  // Real-time updates for messages (which affect conversations) with error handling
  useSupabaseRealtime({
    table: 'messages',
    onInsert: (payload) => {
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
        console.error('Error processing realtime conversation insert:', error)
      }
    },
    onUpdate: (payload) => {
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
        console.error('Error processing realtime conversation update:', error)
      }
    }
  })

  const getConversationByUserId = useCallback((userId: string) => {
    return conversations.find(conv => conv.user.id === userId)
  }, [conversations])

  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0)

  return {
    conversations,
    loading: loadingStates.conversations && !chatUiState.hasInitiallyLoadedConversations, // Only show loading if we haven't loaded initially
    totalUnreadCount,
    fetchConversations,
    markConversationAsRead,
    getConversationByUserId,
    updateConversationFromMessage
  }
}