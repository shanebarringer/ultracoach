'use client'

import { useState } from 'react'

interface MessageInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
  onStartTyping?: () => void
  onStopTyping?: () => void
}

import { Textarea, Button } from '@heroui/react'

interface MessageInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
  onStartTyping?: () => void
  onStopTyping?: () => void
}

export default function MessageInput({ onSendMessage, disabled = false, onStartTyping, onStopTyping }: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      onStopTyping?.()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4 border-t border-gray-200">
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
        placeholder="Type your message..."
        className="flex-1"
        minRows={1}
        maxRows={5}
        disabled={disabled}
      />
      <Button
        type="submit"
        isIconOnly
        color="primary"
        disabled={!message.trim() || disabled}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </Button>
    </form>
  )
}