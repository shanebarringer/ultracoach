'use client'

import { atom, useAtom, useAtomValue } from 'jotai'
import type { PrimitiveAtom } from 'jotai'
import { splitAtom } from 'jotai/utils'

import { memo, useEffect, useMemo, useRef } from 'react'

import { messagesAtom, sessionAtom } from '@/lib/atoms/index'
import type { OptimisticMessage } from '@/lib/supabase'

import GranularMessage from './GranularMessage'

interface PerformantMessageListProps {
  recipientId: string
  currentUserId: string
}

// High-performance message list using splitAtom pattern
const PerformantMessageList = memo(({ recipientId, currentUserId }: PerformantMessageListProps) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const session = useAtomValue(sessionAtom)

  // Create a derived atom that filters messages for this conversation
  // This follows Jotai best practices: derive state, don't duplicate it
  const filteredMessagesAtom = useMemo(
    () =>
      atom(get => {
        const allMessages = get(messagesAtom)
        if (!session?.user?.id) return []

        // Filter messages for this specific conversation
        return allMessages.filter(
          message =>
            (message.sender_id === session.user.id && message.recipient_id === recipientId) ||
            (message.sender_id === recipientId && message.recipient_id === session.user.id)
        )
      }),
    [recipientId, session?.user?.id]
  )

  // Split the filtered array into individual atoms for each message
  // This enables granular updates - only the changed message re-renders
  const messageAtomsAtom = useMemo(
    () => splitAtom(filteredMessagesAtom as PrimitiveAtom<OptimisticMessage[]>),
    [filteredMessagesAtom]
  )
  const [messageAtoms] = useAtom(messageAtomsAtom)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messageAtoms.length])

  // If no messages, show empty state
  if (messageAtoms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-2"
      style={{ maxHeight: 'calc(100vh - 200px)' }}
    >
      {/* Each message atom renders independently - only re-renders when that specific message changes */}
      {messageAtoms.map((messageAtom, index) => (
        <GranularMessage
          key={index} // Use index as key since atom identity is stable
          messageAtom={messageAtom}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
})

PerformantMessageList.displayName = 'PerformantMessageList'

export default PerformantMessageList
