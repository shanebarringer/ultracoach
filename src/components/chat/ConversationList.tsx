'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import type { Message, User } from '@/lib/supabase'

interface ConversationWithUser {
  user: User
  lastMessage?: Message
  unreadCount: number
}

interface ConversationListProps {
  selectedUserId?: string
}

export default function ConversationList({ selectedUserId }: ConversationListProps) {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<ConversationWithUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/conversations')
      
      if (!response.ok) {
        console.error('Error fetching conversations:', response.statusText)
        return
      }

      const data = await response.json()
      console.log('💬 ConversationList: Fetched', data.conversations?.length || 0, 'conversations')
      
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchConversations()
    
    // Polling fallback - refresh conversations every 5 seconds
    const pollInterval = setInterval(() => {
      fetchConversations()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [fetchConversations])

  // Real-time updates for new messages (with error handling)
  useSupabaseRealtime({
    table: 'messages',
    onInsert: () => {
      fetchConversations()
    },
    onUpdate: () => {
      fetchConversations()
    }
  })

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-gray-500">No conversations yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {conversations.map((conversation) => (
            <Link
              key={conversation.user.id}
              href={`/chat/${conversation.user.id}`}
              className={`block hover:bg-gray-50 transition-colors ${
                selectedUserId === conversation.user.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                      {conversation.user.full_name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.user.full_name}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatLastMessageTime(conversation.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage
                          ? truncateMessage(conversation.lastMessage.content)
                          : `Start a conversation with ${conversation.user.full_name}`
                        }
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 ml-2 flex-shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">
                      {conversation.user.role}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}