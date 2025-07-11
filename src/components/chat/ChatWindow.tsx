'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import { supabase } from '@/lib/supabase'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
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

  const markMessagesAsRead = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', recipientId)
        .eq('recipient_id', session.user.id)
        .eq('read', false)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [session?.user?.id, recipientId])

  const fetchMessages = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(*)
        `)
        .or(`
          and(sender_id.eq.${session.user.id},recipient_id.eq.${recipientId}),
          and(sender_id.eq.${recipientId},recipient_id.eq.${session.user.id})
        `)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      setMessages(data || [])

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
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            content,
            sender_id: session.user.id,
            recipient_id: recipientId,
            read: false
          }
        ])

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message. Please try again.')
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
  }, [fetchMessages])

  // Real-time updates for new messages
  useSupabaseRealtime({
    table: 'messages',
    filter: `or(and(sender_id.eq.${session?.user?.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${session?.user?.id}))`,
    onInsert: (payload) => {
      const newMessage = payload.new as Message
      
      // Fetch the sender info for the new message
      supabase
        .from('users')
        .select('*')
        .eq('id', newMessage.sender_id)
        .single()
        .then(({ data: sender }) => {
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

            // Mark message as read if it's from the other user
            if (newMessage.sender_id === recipientId) {
              markMessagesAsRead()
            }
          }
        })
    },
    onUpdate: (payload) => {
      const updatedMessage = payload.new as Message
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
      <MessageList 
        messages={messages} 
        currentUserId={session?.user?.id || ''} 
      />

      {/* Message Input */}
      <MessageInput 
        onSendMessage={sendMessage} 
        disabled={sending}
      />
    </div>
  )
}