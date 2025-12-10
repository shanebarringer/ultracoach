'use client'

import { Button } from '@heroui/react'
import { MessageCircleIcon } from 'lucide-react'

import { useState } from 'react'

import FeedbackModal from './FeedbackModal'

interface FeedbackButtonProps {
  variant?: 'floating' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  defaultType?: 'bug_report' | 'feature_request' | 'general_feedback' | 'complaint' | 'compliment'
}

export default function FeedbackButton({
  variant = 'floating',
  size = 'md',
  defaultType,
}: FeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const baseClasses =
    variant === 'floating' ? 'fixed bottom-4 right-4 z-50 shadow-lg hidden sm:flex' : ''

  return (
    <>
      <Button
        color="primary"
        variant={variant === 'floating' ? 'solid' : 'flat'}
        size={size}
        onPress={() => setIsModalOpen(true)}
        startContent={<MessageCircleIcon className="w-4 h-4" />}
        className={baseClasses}
      >
        Feedback
      </Button>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultType={defaultType}
      />
    </>
  )
}
