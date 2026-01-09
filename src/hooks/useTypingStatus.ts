'use client'

import { useAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { api } from '@/lib/api-client'
import {
  sendTypingTimeoutRefsAtom,
  typingStatusAtom,
  typingTimeoutRefsAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useTypingStatus')

export function useTypingStatus(recipientId: string) {
  const { data: session } = useSession()
  const [typingStatuses, setTypingStatuses] = useAtom(typingStatusAtom)
  const [typingTimeoutRefs, setTypingTimeoutRefs] = useAtom(typingTimeoutRefsAtom)
  const [sendTypingTimeoutRefs, setSendTypingTimeoutRefs] = useAtom(sendTypingTimeoutRefsAtom)

  // Helper functions to manage timeouts in atoms
  const getTypingTimeout = useCallback(
    (id: string) => typingTimeoutRefs[id] || null,
    [typingTimeoutRefs]
  )
  const setTypingTimeout = useCallback(
    (id: string, timeout: NodeJS.Timeout | null) => {
      setTypingTimeoutRefs(prev => ({ ...prev, [id]: timeout }))
    },
    [setTypingTimeoutRefs]
  )

  const getSendTypingTimeout = useCallback(
    (id: string) => sendTypingTimeoutRefs[id] || null,
    [sendTypingTimeoutRefs]
  )
  const setSendTypingTimeout = useCallback(
    (id: string, timeout: NodeJS.Timeout | null) => {
      setSendTypingTimeoutRefs(prev => ({ ...prev, [id]: timeout }))
    },
    [setSendTypingTimeoutRefs]
  )

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
        await api.post(
          '/api/typing',
          { recipientId, isTyping: typing },
          {
            suppressGlobalToast: true,
          }
        )
        logger.debug('Typing status sent successfully')
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

    const currentTimeout = getSendTypingTimeout(recipientId)
    if (currentTimeout) {
      clearTimeout(currentTimeout)
      setSendTypingTimeout(recipientId, null)
    }
  }, [
    isTyping,
    recipientId,
    setTypingStatuses,
    sendTypingStatus,
    getSendTypingTimeout,
    setSendTypingTimeout,
  ])

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
    const existingTimeout = getSendTypingTimeout(recipientId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Auto-stop typing after 3 seconds of inactivity
    const newTimeout = setTimeout(() => {
      const currentTimeoutCheck = getSendTypingTimeout(recipientId)
      if (currentTimeoutCheck) {
        stopTyping()
      }
    }, 3000)
    setSendTypingTimeout(recipientId, newTimeout)
  }, [
    isTyping,
    recipientId,
    setTypingStatuses,
    sendTypingStatus,
    stopTyping,
    getSendTypingTimeout,
    setSendTypingTimeout,
  ])

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
        const response = await api.get<{ isTyping: boolean }>(
          `/api/typing?recipientId=${recipientId}`,
          {
            suppressGlobalToast: true,
          }
        )
        const data = response.data

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
            const existingTypingTimeout = getTypingTimeout(recipientId)
            if (existingTypingTimeout) {
              clearTimeout(existingTypingTimeout)
            }
            const newTypingTimeout = setTimeout(() => {
              const currentTypingTimeout = getTypingTimeout(recipientId)
              if (currentTypingTimeout) {
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
            setTypingTimeout(recipientId, newTypingTimeout)
          }
        } else {
          // No change detected - implement exponential backoff
          consecutiveEmptyChecks++
          if (consecutiveEmptyChecks >= 3) {
            currentInterval = Math.min(currentInterval * 1.5, 10000) // Max 10 seconds
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
  }, [
    session?.user?.id,
    recipientId,
    isRecipientTyping,
    setTypingStatuses,
    getTypingTimeout,
    setTypingTimeout,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const typingTimeout = getTypingTimeout(recipientId)
      const sendTimeout = getSendTypingTimeout(recipientId)

      if (typingTimeout) {
        clearTimeout(typingTimeout)
        setTypingTimeout(recipientId, null)
      }
      if (sendTimeout) {
        clearTimeout(sendTimeout)
        setSendTypingTimeout(recipientId, null)
      }
      // Stop typing when component unmounts
      if (isTyping) {
        sendTypingStatus(false)
      }
    }
  }, [
    isTyping,
    sendTypingStatus,
    recipientId,
    getTypingTimeout,
    getSendTypingTimeout,
    setTypingTimeout,
    setSendTypingTimeout,
  ])

  return {
    isRecipientTyping,
    startTyping,
    stopTyping,
  }
}
