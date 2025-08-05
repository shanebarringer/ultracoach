'use client'

import { useAtom } from 'jotai'

import { useCallback, useEffect, useRef } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { typingStatusAtom } from '@/lib/atoms'

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

      console.log('⌨️ Sending typing status:', { typing, recipientId })

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
          console.error('❌ Failed to send typing status:', response.statusText)
        } else {
          console.log('✅ Typing status sent successfully')
        }
      } catch (error) {
        console.error('❌ Error sending typing status:', error)
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
    console.log('⌨️ Start typing called, current isTyping:', isTyping)
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
      stopTyping()
    }, 3000)
  }, [isTyping, recipientId, setTypingStatuses, sendTypingStatus, stopTyping])

  // Polling-based typing status check (fallback since real-time has issues)
  useEffect(() => {
    if (!session?.user?.id || !recipientId) return

    const checkTypingStatus = async () => {
      try {
        const response = await fetch(`/api/typing?recipientId=${recipientId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.isTyping !== isRecipientTyping) {
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
                setTypingStatuses(prev => ({
                  ...prev,
                  [recipientId]: {
                    ...prev[recipientId],
                    isRecipientTyping: false,
                    lastTypingUpdate: Date.now(),
                  },
                }))
              }, 5000)
            }
          }
        }
      } catch (error) {
        console.error('Error checking typing status:', error)
      }
    }

    // Check typing status every 3 seconds (reduced from 1 second for better performance)
    const pollInterval = setInterval(checkTypingStatus, 3000)
    return () => clearInterval(pollInterval)
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
