'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSupabaseRealtime } from './useSupabaseRealtime'

interface TypingStatus {
  user_id: string
  recipient_id: string
  is_typing: boolean
  last_updated: string
}

export function useTypingStatus(recipientId: string) {
  const { data: session } = useSession()
  const [isRecipientTyping, setIsRecipientTyping] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const sendTypingTimeoutRef = useRef<NodeJS.Timeout>()

  // Send typing status to server
  const sendTypingStatus = useCallback(async (typing: boolean) => {
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
          isTyping: typing
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
  }, [session?.user?.id, recipientId])

  // Start typing indicator
  const startTyping = useCallback(() => {
    console.log('⌨️ Start typing called, current isTyping:', isTyping)
    if (isTyping) return

    setIsTyping(true)
    sendTypingStatus(true)

    // Clear any existing timeout
    if (sendTypingTimeoutRef.current) {
      clearTimeout(sendTypingTimeoutRef.current)
    }

    // Auto-stop typing after 3 seconds of inactivity
    sendTypingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 3000)
  }, [isTyping, sendTypingStatus])

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!isTyping) return

    setIsTyping(false)
    sendTypingStatus(false)

    if (sendTypingTimeoutRef.current) {
      clearTimeout(sendTypingTimeoutRef.current)
    }
  }, [isTyping, sendTypingStatus])

  // Polling-based typing status check (fallback since real-time has issues)
  useEffect(() => {
    if (!session?.user?.id || !recipientId) return

    const checkTypingStatus = async () => {
      try {
        const response = await fetch(`/api/typing?recipientId=${recipientId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.isTyping !== isRecipientTyping) {
            setIsRecipientTyping(data.isTyping)
            
            // Auto-clear after 5 seconds
            if (data.isTyping) {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
              }
              typingTimeoutRef.current = setTimeout(() => {
                setIsRecipientTyping(false)
              }, 5000)
            }
          }
        }
      } catch (error) {
        console.error('Error checking typing status:', error)
      }
    }

    // Check typing status every 1 second
    const pollInterval = setInterval(checkTypingStatus, 1000)
    return () => clearInterval(pollInterval)
  }, [session?.user?.id, recipientId, isRecipientTyping])

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
    stopTyping
  }
}