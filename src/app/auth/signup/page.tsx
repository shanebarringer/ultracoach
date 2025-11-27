'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
} from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtom } from 'jotai'
import { Flag, Lock, Mail, MountainSnow, User, UserPlus } from 'lucide-react'

import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import { useBetterAuth } from '@/hooks/useBetterAuth'
import { signUpFormAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'
import { type SignUpForm, signUpSchema } from '@/types/forms'
import type { InvitationDetails, ValidateInvitationResponse } from '@/types/invitations'

const logger = createLogger('SignUp')

export default function SignUp() {
  const [formState, setFormState] = useAtom(signUpFormAtom)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp } = useBetterAuth()

  // Invitation context
  const invitationToken = searchParams.get('invitation')
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(!!invitationToken)
  const [invitationError, setInvitationError] = useState<string | null>(null)

  // Fetch invitation details if token is present
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!invitationToken) return

      try {
        const response = await fetch(`/api/invitations/accept/${invitationToken}`, {
          credentials: 'same-origin',
        })
        const data: ValidateInvitationResponse = await response.json()

        if (data.valid && data.invitation) {
          setInvitation(data.invitation)
        } else {
          setInvitationError(data.message || 'Invalid invitation')
        }
      } catch (error) {
        logger.error('Failed to load invitation details:', error)
        setInvitationError('Failed to load invitation details')
      } finally {
        setInvitationLoading(false)
      }
    }

    fetchInvitation()
  }, [invitationToken])

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setError,
    setValue,
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'runner',
    },
  })

  // Set form values from invitation when loaded
  useEffect(() => {
    if (invitation) {
      setValue('role', invitation.invitedRole)
    }
  }, [invitation, setValue])

  const onSubmit = async (data: SignUpForm) => {
    setFormState(prev => ({ ...prev, loading: true }))

    try {
      logger.info('Attempting sign up:', {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        hasInvitation: !!invitationToken,
      })

      const result = await signUp(data.email, data.password, data.fullName, data.role)

      if (!result.success) {
        logger.error('Sign up failed:', result.error)
        // Sanitize error message for security
        const sanitizedError =
          result.error?.toLowerCase().includes('email') &&
          result.error?.toLowerCase().includes('exists')
            ? 'An account with this email already exists'
            : 'Registration failed. Please try again.'
        setError('email', { message: sanitizedError })
      } else {
        logger.info('Sign up successful:', { userRole: data.role })
        setFormState(prev => ({ ...prev, loading: false }))

        // If there's an invitation, accept it automatically
        if (invitationToken) {
          try {
            logger.info('Accepting invitation after signup')
            const acceptResponse = await fetch(`/api/invitations/accept/${invitationToken}`, {
              method: 'POST',
              credentials: 'same-origin',
            })
            const acceptData = await acceptResponse.json()

            if (acceptData.success) {
              logger.info('Invitation accepted successfully')
              toast.success('Welcome! You have been connected successfully.')
              // Redirect to appropriate dashboard
              router.push(acceptData.redirectUrl || '/dashboard')
              return
            } else {
              logger.warn('Failed to accept invitation after signup:', acceptData.message)
              // Surface error to user but allow them to continue
              toast.warning(
                'Invitation Notice',
                acceptData.message ||
                  'Could not auto-accept invitation. You can accept it from your dashboard.'
              )
            }
          } catch (acceptError) {
            logger.error('Error accepting invitation after signup:', acceptError)
            // Surface error to user but allow them to continue
            toast.warning(
              'Invitation Notice',
              'Could not auto-accept invitation. You can accept it from your dashboard.'
            )
          }
        }

        // Determine dashboard URL based on role
        const dashboardUrl = data.role === 'coach' ? '/dashboard/coach' : '/dashboard/runner'

        // In development environment, skip onboarding and redirect directly to dashboard
        if (
          process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
          (typeof window !== 'undefined' && window.location.port === '3001')
        ) {
          logger.info(
            'Development environment detected, skipping onboarding and redirecting to dashboard'
          )
          // Use Next.js router for client-side navigation (best practice)
          router.push(dashboardUrl)
        } else {
          // Show onboarding flow after successful signup in production
          setShowOnboarding(true)
        }
      }
    } catch (error) {
      logger.error('Sign up exception:', error)
      // Sanitize error message for security - don't use the actual error
      setError('email', { message: 'Registration failed. Please try again.' })
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleOnboardingComplete = () => {
    logger.info('Onboarding completed, redirecting to dashboard')
    // Use Next.js router for navigation (best practice)
    const role = formState.userType || 'runner'
    const dashboardUrl = role === 'coach' ? '/dashboard/coach' : '/dashboard/runner'
    router.push(dashboardUrl)
  }

  const handleOnboardingClose = () => {
    // If user closes onboarding without completing, still redirect them
    logger.info('Onboarding closed, redirecting to dashboard')
    handleOnboardingComplete()
  }

  // Show loading state when fetching invitation
  if (invitationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-12">
            <Spinner size="lg" color="secondary" />
            <p className="mt-4 text-default-600">Loading invitation details...</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="border-t-4 border-t-secondary shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center space-y-3 w-full">
              <MountainSnow className="h-12 w-12 text-secondary" aria-hidden="true" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">🏔️ UltraCoach</h1>
                <p className="text-lg text-foreground-600 mt-1">
                  {invitation ? 'Accept Your Invitation' : 'Join the Expedition'}
                </p>
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="pt-6">
            {/* Invitation Banner */}
            {invitation && (
              <div className="mb-6 bg-secondary/10 rounded-lg p-4 border border-secondary/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-secondary/20 p-2 flex-shrink-0">
                    <UserPlus className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {invitation.inviterName || invitation.inviterEmail} invited you
                    </p>
                    <p className="text-xs text-default-500 mt-1">
                      You&apos;ll be connected as their {invitation.invitedRole} after signing up
                    </p>
                    {invitation.personalMessage && (
                      <p className="text-sm text-default-600 mt-2 italic">
                        &quot;{invitation.personalMessage}&quot;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Invitation Error */}
            {invitationError && (
              <div className="mb-6 bg-warning/10 rounded-lg p-4 border border-warning/20">
                <p className="text-sm text-warning-600">{invitationError}</p>
                <p className="text-xs text-default-500 mt-1">
                  You can still sign up, but the invitation may be expired or invalid.
                </p>
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      id="fullName"
                      type="text"
                      label="Full Name"
                      required
                      placeholder="Enter your expedition name"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      startContent={
                        <User className="w-4 h-4 text-foreground-400" aria-hidden="true" />
                      }
                      variant="bordered"
                      size="lg"
                      classNames={{
                        input: 'text-foreground',
                        label: 'text-foreground-600',
                      }}
                    />
                  )}
                />

                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      label="Email Address"
                      required
                      placeholder="Enter your base camp email"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      startContent={
                        <Mail className="w-4 h-4 text-foreground-400" aria-hidden="true" />
                      }
                      variant="bordered"
                      size="lg"
                      classNames={{
                        input: 'text-foreground',
                        label: 'text-foreground-600',
                      }}
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      label="Password"
                      required
                      placeholder="Create your summit key"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      startContent={
                        <Lock className="w-4 h-4 text-foreground-400" aria-hidden="true" />
                      }
                      variant="bordered"
                      size="lg"
                      classNames={{
                        input: 'text-foreground',
                        label: 'text-foreground-600',
                      }}
                    />
                  )}
                />

                <Controller
                  name="role"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Select
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={keys => {
                        // Only allow change if not from invitation
                        if (!invitation) {
                          const selectedRole = Array.from(keys).join('') as 'runner' | 'coach'
                          field.onChange(selectedRole)
                        }
                      }}
                      label="Choose your path"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      startContent={
                        <Flag className="w-4 h-4 text-foreground-400" aria-hidden="true" />
                      }
                      variant="bordered"
                      size="lg"
                      isDisabled={!!invitation}
                      description={
                        invitation
                          ? `Role set by invitation from ${invitation.inviterName || invitation.inviterEmail}`
                          : undefined
                      }
                      classNames={{
                        label: 'text-foreground-600',
                        value: 'text-foreground',
                      }}
                    >
                      <SelectItem key="runner" startContent="🏃" textValue="Trail Runner">
                        <span className="font-medium">Trail Runner</span>
                        <span className="text-sm text-foreground-500 block">
                          Conquer your personal peaks
                        </span>
                      </SelectItem>
                      <SelectItem key="coach" startContent="🏔️" textValue="Mountain Guide">
                        <span className="font-medium">Mountain Guide</span>
                        <span className="text-sm text-foreground-500 block">
                          Lead others to their summit
                        </span>
                      </SelectItem>
                    </Select>
                  )}
                />
              </div>

              <Button
                type="submit"
                color="secondary"
                size="lg"
                className="w-full font-semibold"
                isLoading={isSubmitting || formState.loading}
                startContent={
                  !(isSubmitting || formState.loading) ? (
                    <MountainSnow className="w-5 h-5" aria-hidden="true" />
                  ) : null
                }
              >
                {isSubmitting || formState.loading
                  ? 'Preparing your expedition...'
                  : 'Start Your Journey'}
              </Button>
            </form>

            <Divider className="my-6" />

            <div className="text-center">
              <p className="text-sm text-foreground-600">
                Already have a base camp?{' '}
                <Link
                  href="/auth/signin"
                  className="font-semibold text-primary hover:text-primary-600 transition-colors"
                >
                  Return to expedition
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Onboarding Flow */}
      <OnboardingFlow
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </div>
  )
}
