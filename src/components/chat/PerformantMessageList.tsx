'use client'

import { useAtom } from 'jotai'
import { splitAtom } from 'jotai/utils'

import { memo, useEffect, useRef } from 'react'

import { conversationMessagesAtomsFamily } from '@/lib/atoms/index'

import GranularMessage from './GranularMessage'

interface PerformantMessageListProps {
  recipientId: string
  currentUserId: string
}

// High-performance message list using splitAtom pattern
const PerformantMessageList = memo(({ recipientId, currentUserId }: PerformantMessageListProps) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Get the messages atom for this conversation
  const messagesAtom = conversationMessagesAtomsFamily(recipientId)
  // Split the array atom into individual atoms for each message
  const messageAtomsAtom = splitAtom(messagesAtom)
  const [messageAtoms] = useAtom(messageAtomsAtom)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [(messageAtoms as any[]).length])

  // If no messages, show empty state
  if ((messageAtoms as any[]).length === 0) {
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
      {(messageAtoms as any[]).map((messageAtom: any, index: number) => (
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
