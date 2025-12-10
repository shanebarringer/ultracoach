'use client'

import { Button, Textarea } from '@heroui/react'
import { useAtom } from 'jotai'
import { Link2, Send } from 'lucide-react'

import { messageInputAtom } from '@/lib/atoms/index'
import { Workout } from '@/lib/supabase'

import WorkoutContext from './WorkoutContext'
import WorkoutLinkSelector from './WorkoutLinkSelector'

interface MessageInputProps {
  onSendMessage: (content: string, workoutId?: string, contextType?: string) => void
  disabled?: boolean
  onStartTyping?: () => void
  onStopTyping?: () => void
}

export default function MessageInput({
  onSendMessage,
  disabled = false,
  onStartTyping,
  onStopTyping,
}: MessageInputProps) {
  const [messageInput, setMessageInput] = useAtom(messageInputAtom)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageInput.message.trim() && !disabled) {
      const contextType = messageInput.linkedWorkout
        ? 'workout_' + messageInput.linkType
        : 'general'
      onSendMessage(messageInput.message.trim(), messageInput.linkedWorkout?.id, contextType)
      setMessageInput({
        message: '',
        linkedWorkout: null,
        linkType: 'reference',
        showWorkoutSelector: false,
      })
      onStopTyping?.()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSelectWorkout = (workout: Workout, selectedLinkType: string) => {
    setMessageInput(prev => ({
      ...prev,
      linkedWorkout: workout,
      linkType: selectedLinkType as 'reference' | 'attachment',
      showWorkoutSelector: false,
    }))
  }

  const handleRemoveWorkout = () => {
    setMessageInput(prev => ({
      ...prev,
      linkedWorkout: null,
      linkType: 'reference',
    }))
  }

  return (
    <>
      <div className="p-4 border-t border-default-200 dark:border-default-700 space-y-3">
        {/* Workout context display */}
        {messageInput.linkedWorkout && (
          <div className="relative">
            <WorkoutContext
              workout={messageInput.linkedWorkout}
              linkType={messageInput.linkType || undefined}
            />
            <Button
              size="md"
              variant="light"
              isIconOnly
              onPress={handleRemoveWorkout}
              className="absolute top-2 right-2 text-default-400 hover:text-default-600 min-w-[44px] min-h-[44px]"
              aria-label="Remove linked workout"
            >
              ×
            </Button>
          </div>
        )}

        {/* Message input form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Textarea
              value={messageInput.message}
              onChange={e => {
                setMessageInput(prev => ({ ...prev, message: e.target.value }))
                if (e.target.value.trim() && !disabled) {
                  onStartTyping?.()
                } else {
                  onStopTyping?.()
                }
              }}
              onKeyPress={handleKeyPress}
              onBlur={() => onStopTyping?.()}
              placeholder={
                messageInput.linkedWorkout
                  ? `Add ${messageInput.linkType} about ${messageInput.linkedWorkout.planned_type || 'workout'}...`
                  : 'Type your message...'
              }
              minRows={2}
              maxRows={5}
              disabled={disabled}
              classNames={{
                input: 'text-base sm:text-small leading-relaxed text-foreground',
                inputWrapper: 'bg-default-100 dark:bg-default-50 min-h-[60px] focus-within:ring-2 focus-within:ring-primary/20',
              }}
            />
          </div>

          <div className="flex gap-2">
            {/* Workout link button */}
            <Button
              size="md"
              variant="light"
              isIconOnly
              onPress={() => setMessageInput(prev => ({ ...prev, showWorkoutSelector: true }))}
              disabled={disabled}
              className="text-default-500 hover:text-primary-500 min-w-[44px] min-h-[44px]"
              aria-label="Link workout to message"
            >
              <Link2 className="h-5 w-5" />
            </Button>

            {/* Send button */}
            <Button
              type="submit"
              size="md"
              color="primary"
              isIconOnly
              disabled={!messageInput.message.trim() || disabled}
              className="min-w-[44px] min-h-[44px]"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>

      {/* Workout selector modal */}
      <WorkoutLinkSelector
        isOpen={messageInput.showWorkoutSelector}
        onClose={() => setMessageInput(prev => ({ ...prev, showWorkoutSelector: false }))}
        onSelectWorkout={handleSelectWorkout}
      />
    </>
  )
}
