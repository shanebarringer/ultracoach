'use client'

import { Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { Filter, MessageCirclePlus, X } from 'lucide-react'

import { useCallback, useEffect, useRef, useState } from 'react'

import dynamic from 'next/dynamic'

import { ChatWindowSkeleton } from '@/components/ui/LoadingSkeletons'
import { useSession } from '@/hooks/useBetterSession'
import { useCommunicationSettings } from '@/hooks/useCommunicationSettings'
import { useMessages } from '@/hooks/useMessages'
import { useTypingStatus } from '@/hooks/useTypingStatus'
import { useWorkouts } from '@/hooks/useWorkouts'
import { chatUiStateAtom, offlineMessageQueueAtom, uiStateAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { User } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { formatDateConsistent } from '@/lib/utils/date'
import { getDisplayNameFromEmail } from '@/lib/utils/user-names'

import ConnectionStatus from './ConnectionStatus'
import MessageInput from './MessageInput'
import NewMessageModal from './NewMessageModal'
import PerformantMessageList from './PerformantMessageList'
import TypingIndicator from './TypingIndicator'

// Enhanced dynamic import with graceful error handling and cleanup safety
const WorkoutLogModal = dynamic(() => import('@/components/workouts/WorkoutLogModal'), {
  loading: () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
    </div>
  ),
  ssr: false,
})

const logger = createLogger('ChatWindow')

interface ChatWindowProps {
  recipientId: string
  recipient: User
}

export default function ChatWindow({ recipientId, recipient }: ChatWindowProps) {
  const { data: session } = useSession()
  const [chatUiState, setChatUiState] = useAtom(chatUiStateAtom)
  const uiState = useAtomValue(uiStateAtom)
  const [offlineQueue, setOfflineQueue] = useAtom(offlineMessageQueueAtom)
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false)

  // Use Jotai hooks for state management
  const { messages, loading, sendMessage } = useMessages(recipientId)
  const { isRecipientTyping, startTyping, stopTyping } = useTypingStatus(recipientId)
  const { workouts } = useWorkouts()
  const { isInQuietHours } = useCommunicationSettings()

  // Prevent race conditions in modal and async operations
  const operationInProgress = useRef(false)

  // Get display name with proper fallback
  const displayName = recipient.full_name || getDisplayNameFromEmail(recipient.email)

  const handleWorkoutLogSuccess = useCallback(async () => {
    // Prevent race conditions
    if (operationInProgress.current) return
    operationInProgress.current = true

    try {
      setChatUiState(prev => ({
        ...prev,
        showWorkoutModal: false,
        selectedChatWorkout: null,
      }))
    } finally {
      operationInProgress.current = false
    }
  }, [setChatUiState])

  // Component cleanup effect to handle graceful unmounting during async operations
  useEffect(() => {
    return () => {
      // Clean up any pending operations when component unmounts
      // This prevents state updates on unmounted components
      logger.debug('ChatWindow unmounting, cleaning up async operations')

      // Stop any typing indicators
      try {
        stopTyping()
      } catch (error) {
        logger.warn('Error stopping typing indicator during cleanup:', error)
      }

      // Clear any modal states to prevent memory leaks
      setChatUiState(prev => ({
        ...prev,
        sending: false,
        showWorkoutModal: false,
        selectedChatWorkout: null,
      }))
    }
  }, [setChatUiState, stopTyping])

  const handleSendMessage = useCallback(
    async (content: string, workoutId?: string, contextType?: string) => {
      // Enhanced race condition protection
      if (!session?.user?.id || chatUiState.sending || operationInProgress.current) return

      // Check if sender is in quiet hours (courtesy notification)
      const quietHoursResult = isInQuietHours()
      if (quietHoursResult.inQuietHours) {
        logger.info('Sender is in quiet hours but choosing to send message', quietHoursResult)
        // Note: We still allow sending, just inform the user
        toast.info(
          'Quiet Hours Active',
          'Your quiet hours are currently active. This message will be sent, but you may not receive immediate replies.'
        )
      }

      operationInProgress.current = true
      setChatUiState(prev => ({ ...prev, sending: true }))

      // Check if offline
      if (uiState.connectionStatus === 'disconnected') {
        // Queue message for offline sending
        const offlineMessage = {
          id: crypto.randomUUID(),
          recipientId,
          content,
          workoutId,
          contextType,
          timestamp: Date.now(),
          retryCount: 0,
        }

        setOfflineQueue(prev => [...prev, offlineMessage])
        toast.warning('Message Queued', 'Message will be sent when connection is restored.')
        setChatUiState(prev => ({ ...prev, sending: false }))
        operationInProgress.current = false
        return
      }

      try {
        const success = await sendMessage(content, workoutId)
        if (!success) {
          toast.error('Message Failed', 'Unable to send message. Please try again.')
        }
      } catch (error) {
        logger.error('Error sending message:', error)
        toast.error('Message Failed', 'Unable to send message. Please try again.')
      } finally {
        setChatUiState(prev => ({ ...prev, sending: false }))
        operationInProgress.current = false
      }
    },
    [
      session?.user?.id,
      chatUiState.sending,
      uiState.connectionStatus,
      recipientId,
      sendMessage,
      setChatUiState,
      setOfflineQueue,
      isInQuietHours,
    ]
  )

  // Process offline message queue when connection is restored
  useEffect(() => {
    if (uiState.connectionStatus === 'connected' && offlineQueue.length > 0) {
      const processQueue = async () => {
        const messagesToSend = offlineQueue.filter(msg => msg.retryCount < 3)

        for (const queuedMessage of messagesToSend) {
          try {
            logger.info('Sending queued message:', { id: queuedMessage.id })
            const success = await sendMessage(queuedMessage.content, queuedMessage.workoutId)

            if (success) {
              // Remove from queue
              setOfflineQueue(prev => prev.filter(msg => msg.id !== queuedMessage.id))
              toast.success('Message Sent', 'Queued message delivered successfully.')
            } else {
              // Increment retry count
              setOfflineQueue(prev =>
                prev.map(msg =>
                  msg.id === queuedMessage.id ? { ...msg, retryCount: msg.retryCount + 1 } : msg
                )
              )
            }
          } catch (error) {
            logger.error('Failed to send queued message:', error)
            // Increment retry count
            setOfflineQueue(prev =>
              prev.map(msg =>
                msg.id === queuedMessage.id ? { ...msg, retryCount: msg.retryCount + 1 } : msg
              )
            )
          }
        }

        // Remove messages that have exceeded retry limit
        setOfflineQueue(prev => prev.filter(msg => msg.retryCount < 3))
      }

      processQueue()
    }
  }, [uiState.connectionStatus, offlineQueue, sendMessage, setOfflineQueue])

  // Note: Message filtering is now handled by the PerformantMessageList component

  // Get workout for filter display
  const filterWorkout = chatUiState.filterWorkoutId
    ? workouts.find((w: { id: string | null }) => w.id === chatUiState.filterWorkoutId)
    : null

  // Get workouts that have messages for filtering options
  const workoutsWithMessages = workouts.filter(workout =>
    messages.some(msg => msg.workout_id === workout.id)
  )

  if (loading) {
    return <ChatWindowSkeleton />
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative" data-testid="chat-window">
      <ConnectionStatus />
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-content1">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{displayName}</h1>
            <p className="text-sm text-foreground-600 capitalize">{recipient.userType}</p>
          </div>
        </div>

        {/* Action Buttons & Filter Controls */}
        <div className="flex items-center gap-2">
          {/* New Message Button */}
          <Button
            variant="flat"
            color="primary"
            size="sm"
            startContent={<MessageCirclePlus className="h-4 w-4" />}
            onPress={() => setIsNewMessageModalOpen(true)}
            data-testid="new-message-button"
          >
            <span className="hidden sm:inline">New Message</span>
          </Button>
          {/* Active Filter Display */}
          {filterWorkout && (
            <Chip
              color="primary"
              variant="flat"
              onClose={() => setChatUiState(prev => ({ ...prev, filterWorkoutId: null }))}
              size="sm"
            >
              {filterWorkout.planned_type || 'Workout'} - {formatDateConsistent(filterWorkout.date)}
            </Chip>
          )}

          {/* Filter Dropdown */}
          {workoutsWithMessages.length > 0 && (
            <Dropdown>
              <DropdownTrigger>
                <Button variant="light" size="sm" isIconOnly className="text-foreground-600">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Filter messages by workout"
                onAction={key => {
                  if (key === 'clear') {
                    setChatUiState(prev => ({ ...prev, filterWorkoutId: null }))
                  } else {
                    setChatUiState(prev => ({ ...prev, filterWorkoutId: key as string }))
                  }
                }}
              >
                {[
                  ...(chatUiState.filterWorkoutId
                    ? [
                        <DropdownItem key="clear" startContent={<X className="h-4 w-4" />}>
                          Show All Messages
                        </DropdownItem>,
                      ]
                    : []),
                  ...workoutsWithMessages.map(
                    (workout: { id: string; planned_type?: string; date?: string }) => (
                      <DropdownItem key={workout.id}>
                        {workout.planned_type || 'Workout'} - {formatDateConsistent(workout.date)}
                      </DropdownItem>
                    )
                  ),
                ]}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Use performant message list for better performance with splitAtom */}
        <PerformantMessageList
          recipientId={recipientId}
          currentUserId={(session?.user?.id as string) || ''}
        />

        {/* Typing Indicator */}
        <div className="px-4">
          <TypingIndicator isTyping={isRecipientTyping} userName={displayName} />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onStartTyping={startTyping}
        onStopTyping={stopTyping}
        disabled={chatUiState.sending || !session?.user?.id}
      />

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
      />

      {/* Workout Log Modal */}
      {chatUiState.selectedChatWorkout && (
        <WorkoutLogModal
          isOpen={chatUiState.showWorkoutModal}
          onClose={() =>
            setChatUiState(prev => ({
              ...prev,
              showWorkoutModal: false,
              selectedChatWorkout: null,
            }))
          }
          onSuccess={handleWorkoutLogSuccess}
          workout={chatUiState.selectedChatWorkout}
          defaultToComplete={false}
        />
      )}
    </div>
  )
}
