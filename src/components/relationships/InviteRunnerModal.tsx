'use client'

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  Textarea,
} from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Mail, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { useCallback, useState } from 'react'

import {
  createInvitationAtom,
  inviteFormAtom,
  isCreatingInvitationAtom,
  isInviteModalOpenAtom,
} from '@/lib/atoms/invitations'
import { createLogger } from '@/lib/logger'

/** Email validation schema - matches server-side Zod validation */
const emailSchema = z.string().email('Please enter a valid email address')

const logger = createLogger('InviteRunnerModal')

/**
 * Modal for inviting runners or coaches via email
 */
export function InviteRunnerModal() {
  const [isOpen, setIsOpen] = useAtom(isInviteModalOpenAtom)
  const [form, setForm] = useAtom(inviteFormAtom)
  const isCreating = useAtomValue(isCreatingInvitationAtom)
  const createInvitation = useSetAtom(createInvitationAtom)

  const [emailError, setEmailError] = useState<string | null>(null)

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, email: e.target.value }))
      setEmailError(null)
    },
    [setForm]
  )

  const handleRoleChange = useCallback(
    (value: string) => {
      setForm(prev => ({ ...prev, role: value as 'runner' | 'coach' }))
    },
    [setForm]
  )

  // Note: HeroUI Textarea uses HTMLInputElement in its onChange type signature
  const handleMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, message: e.target.value }))
    },
    [setForm]
  )

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setEmailError(null)
    setForm({
      email: '',
      role: 'runner',
      message: '',
      expirationDays: 14,
    })
  }, [setIsOpen, setForm])

  /**
   * Validates email using Zod schema to match server-side validation
   * @param email - Email address to validate
   * @returns True if valid, false otherwise
   */
  const validateEmail = (email: string): boolean => {
    const result = emailSchema.safeParse(email)
    return result.success
  }

  const handleSubmit = useCallback(async () => {
    // Validate email
    if (!form.email.trim()) {
      setEmailError('Email is required')
      return
    }

    if (!validateEmail(form.email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    try {
      const result = await createInvitation({
        email: form.email.trim().toLowerCase(),
        role: form.role,
        message: form.message?.trim() || undefined,
        expirationDays: 14,
      })

      if (result?.success) {
        toast.success(
          result.emailSent
            ? 'Invitation sent successfully!'
            : 'Invitation created but email could not be sent. You can resend it later.'
        )
        handleClose()
      }
    } catch (error) {
      logger.error('Error creating invitation:', error)

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('ALREADY_INVITED')) {
          setEmailError('An invitation already exists for this email')
        } else if (error.message.includes('SELF_INVITATION')) {
          setEmailError('You cannot invite yourself')
        } else {
          toast.error(error.message || 'Failed to send invitation')
        }
      } else {
        toast.error('Failed to send invitation')
      }
    }
  }, [form, createInvitation, handleClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      classNames={{
        backdrop: 'bg-black/50 backdrop-blur-sm',
        base: 'border border-default-200',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 border-b border-default-200 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
            <UserPlus className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Invite to UltraCoach</h2>
            <p className="text-sm text-default-500">Send an invitation via email</p>
          </div>
        </ModalHeader>

        <ModalBody className="py-6 space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Input
              label="Email Address"
              placeholder="Enter their email address"
              type="email"
              value={form.email}
              onChange={handleEmailChange}
              isInvalid={!!emailError}
              errorMessage={emailError}
              startContent={<Mail className="h-4 w-4 text-default-400" />}
              variant="bordered"
              isRequired
              autoFocus
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <RadioGroup
              label="Invite as"
              value={form.role}
              onValueChange={handleRoleChange}
              orientation="horizontal"
              classNames={{
                wrapper: 'gap-4',
              }}
            >
              <Radio
                value="runner"
                description="They will be added as your runner"
                classNames={{
                  base: 'flex-1 m-0 border-2 border-default-200 rounded-lg p-4 hover:bg-default-100 data-[selected=true]:border-secondary',
                  label: 'font-medium',
                }}
              >
                Runner
              </Radio>
              <Radio
                value="coach"
                description="They will join as a fellow coach"
                classNames={{
                  base: 'flex-1 m-0 border-2 border-default-200 rounded-lg p-4 hover:bg-default-100 data-[selected=true]:border-secondary',
                  label: 'font-medium',
                }}
              >
                Coach
              </Radio>
            </RadioGroup>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Textarea
              label="Personal Message (optional)"
              placeholder="Add a personal message to your invitation..."
              value={form.message || ''}
              onChange={handleMessageChange}
              variant="bordered"
              maxLength={500}
              description={`${form.message?.length || 0}/500 characters`}
              minRows={3}
            />
          </div>

          {/* Info Card */}
          <div className="bg-default-50 rounded-lg p-4 text-sm text-default-600">
            <p className="font-medium text-foreground mb-2">What happens next?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>They&apos;ll receive an email with your invitation</li>
              <li>
                {form.role === 'runner'
                  ? 'Once they accept, they will be automatically connected to you as their coach'
                  : 'Once they accept, they can start using UltraCoach as a coach'}
              </li>
              <li>The invitation expires in 14 days</li>
            </ul>
          </div>
        </ModalBody>

        <ModalFooter className="border-t border-default-200 pt-4">
          <Button variant="flat" onPress={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            color="secondary"
            onPress={handleSubmit}
            isLoading={isCreating}
            disabled={isCreating || !form.email.trim()}
          >
            Send Invitation
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
