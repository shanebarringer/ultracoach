'use client'

import { useState, useCallback } from 'react'
import { useSession } from '@/hooks/useBetterSession'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Chip } from '@heroui/react'
import { Filter, X } from 'lucide-react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import { useMessages } from '@/hooks/useMessages'
import { useTypingStatus } from '@/hooks/useTypingStatus'
import { useWorkouts } from '@/hooks/useWorkouts'
import type { User } from '@/lib/supabase'

interface ChatWindowProps {
  recipientId: string
  recipient: User
}

export default function ChatWindow({ recipientId, recipient }: ChatWindowProps) {
  const { data: session } = useSession()
  const [sending, setSending] = useState(false)
  const [filterWorkoutId, setFilterWorkoutId] = useState<string | null>(null)
  
  // Use Jotai hooks for state management
  const { messages, loading, sendMessage } = useMessages(recipientId)
  const { isRecipientTyping, startTyping, stopTyping } = useTypingStatus(recipientId)
  const { workouts } = useWorkouts()

  const handleSendMessage = useCallback(async (content: string, workoutId?: string, contextType?: string) => {
    if (!session?.user?.id || sending) return

    setSending(true)
    try {
      const success = await sendMessage(content, workoutId, contextType)
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

  // Filter messages by workout if filter is active
  const filteredMessages = filterWorkoutId 
    ? messages.filter(msg => msg.workout_id === filterWorkoutId)
    : messages

  // Get workout for filter display
  const filterWorkout = filterWorkoutId 
    ? workouts.find(w => w.id === filterWorkoutId)
    : null

  // Get workouts that have messages for filtering options
  const workoutsWithMessages = workouts.filter(workout => 
    messages.some(msg => msg.workout_id === workout.id)
  )


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
      <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-content1">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-medium">
            {recipient.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {recipient.full_name}
            </h1>
            <p className="text-sm text-foreground-600 capitalize">
              {recipient.role}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Active Filter Display */}
          {filterWorkout && (
            <Chip 
              color="primary" 
              variant="flat"
              onClose={() => setFilterWorkoutId(null)}
              size="sm"
            >
              {filterWorkout.planned_type || 'Workout'} - {new Date(filterWorkout.date || '').toLocaleDateString()}
            </Chip>
          )}

          {/* Filter Dropdown */}
          {workoutsWithMessages.length > 0 && (
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  className="text-foreground-600"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu 
                aria-label="Filter messages by workout"
                onAction={(key) => {
                  if (key === 'clear') {
                    setFilterWorkoutId(null)
                  } else {
                    setFilterWorkoutId(key as string)
                  }
                }}
              >
                {[
                  ...(filterWorkoutId ? [
                    <DropdownItem key="clear" startContent={<X className="h-4 w-4" />}>
                      Show All Messages
                    </DropdownItem>
                  ] : []),
                  ...workoutsWithMessages.map((workout) => (
                    <DropdownItem key={workout.id}>
                      {workout.planned_type || 'Workout'} - {new Date(workout.date || '').toLocaleDateString()}
                    </DropdownItem>
                  ))
                ]}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        <MessageList 
          messages={filteredMessages} 
          currentUserId={session?.user?.id as string || ''} 
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
        recipientId={recipientId}
      />
    </div>
  )
}