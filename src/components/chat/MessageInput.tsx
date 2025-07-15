'use client'

import { useState } from 'react'
import { Textarea, Button } from '@heroui/react'
import { Link2, Send } from 'lucide-react'
import WorkoutLinkSelector from './WorkoutLinkSelector'
import WorkoutContext from './WorkoutContext'
import { Workout } from '@/lib/supabase'

interface MessageInputProps {
  onSendMessage: (content: string, workoutId?: string, contextType?: string) => void
  disabled?: boolean
  onStartTyping?: () => void
  onStopTyping?: () => void
  recipientId: string
}

export default function MessageInput({ onSendMessage, disabled = false, onStartTyping, onStopTyping, recipientId }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [linkedWorkout, setLinkedWorkout] = useState<Workout | null>(null)
  const [linkType, setLinkType] = useState<string>('reference')
  const [showWorkoutSelector, setShowWorkoutSelector] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      const contextType = linkedWorkout ? 'workout_' + linkType : 'general'
      onSendMessage(message.trim(), linkedWorkout?.id, contextType)
      setMessage('')
      setLinkedWorkout(null)
      setLinkType('reference')
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
    setLinkedWorkout(workout)
    setLinkType(selectedLinkType)
    setShowWorkoutSelector(false)
  }

  const handleRemoveWorkout = () => {
    setLinkedWorkout(null)
    setLinkType('reference')
  }

  return (
    <>
      <div className="p-4 border-t border-default-200 dark:border-default-700 space-y-3">
        {/* Workout context display */}
        {linkedWorkout && (
          <div className="relative">
            <WorkoutContext
              workout={linkedWorkout}
              linkType={linkType}
            />
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={handleRemoveWorkout}
              className="absolute top-2 right-2 text-default-400 hover:text-default-600"
            >
              ×
            </Button>
          </div>
        )}

        {/* Message input form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (e.target.value.trim() && !disabled) {
                  onStartTyping?.()
                } else {
                  onStopTyping?.()
                }
              }}
              onKeyPress={handleKeyPress}
              onBlur={() => onStopTyping?.()}
              placeholder={linkedWorkout 
                ? `Add ${linkType} about ${linkedWorkout.planned_type || 'workout'}...`
                : "Type your message..."
              }
              minRows={1}
              maxRows={5}
              disabled={disabled}
              classNames={{
                input: "text-small",
                inputWrapper: "bg-default-100 dark:bg-default-900"
              }}
            />
          </div>

          <div className="flex gap-1">
            {/* Workout link button */}
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={() => setShowWorkoutSelector(true)}
              disabled={disabled}
              className="text-default-500 hover:text-primary-500"
            >
              <Link2 className="h-4 w-4" />
            </Button>

            {/* Send button */}
            <Button
              type="submit"
              size="sm"
              color="primary"
              isIconOnly
              disabled={!message.trim() || disabled}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Workout selector modal */}
      <WorkoutLinkSelector
        isOpen={showWorkoutSelector}
        onClose={() => setShowWorkoutSelector(false)}
        onSelectWorkout={handleSelectWorkout}
        recipientId={recipientId}
      />
    </>
  )
}