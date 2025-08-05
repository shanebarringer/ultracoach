'use client'

import { Avatar, Badge, Chip, Skeleton } from '@heroui/react'
import { ClockIcon, MessageCircleIcon } from 'lucide-react'

import { memo, useMemo } from 'react'

import Link from 'next/link'

import { useConversations } from '@/hooks/useConversations'
import { createLogger } from '@/lib/logger'
import type { ConversationWithUser } from '@/lib/supabase'

import AsyncConversationList from './AsyncConversationList'

const logger = createLogger('ConversationList')

// Helper functions moved outside component for better performance
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
      hour12: true,
    })
  } else if (diffInHours < 168) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
}

const truncateMessage = (content: string, maxLength: number = 50) => {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'coach':
      return 'primary'
    case 'runner':
      return 'secondary'
    default:
      return 'default'
  }
}

// Individual conversation item component for better performance
const ConversationItem = memo(
  ({
    conversation,
    selectedUserId,
  }: {
    conversation: ConversationWithUser
    selectedUserId?: string
  }) => {
    const partner = conversation.recipient
    const unreadCount = conversation.unreadCount
    const partnerId = partner?.id
    const partnerName = partner?.full_name || 'Unknown Explorer'
    const lastMessageContent = conversation.last_message_at
      ? 'Last message sent'
      : `Begin your expedition dialogue with ${partner?.full_name || 'this explorer'}`
    const lastMessageTime = conversation.last_message_at
      ? formatLastMessageTime(conversation.last_message_at)
      : ''

    return (
      <Link
        href={`/chat/${partnerId}`}
        className={`block hover:bg-content2/50 transition-all duration-200 ${
          selectedUserId === partnerId ? 'bg-primary/10 border-r-2 border-r-primary' : ''
        }`}
      >
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <div className="shrink-0 relative">
              <Avatar
                name={partner?.full_name || 'User'}
                size="md"
                classNames={{
                  base: 'bg-linear-to-br from-primary to-secondary',
                  name: 'text-white font-semibold',
                }}
              />
              {partner?.role && (
                <Chip
                  size="sm"
                  color={getRoleColor(partner.role)}
                  variant="solid"
                  className="absolute -bottom-1 -right-1 min-w-unit-5 h-unit-5 text-tiny"
                >
                  {partner.role === 'coach' ? '🏔️' : '🏃'}
                </Chip>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">{partnerName}</h3>
                  {partner?.role && (
                    <Chip
                      size="sm"
                      color={getRoleColor(partner.role)}
                      variant="flat"
                      className="text-tiny capitalize"
                    >
                      {partner.role}
                    </Chip>
                  )}
                </div>
                {lastMessageTime && (
                  <div className="flex items-center gap-1 text-xs text-foreground-500 shrink-0 ml-2">
                    <ClockIcon className="w-3 h-3" />
                    {lastMessageTime}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-foreground-600 truncate">
                  {truncateMessage(lastMessageContent)}
                </p>
                {unreadCount > 0 && (
                  <Badge
                    content={unreadCount}
                    color="danger"
                    size="sm"
                    variant="solid"
                    className="ml-2"
                  >
                    <div className="w-6 h-6" />
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }
)

ConversationItem.displayName = 'ConversationItem'

interface ConversationListProps {
  selectedUserId?: string
  useSuspense?: boolean
}

function ConversationList({ selectedUserId, useSuspense = false }: ConversationListProps) {
  // Call hooks at the top level always
  const { conversations, loading } = useConversations()

  // Memoize conversations to prevent unnecessary renders
  const memoizedConversations = useMemo(() => {
    logger.debug('Conversations updated:', {
      conversationCount: conversations.length,
      selectedUserId,
      loading,
    })
    return conversations
  }, [conversations, selectedUserId, loading])

  // If useSuspense is enabled, use the async version
  if (useSuspense) {
    return <AsyncConversationList selectedUserId={selectedUserId} />
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-sm" />
              <Skeleton className="h-3 w-1/2 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      {memoizedConversations.length === 0 ? (
        <div className="p-6 text-center">
          <MessageCircleIcon className="mx-auto h-8 w-8 text-foreground-400 mb-3" />
          <p className="text-foreground-600 text-sm">No expedition communications yet</p>
          <p className="text-foreground-400 text-xs mt-1">
            Start a conversation to begin your journey
          </p>
        </div>
      ) : (
        <div className="divide-y divide-divider/50">
          {memoizedConversations.map(conversation => (
            <ConversationItem
              key={conversation.recipient?.id}
              conversation={conversation}
              selectedUserId={selectedUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(ConversationList)
