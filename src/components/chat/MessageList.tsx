'use client'

import { useEffect, useRef } from 'react'
import type { Message, User } from '@/lib/supabase'

interface MessageWithUser extends Message {
  sender: User
}

interface MessageListProps {
  messages: MessageWithUser[]
  currentUserId: string
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const groupMessagesByDate = (messages: MessageWithUser[]) => {
    const groups: { [key: string]: MessageWithUser[] } = {}
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
    
    if (dateString === today) {
      return 'Today'
    } else if (dateString === yesterday) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  const messageGroups = groupMessagesByDate(messages)

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
          <p className="mt-1 text-sm text-gray-500">Start the conversation by sending a message.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {Object.entries(messageGroups).map(([date, dayMessages]) => (
        <div key={date}>
          <div className="flex justify-center mb-4">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {formatDateHeader(date)}
            </span>
          </div>
          
          <div className="space-y-2">
            {dayMessages.map((message) => {
              const isOwnMessage = message.sender_id === currentUserId
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="text-xs font-medium mb-1 opacity-75">
                          {message.sender.full_name}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.created_at)}
                        {!message.read && isOwnMessage && (
                          <span className="ml-2">•</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}