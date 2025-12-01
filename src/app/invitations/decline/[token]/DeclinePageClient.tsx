'use client'

import { Button, Card, CardBody, CardHeader, Divider, Textarea } from '@heroui/react'
import { CheckCircle, MountainSnow, XCircle } from 'lucide-react'

import { useCallback, useState } from 'react'

import Link from 'next/link'

import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('InvitationDeclinePageClient')

interface DeclinePageClientProps {
  token: string
}

type PageState = 'confirm' | 'declining' | 'declined' | 'error'

export default function DeclinePageClient({ token }: DeclinePageClientProps) {
  const [state, setState] = useState<PageState>('confirm')
  const [reason, setReason] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleDecline = useCallback(async () => {
    setState('declining')

    try {
      const response = await fetch(`/api/invitations/decline/${token}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })

      // Check for server errors first - provide friendlier message
      if (!response.ok && response.status >= 500) {
        setErrorMessage('Server error. Please try again later.')
        setState('error')
        return
      }

      // Handle other non-OK responses gracefully
      if (!response.ok) {
        let errorMsg = `Request failed with status ${response.status}`
        try {
          const errorData = await response.json()
          errorMsg = errorData.message || errorMsg
        } catch {
          // Response wasn't JSON, try text
          const errorText = await response.text().catch(() => '')
          if (errorText) errorMsg = errorText
        }
        setErrorMessage(errorMsg)
        setState('error')
        return
      }

      const data = await response.json()

      if (data.success) {
        setState('declined')
        toast.success('Invitation declined')
      } else {
        setErrorMessage(data.message || 'Failed to decline invitation')
        setState('error')
      }
    } catch (error) {
      logger.error('Error declining invitation:', error)
      setErrorMessage('Failed to decline invitation. Please try again.')
      setState('error')
    }
  }, [token, reason])

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-md w-full border-t-4 border-t-danger">
          <CardBody className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-danger/10 p-4">
                <XCircle className="h-12 w-12 text-danger" aria-hidden="true" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Something Went Wrong</h2>
            <p className="text-default-600 mb-6">{errorMessage}</p>
            <Button as={Link} href="/" color="primary">
              Go to Homepage
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Declined state
  if (state === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-md w-full border-t-4 border-t-default">
          <CardBody className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-default-100 p-4">
                <CheckCircle className="h-12 w-12 text-default-500" aria-hidden="true" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Invitation Declined</h2>
            <p className="text-default-600 mb-6">
              We&apos;ve let the sender know. Feel free to reach out if you change your mind.
            </p>
            <div className="flex flex-col gap-3">
              <Button as={Link} href="/" color="primary">
                Go to Homepage
              </Button>
              <Button as={Link} href="/auth/signup" variant="flat">
                Sign Up for UltraCoach
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Confirmation state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="max-w-md w-full border-t-4 border-t-warning shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center space-y-3 w-full">
            <MountainSnow className="h-12 w-12 text-warning" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Decline Invitation?</h1>
              <p className="text-default-600 mt-1">We&apos;re sorry to see you go</p>
            </div>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="pt-6 space-y-6">
          <p className="text-center text-default-600">
            Are you sure you want to decline this invitation? You can always sign up later if you
            change your mind.
          </p>

          {/* Optional reason with character count */}
          <div>
            <Textarea
              label="Reason (optional)"
              placeholder="Let them know why you're declining..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              variant="bordered"
              maxLength={500}
              minRows={2}
              description={`${reason.length}/500 characters`}
            />
            <p className="text-xs text-default-400 mt-1">
              This will be shared with the person who invited you
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              color="danger"
              variant="flat"
              size="lg"
              className="w-full"
              onPress={handleDecline}
              isLoading={state === 'declining'}
            >
              {state === 'declining' ? 'Declining...' : 'Decline Invitation'}
            </Button>

            <Button
              as={Link}
              href={`/invitations/accept/${token}`}
              color="secondary"
              size="lg"
              className="w-full font-semibold"
            >
              Go Back & Accept
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
