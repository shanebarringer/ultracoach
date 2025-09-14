'use client'

import { atom, useAtom } from 'jotai'
import type { Atom, PrimitiveAtom } from 'jotai'
import { splitAtom } from 'jotai/utils'

import { memo, useEffect, useMemo, useRef } from 'react'

import type { MessageWithUser, OptimisticMessage } from '@/lib/supabase'

import GranularMessage from './GranularMessage'

interface PerformantMessageListProps {
  recipientId: string
  currentUserId: string
  messages: MessageWithUser[]
}

// High-performance message list using splitAtom pattern
const PerformantMessageList = memo(({ currentUserId, messages }: PerformantMessageListProps) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Create a temporary atom from the messages prop for splitAtom to work
  const messagesAtom = useMemo(() => atom(messages as OptimisticMessage[]), [messages])
  // Split the array atom into individual atoms for each message
  const messageAtomsAtom = useMemo(() => splitAtom(messagesAtom), [messagesAtom])
  const [messageAtoms] = useAtom(messageAtomsAtom) as [PrimitiveAtom<OptimisticMessage>[], unknown]

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
          messageAtom={messageAtom as unknown as Atom<import('@/lib/supabase').MessageWithUser>}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
})

PerformantMessageList.displayName = 'PerformantMessageList'

export default PerformantMessageList
