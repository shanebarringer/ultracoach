'use client'

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react'

import { createLogger } from '@/lib/logger'

const logger = createLogger('ConfirmModal')

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
  onError?: (error: Error) => void
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
  onError,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      const asError =
        error instanceof Error ? error : Object.assign(new Error('Unknown error'), { cause: error })
      if (onError) {
        onError(asError)
      } else {
        logger.error('ConfirmModal onConfirm error', {
          error: {
            message: asError.message,
            stack: asError.stack,
            // include cause when present for debugging without dumping full objects
            cause:
              (asError as Error & { cause?: unknown }).cause !== undefined
                ? String((asError as Error & { cause?: unknown }).cause)
                : undefined,
          },
        })
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isDismissable={!isLoading} hideCloseButton={isLoading}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">{title}</h3>
        </ModalHeader>
        <ModalBody>
          <p className="text-foreground/70">{message}</p>
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
