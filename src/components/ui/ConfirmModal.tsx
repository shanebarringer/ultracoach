'use client'

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react'

import { useId } from 'react'
import type { ReactNode } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  confirmColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const titleId = useId()
  const descId = useId()

  const handleConfirm = async () => {
    if (isLoading) return
    try {
      await onConfirm()
      onClose()
    } catch {
      // Error handling is done by the calling component
      // Don't close modal on error so user can retry
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isDismissable={!isLoading}
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 id={titleId} className="text-lg font-semibold">
            {title}
          </h3>
        </ModalHeader>
        <ModalBody>
          {typeof message === 'string' ? (
            <p id={descId} className="text-foreground/70">
              {message}
            </p>
          ) : (
            <div id={descId}>{message}</div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            color={confirmColor}
            onPress={handleConfirm}
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
