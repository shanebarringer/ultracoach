'use client'

import { useAtom } from 'jotai'

import { memo, useCallback } from 'react'

import { chatUiStateAtom, workoutsAtom } from '@/lib/atoms'
import type { MessageWithUser } from '@/lib/supabase'

import WorkoutContext from './WorkoutContext'

interface GranularMessageProps {
  messageAtom: import('jotai').Atom<MessageWithUser>
  currentUserId: string
}

// Helper functions for better performance
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 24) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } else if (diffInHours < 168) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

// Memoized individual message component - only re-renders when THIS message changes
const GranularMessage = memo(({ messageAtom, currentUserId }: GranularMessageProps) => {
  const [message] = useAtom(messageAtom)
  const [workouts] = useAtom(workoutsAtom)
  const [, setChatUiState] = useAtom(chatUiStateAtom)

  const handleViewWorkout = useCallback(
    (workoutId: string) => {
      const workout = workouts.find((w: { id: string }) => w.id === workoutId)
      if (workout) {
        setChatUiState(prev => ({
          ...prev,
          showWorkoutModal: true,
          selectedChatWorkout: workout,
        }))
      }
    },
    [workouts, setChatUiState]
  )

  if (!message) return null

  const isFromCurrentUser = message.sender_id === currentUserId
  const senderName = message.sender?.full_name || 'Unknown'

  return (
    <div
      className={`flex mb-4 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`message-${message.id}`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
          isFromCurrentUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-600'
        }`}
      >
        {/* Sender name for messages from others */}
        {!isFromCurrentUser && (
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {senderName}
          </div>
        )}

        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {/* Workout context if linked */}
        {message.workout_id &&
          (() => {
            const workout = workouts.find((w: { id: string }) => w.id === message.workout_id)
            if (workout) {
              return (
                <div className="mt-2">
                  <WorkoutContext
                    workout={workout}
                    linkType={'reference'}
                    className="text-xs"
                    onViewWorkout={handleViewWorkout}
                  />
                </div>
              )
            }
            return null
          })()}

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${
            isFromCurrentUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  )
})

GranularMessage.displayName = 'GranularMessage'

export default GranularMessage
