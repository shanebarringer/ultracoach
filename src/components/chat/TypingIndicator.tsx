'use client'

import { useEffect, useState } from 'react'

interface TypingIndicatorProps {
  isTyping: boolean
  userName: string
}

export default function TypingIndicator({ isTyping, userName }: TypingIndicatorProps) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (!isTyping) return

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.'
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isTyping])

  if (!isTyping) return null

  return (
    <div className="flex items-center justify-start mb-2 animate-in fade-in duration-200">
      <div className="max-w-xs lg:max-w-md xl:max-w-lg">
        <div className="px-4 py-2 rounded-lg bg-content2 border border-divider shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
            <span className="text-xs text-foreground-600 font-medium">
              {userName} is typing{dots}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
