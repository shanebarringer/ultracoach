'use client'

import { useEffect, useRef, useState } from 'react'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleScroll = () => {
    const container = containerRef.current
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      setShowScrollButton(!isNearBottom && messages.length > 0)
    }
  }

  useEffect(() => {
    // Only auto-scroll if user is near bottom or this is the first message
    const container = containerRef.current
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      const isFirstLoad = messages.length <= 1
      
      if (isNearBottom || isFirstLoad) {
        scrollToBottom()
      }
    }
  }, [messages])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [messages.length])

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
    <div className="flex-1 relative flex flex-col min-h-0">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
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
                        className={`px-4 py-2 rounded-lg text-base font-normal ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white' // Use white text for blue bubble
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
                          className={`text-xs mt-1 flex items-center justify-between ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          <span>{formatTime(message.created_at)}</span>
                          {isOwnMessage && (
                            <div className="flex items-center ml-2">
                              {message.read ? (
                                <div className="flex">
                                  <svg className="w-3 h-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <svg className="w-3 h-3 text-blue-200 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : (
                                <svg className="w-3 h-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
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

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-10"
          aria-label="Scroll to bottom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}