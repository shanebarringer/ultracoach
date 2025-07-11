'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import { supabase } from '@/lib/supabase'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { useTypingStatus } from '@/hooks/useTypingStatus'
import type { Message, User } from '@/lib/supabase'

interface MessageWithUser extends Message {
  sender: User
}

interface ChatWindowProps {
  recipientId: string
  recipient: User
}

export default function ChatWindow({ recipientId, recipient }: ChatWindowProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<MessageWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Typing status
  const { isRecipientTyping, startTyping, stopTyping } = useTypingStatus(recipientId)

  const markMessagesAsRead = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/messages/mark-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: recipientId,
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

  const fetchMessages = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/messages?recipientId=${recipientId}`)
      
      if (!response.ok) {
        console.error('Error fetching messages:', response.statusText)
        return
      }

      const data = await response.json()
      console.log('💬 ChatWindow: Fetched messages:', data.messages?.length || 0, 'messages')
      
      if (data.messages?.length > 0) {
        console.log('💬 ChatWindow: First message structure:', data.messages[0])
      }
      
      setMessages(data.messages || [])

      // Mark messages as read
      await markMessagesAsRead()
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, recipientId, markMessagesAsRead])

  const sendMessage = async (content: string) => {
    if (!session?.user?.id || sending) return

    setSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          recipientId
        }),
      })

      if (!response.ok) {
        console.error('Error sending message:', response.statusText)
        alert('Failed to send message. Please try again.')
      } else {
        // Refresh messages to ensure UI is updated
        fetchMessages()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    
    // Polling fallback - refresh messages every 3 seconds if real-time fails
    const pollInterval = setInterval(() => {
      fetchMessages()
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [fetchMessages])

  // Real-time updates for new messages - simplified filter
  useSupabaseRealtime({
    table: 'messages',
    onInsert: (payload) => {
      const newMessage = payload.new as Message
      
      // Only process messages relevant to this conversation
      const isRelevantMessage = 
        (newMessage.sender_id === session?.user?.id && newMessage.recipient_id === recipientId) ||
        (newMessage.sender_id === recipientId && newMessage.recipient_id === session?.user?.id)
      
      if (!isRelevantMessage) return

      console.log('💬 Real-time: New message received:', newMessage)
      
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
              
              console.log('💬 Real-time: Adding new message to state')
              return [...prev, messageWithUser]
            })

            // Mark message as read if it's from the other user
            if (newMessage.sender_id === recipientId) {
              markMessagesAsRead()
            }
          }
        })
        .catch(error => {
          console.error('Error fetching sender info:', error)
        })
    },
    onUpdate: (payload) => {
      const updatedMessage = payload.new as Message
      
      // Only process messages relevant to this conversation
      const isRelevantMessage = 
        (updatedMessage.sender_id === session?.user?.id && updatedMessage.recipient_id === recipientId) ||
        (updatedMessage.sender_id === recipientId && updatedMessage.recipient_id === session?.user?.id)
      
      if (!isRelevantMessage) return

      console.log('💬 Real-time: Message updated:', updatedMessage)
      setMessages(prev => 
        prev.map(msg => 
          msg.id === updatedMessage.id 
            ? { ...msg, ...updatedMessage }
            : msg
        )
      )
    }
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Debug logging
  console.log('💬 ChatWindow Debug:', {
    hasSession: !!session,
    userId: session?.user?.id,
    sending,
    recipientId,
    messagesCount: messages.length
  })

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
            {recipient.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {recipient.full_name}
            </h1>
            <p className="text-sm text-gray-500 capitalize">
              {recipient.role}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        <MessageList 
          messages={messages} 
          currentUserId={session?.user?.id || ''} 
        />
        
        {/* Typing Indicator */}
        <div className="px-4">
          <TypingIndicator 
            isTyping={isRecipientTyping} 
            userName={recipient.full_name} 
          />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput 
        onSendMessage={sendMessage} 
        onStartTyping={startTyping}
        onStopTyping={stopTyping}
        disabled={sending || !session?.user?.id}
      />
    </div>
  )
}