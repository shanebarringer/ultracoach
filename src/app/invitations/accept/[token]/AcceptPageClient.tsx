'use client'

import { Button, Card, CardBody, CardHeader, Divider, Spinner } from '@heroui/react'
import { CheckCircle, MountainSnow, UserPlus, XCircle } from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'
import { formatDateConsistent } from '@/lib/utils/date'
import type {
  AcceptInvitationResponse,
  InvitationDetails,
  ValidateInvitationResponse,
} from '@/types/invitations'

const logger = createLogger('AcceptPageClient')

/** Delay before redirecting to dashboard after successful acceptance */
const REDIRECT_DELAY_MS = 2000

interface AcceptPageClientProps {
  token: string
}

type PageState = 'loading' | 'valid' | 'invalid' | 'accepting' | 'accepted' | 'error'

export default function AcceptPageClient({ token }: AcceptPageClientProps) {
  const router = useRouter()

  const [state, setState] = useState<PageState>('loading')
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [existingUser, setExistingUser] = useState(false)

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        setIsLoggedIn(!!session?.data?.user)
      } catch {
        setIsLoggedIn(false)
      }
    }
    checkAuth()
  }, [])

  // Validate the invitation token
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/invitations/accept/${token}`, {
          credentials: 'same-origin',
        })
        const data: ValidateInvitationResponse = await response.json()

        if (data.valid) {
          setInvitation(data.invitation)
          setExistingUser(data.existingUser)
          setState('valid')
        } else {
          setErrorMessage(data.message)
          setState('invalid')
        }
      } catch (error) {
        logger.error('Error validating invitation:', error)
        setErrorMessage('Failed to validate invitation. Please try again.')
        setState('error')
      }
    }

    if (token) {
      validateToken()
    }
  }, [token])

  const handleAccept = useCallback(async () => {
    if (!isLoggedIn) {
      // Redirect to signup with invitation context
      router.push(`/auth/signup?invitation=${token}`)
      return
    }

    setState('accepting')

    try {
      const response = await fetch(`/api/invitations/accept/${token}`, {
        method: 'POST',
        credentials: 'same-origin',
      })

      const data: AcceptInvitationResponse = await response.json()

      if (data.success) {
        setState('accepted')
        toast.success('Invitation accepted! You are now connected.')

        // Redirect to the appropriate dashboard
        setTimeout(() => {
          router.push(data.redirectUrl || '/dashboard')
        }, REDIRECT_DELAY_MS)
      } else {
        setErrorMessage(data.message || 'Failed to accept invitation')
        setState('error')
      }
    } catch (error) {
      logger.error('Error accepting invitation:', error)
      setErrorMessage('Failed to accept invitation. Please try again.')
      setState('error')
    }
  }, [isLoggedIn, token, router])

  /** Format date using date-fns for consistent display */
  const formatDate = (dateString: string) => {
    return formatDateConsistent(dateString, 'MMMM d, yyyy')
  }

  // Loading state
  if (state === 'loading' || isLoggedIn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-12">
            <Spinner size="lg" color="secondary" />
            <p className="mt-4 text-default-600">Validating your invitation...</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Invalid or error state
  if (state === 'invalid' || state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-md w-full border-t-4 border-t-danger">
          <CardBody className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-danger/10 p-4">
                <XCircle className="h-12 w-12 text-danger" aria-hidden="true" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Invalid Invitation</h2>
            <p className="text-default-600 mb-6">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <Button as={Link} href="/auth/signin" color="primary">
                Sign In
              </Button>
              <Button as={Link} href="/" variant="flat">
                Go to Homepage
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Accepted state
  if (state === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-md w-full border-t-4 border-t-success">
          <CardBody className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-success/10 p-4">
                <CheckCircle className="h-12 w-12 text-success" aria-hidden="true" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to UltraCoach!</h2>
            <p className="text-default-600 mb-4">
              You&apos;re now connected with{' '}
              <span className="font-medium">
                {invitation?.inviterName || invitation?.inviterEmail}
              </span>
            </p>
            <p className="text-sm text-default-500">Redirecting to your dashboard...</p>
            <Spinner size="sm" color="success" className="mt-4" />
          </CardBody>
        </Card>
      </div>
    )
  }

  // Valid invitation - show details and accept button
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="max-w-md w-full border-t-4 border-t-secondary shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center space-y-3 w-full">
            <MountainSnow className="h-12 w-12 text-secondary" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">You&apos;ve Been Invited!</h1>
              <p className="text-default-600 mt-1">Join the UltraCoach expedition</p>
            </div>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="pt-6 space-y-6">
          {/* Invitation Details */}
          <div className="bg-default-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-secondary/10 p-2">
                <UserPlus className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-default-500">Invited by</p>
                <p className="font-medium text-foreground">
                  {invitation?.inviterName || invitation?.inviterEmail}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-default-500">You&apos;re invited as a</p>
              <p className="font-medium text-foreground capitalize">{invitation?.invitedRole}</p>
            </div>

            {invitation?.personalMessage && (
              <div>
                <p className="text-sm text-default-500">Personal message</p>
                <p className="text-foreground italic">&quot;{invitation.personalMessage}&quot;</p>
              </div>
            )}

            {invitation?.expiresAt && (
              <div className="text-xs text-default-400">
                Expires {formatDate(invitation.expiresAt)}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isLoggedIn ? (
            <div className="space-y-3">
              <Button
                color="secondary"
                size="lg"
                className="w-full font-semibold"
                onPress={handleAccept}
                isLoading={state === 'accepting'}
              >
                Accept Invitation
              </Button>
              <p className="text-xs text-center text-default-500">
                By accepting, you&apos;ll be connected with{' '}
                {invitation?.inviterName || 'this coach'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-default-600 mb-4">
                  {existingUser
                    ? 'Sign in to accept this invitation'
                    : 'Create an account to get started'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {existingUser ? (
                  <>
                    <Button
                      as={Link}
                      href={`/auth/signin?callbackUrl=${encodeURIComponent(`/invitations/accept/${token}`)}`}
                      color="secondary"
                      size="lg"
                      className="w-full font-semibold"
                    >
                      Sign In to Accept
                    </Button>
                    <p className="text-xs text-center text-default-500">
                      We found an account with this email
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      as={Link}
                      href={`/auth/signup?invitation=${token}`}
                      color="secondary"
                      size="lg"
                      className="w-full font-semibold"
                    >
                      Create Account & Accept
                    </Button>
                    <Button
                      as={Link}
                      href={`/auth/signin?callbackUrl=${encodeURIComponent(`/invitations/accept/${token}`)}`}
                      variant="flat"
                      size="lg"
                      className="w-full"
                    >
                      Already have an account? Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Decline Link */}
          <div className="text-center">
            <Link
              href={`/invitations/decline/${token}`}
              className="text-sm text-default-400 hover:text-default-600 transition-colors"
            >
              No thanks, decline this invitation
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
