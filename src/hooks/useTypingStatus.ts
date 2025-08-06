'use client'

import { useAtom } from 'jotai'

import { useCallback, useEffect, useRef } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { typingStatusAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useTypingStatus')

export function useTypingStatus(recipientId: string) {
  const { data: session } = useSession()
  const [typingStatuses, setTypingStatuses] = useAtom(typingStatusAtom)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sendTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get typing status for this specific conversation
  const conversationStatus = typingStatuses[recipientId] || {
    isTyping: false,
    isRecipientTyping: false,
    lastTypingUpdate: 0,
  }

  const { isTyping, isRecipientTyping } = conversationStatus

  // Send typing status to server
  const sendTypingStatus = useCallback(
    async (typing: boolean) => {
      if (!session?.user?.id || !recipientId) return

      logger.debug('Sending typing status:', { typing, recipientId })

      try {
        const response = await fetch('/api/typing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientId,
            isTyping: typing,
          }),
        })

        if (!response.ok) {
          logger.error('Failed to send typing status:', response.statusText)
        } else {
          logger.debug('Typing status sent successfully')
        }
      } catch (error) {
        logger.error('Error sending typing status:', error)
      }
    },
    [session?.user?.id, recipientId]
  )

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!isTyping) return

    setTypingStatuses(prev => ({
      ...prev,
      [recipientId]: {
        ...prev[recipientId],
        isTyping: false,
        lastTypingUpdate: Date.now(),
      },
    }))

    sendTypingStatus(false)

    if (sendTypingTimeoutRef.current) {
      clearTimeout(sendTypingTimeoutRef.current)
    }
  }, [isTyping, recipientId, setTypingStatuses, sendTypingStatus])

  // Start typing indicator
  const startTyping = useCallback(() => {
    logger.debug('Start typing called, current isTyping:', isTyping)
    if (isTyping) return

    setTypingStatuses(prev => ({
      ...prev,
      [recipientId]: {
        ...prev[recipientId],
        isTyping: true,
        lastTypingUpdate: Date.now(),
      },
    }))

    sendTypingStatus(true)

    // Clear any existing timeout
    if (sendTypingTimeoutRef.current) {
      clearTimeout(sendTypingTimeoutRef.current)
    }

    // Auto-stop typing after 3 seconds of inactivity
    sendTypingTimeoutRef.current = setTimeout(() => {
      if (sendTypingTimeoutRef.current) {
        stopTyping()
      }
    }, 3000)
  }, [isTyping, recipientId, setTypingStatuses, sendTypingStatus, stopTyping])

  // Optimized polling-based typing status check with exponential backoff and Page Visibility API
  useEffect(() => {
    if (!session?.user?.id || !recipientId) return

    let currentInterval = 3000 // Start at 3 seconds
    let pollTimeout: NodeJS.Timeout | null = null
    let consecutiveEmptyChecks = 0

    const checkTypingStatus = async () => {
      // Skip polling when tab is not visible
      if (document.hidden) {
        scheduleNextCheck()
        return
      }

      try {
        const response = await fetch(`/api/typing?recipientId=${recipientId}`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.isTyping !== isRecipientTyping) {
            // Reset interval on activity
            currentInterval = 3000
            consecutiveEmptyChecks = 0
            
            setTypingStatuses(prev => ({
              ...prev,
              [recipientId]: {
                ...prev[recipientId],
                isRecipientTyping: data.isTyping,
                lastTypingUpdate: Date.now(),
              },
            }))

            // Auto-clear after 5 seconds
            if (data.isTyping) {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
              }
              typingTimeoutRef.current = setTimeout(() => {
                if (typingTimeoutRef.current) {
                  setTypingStatuses(prev => ({
                    ...prev,
                    [recipientId]: {
                      ...prev[recipientId],
                      isRecipientTyping: false,
                      lastTypingUpdate: Date.now(),
                    },
                  }))
                }
              }, 5000)
            }
          } else {
            // No change detected - implement exponential backoff
            consecutiveEmptyChecks++
            if (consecutiveEmptyChecks >= 3) {
              currentInterval = Math.min(currentInterval * 1.5, 10000) // Max 10 seconds
            }
          }
        }
      } catch (error) {
        logger.error('Error checking typing status:', error)
        // On error, also implement backoff
        consecutiveEmptyChecks++
        currentInterval = Math.min(currentInterval * 1.5, 10000)
      }
      
      scheduleNextCheck()
    }

    const scheduleNextCheck = () => {
      pollTimeout = setTimeout(checkTypingStatus, currentInterval)
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Reset interval when tab becomes visible
        currentInterval = 3000
        consecutiveEmptyChecks = 0
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Start polling
    scheduleNextCheck()

    return () => {
      if (pollTimeout) {
        clearTimeout(pollTimeout)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session?.user?.id, recipientId, isRecipientTyping, setTypingStatuses])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (sendTypingTimeoutRef.current) {
        clearTimeout(sendTypingTimeoutRef.current)
      }
      // Stop typing when component unmounts
      if (isTyping) {
        sendTypingStatus(false)
      }
    }
  }, [isTyping, sendTypingStatus])

  return {
    isRecipientTyping,
    startTyping,
    stopTyping,
  }
}
