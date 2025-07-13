'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import { useMessages } from '@/hooks/useMessages'
import { useTypingStatus } from '@/hooks/useTypingStatus'
import type { User } from '@/lib/atoms'

interface ChatWindowProps {
  recipientId: string
  recipient: User
}

export default function ChatWindow({ recipientId, recipient }: ChatWindowProps) {
  const { data: session } = useSession()
  const [sending, setSending] = useState(false)
  
  // Use Jotai hooks for state management
  const { messages, loading, sendMessage } = useMessages(recipientId)
  const { isRecipientTyping, startTyping, stopTyping } = useTypingStatus(recipientId)

  const handleSendMessage = useCallback(async (content: string) => {
    if (!session?.user?.id || sending) return

    setSending(true)
    try {
      const success = await sendMessage(content)
      if (!success) {
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }, [session?.user?.id, sending, sendMessage])


  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
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
      <div className="flex-1 flex flex-col min-h-0">
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
        onSendMessage={handleSendMessage} 
        onStartTyping={startTyping}
        onStopTyping={stopTyping}
        disabled={sending || !session?.user?.id}
      />
    </div>
  )
}