'use client'

import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from '@heroui/react'
import { useAtomValue, useSetAtom } from 'jotai'
import { Mail, RefreshCw, Send, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'

import { useCallback, useMemo } from 'react'

import {
  type Invitation,
  isInviteModalOpenAtom,
  resendInvitationAtom,
  resendingInvitationIdsAtom,
  revokeInvitationAtom,
  revokingInvitationIdsAtom,
  sentInvitationsAsyncAtom,
} from '@/lib/atoms/invitations'
import { INVITATION_CONFIG } from '@/lib/invitation-tokens'
import { createLogger } from '@/lib/logger'
import { formatDateShort } from '@/lib/utils/date'

const logger = createLogger('AsyncInvitationsList')

interface AsyncInvitationsListProps {
  onInvitationUpdated?: () => void
}

// Status chip colors
const statusColors: Record<Invitation['status'], 'warning' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'danger',
  expired: 'default',
  revoked: 'default',
}

const statusLabels: Record<Invitation['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  revoked: 'Revoked',
}

/**
 * Async InvitationsList component that uses Suspense
 */
export function AsyncInvitationsList({ onInvitationUpdated }: AsyncInvitationsListProps) {
  const invitations = useAtomValue(sentInvitationsAsyncAtom)
  const setIsModalOpen = useSetAtom(isInviteModalOpenAtom)
  const resendingIds = useAtomValue(resendingInvitationIdsAtom)
  const revokingIds = useAtomValue(revokingInvitationIdsAtom)
  const resendInvitation = useSetAtom(resendInvitationAtom)
  const revokeInvitation = useSetAtom(revokeInvitationAtom)

  // Sort invitations: pending first, then by created date
  const sortedInvitations = useMemo(() => {
    return [...invitations].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (b.status === 'pending' && a.status !== 'pending') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [invitations])

  const handleResend = useCallback(
    async (invitation: Invitation) => {
      try {
        await resendInvitation(invitation.id)
        toast.success('Invitation resent successfully!')
        onInvitationUpdated?.()
      } catch (error) {
        logger.error('Error resending invitation:', error)
        if (error instanceof Error && error.message.includes('RESEND_LIMIT')) {
          toast.error('Maximum resend limit reached for this invitation')
        } else {
          toast.error('Failed to resend invitation')
        }
      }
    },
    [resendInvitation, onInvitationUpdated]
  )

  const handleRevoke = useCallback(
    async (invitation: Invitation) => {
      try {
        await revokeInvitation(invitation.id)
        toast.success('Invitation revoked')
        onInvitationUpdated?.()
      } catch (error) {
        logger.error('Error revoking invitation:', error)
        toast.error('Failed to revoke invitation')
      }
    },
    [revokeInvitation, onInvitationUpdated]
  )

  /** Format date using date-fns for consistent display */
  const formatDate = (dateString: string) => formatDateShort(dateString)

  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-secondary" />
              <h3 className="text-xl font-semibold">Sent Invitations</h3>
            </div>
            <Button
              color="secondary"
              size="sm"
              startContent={<UserPlus className="h-4 w-4" />}
              onPress={() => setIsModalOpen(true)}
            >
              Invite
            </Button>
          </div>

          {/* Invitations List */}
          {sortedInvitations.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-3">
                <div className="rounded-full bg-default-100 p-4">
                  <Send className="h-8 w-8 text-default-400" />
                </div>
              </div>
              <p className="text-default-500 mb-4">No invitations sent yet</p>
              <Button
                color="secondary"
                variant="flat"
                startContent={<UserPlus className="h-4 w-4" />}
                onPress={() => setIsModalOpen(true)}
              >
                Send Your First Invitation
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedInvitations.map(invitation => {
                const isResending = resendingIds.has(invitation.id)
                const isRevoking = revokingIds.has(invitation.id)
                const isPending = invitation.status === 'pending'
                const canResend =
                  isPending && invitation.resendCount < INVITATION_CONFIG.MAX_RESENDS

                return (
                  <div
                    key={invitation.id}
                    className="flex items-center gap-4 p-4 bg-default-50 hover:bg-default-100 rounded-lg transition-colors"
                  >
                    <Avatar
                      name={invitation.inviteeEmail[0].toUpperCase()}
                      size="md"
                      className="flex-shrink-0"
                      classNames={{
                        base: 'bg-secondary/20',
                        name: 'text-secondary',
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground truncate">
                          {invitation.inviteeEmail}
                        </h4>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={invitation.invitedRole === 'runner' ? 'secondary' : 'primary'}
                        >
                          {invitation.invitedRole === 'runner' ? 'Runner' : 'Coach'}
                        </Chip>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <span>Sent {formatDate(invitation.createdAt)}</span>
                        {isPending && invitation.expiresAt && (
                          <>
                            <span>·</span>
                            <span>Expires {formatDate(invitation.expiresAt)}</span>
                          </>
                        )}
                        {invitation.resendCount > 0 && (
                          <>
                            <span>·</span>
                            <span>Resent {invitation.resendCount}x</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Chip size="sm" variant="flat" color={statusColors[invitation.status]}>
                        {statusLabels[invitation.status]}
                      </Chip>

                      {isPending && (
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              disabled={isResending || isRevoking}
                              aria-label="Invitation actions menu"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="Invitation actions">
                            {canResend ? (
                              <DropdownItem
                                key="resend"
                                startContent={<RefreshCw className="h-4 w-4" />}
                                onPress={() => handleResend(invitation)}
                                isDisabled={isResending}
                              >
                                {isResending ? 'Resending...' : 'Resend Invitation'}
                              </DropdownItem>
                            ) : (
                              <DropdownItem
                                key="resend-disabled"
                                startContent={<RefreshCw className="h-4 w-4" />}
                                isDisabled
                              >
                                Resend limit reached
                              </DropdownItem>
                            )}
                            <DropdownItem
                              key="revoke"
                              className="text-danger"
                              color="danger"
                              startContent={<X className="h-4 w-4" />}
                              onPress={() => handleRevoke(invitation)}
                              isDisabled={isRevoking}
                            >
                              {isRevoking ? 'Revoking...' : 'Revoke Invitation'}
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      )}

                      {invitation.status === 'accepted' && (
                        <Tooltip content="This user has joined">
                          <span className="text-success" role="img" aria-label="Accepted">
                            <svg
                              className="h-5 w-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
