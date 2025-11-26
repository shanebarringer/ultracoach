/**
 * Invitation atoms for coach invitation system
 *
 * This module manages all invitation state including sent invitations,
 * pending invitations, and invitation actions.
 *
 * @module atoms/invitations
 */
import { atom } from 'jotai'
import { atomWithRefresh } from 'jotai/utils'

import { api } from '../api-client'
import { createLogger } from '../logger'
import { normalizeListResponse } from '../utils/api-utils'

// Environment check
const isBrowser = typeof window !== 'undefined'

// Module-scoped logger
const invitationsLogger = createLogger('InvitationsAtom')

// ============================================================================
// Types
// ============================================================================

export interface Invitation {
  id: string
  inviteeEmail: string
  invitedRole: 'runner' | 'coach'
  personalMessage: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  declinedAt: string | null
  resendCount: number
  lastResentAt: string | null
  isSent: boolean
  isReceived: boolean
  isExpired: boolean
  inviter: {
    id: string
    name: string | null
    email: string
  }
}

export interface CreateInvitationPayload {
  email: string
  role: 'runner' | 'coach'
  message?: string
  expirationDays?: number
}

// ============================================================================
// Core Atoms
// ============================================================================

// Async atom that fetches sent invitations
export const sentInvitationsAsyncAtom = atomWithRefresh(async (): Promise<Invitation[]> => {
  if (!isBrowser) return []

  try {
    invitationsLogger.debug('Fetching sent invitations...')
    const response = await api.get<{ invitations: Invitation[] }>('/api/invitations?type=sent', {
      suppressGlobalToast: true,
    })
    const invitations = normalizeListResponse<Invitation>(response.data, 'invitations')
    invitationsLogger.debug('Sent invitations fetched', { count: invitations.length })
    return invitations
  } catch (error) {
    invitationsLogger.error('Error fetching sent invitations', error)
    return []
  }
})

// Async atom that fetches received invitations
export const receivedInvitationsAsyncAtom = atomWithRefresh(async (): Promise<Invitation[]> => {
  if (!isBrowser) return []

  try {
    invitationsLogger.debug('Fetching received invitations...')
    const response = await api.get<{ invitations: Invitation[] }>(
      '/api/invitations?type=received&status=pending',
      {
        suppressGlobalToast: true,
      }
    )
    const invitations = normalizeListResponse<Invitation>(response.data, 'invitations')
    invitationsLogger.debug('Received invitations fetched', { count: invitations.length })
    return invitations
  } catch (error) {
    invitationsLogger.error('Error fetching received invitations', error)
    return []
  }
})

// Note: When using Suspense boundaries, use the async atoms directly.
// The loadable pattern is only needed for manual loading state handling without Suspense.

// ============================================================================
// UI State Atoms
// ============================================================================

// Modal state
export const isInviteModalOpenAtom = atom(false)

// Form state
export const inviteFormAtom = atom<CreateInvitationPayload>({
  email: '',
  role: 'runner',
  message: '',
  expirationDays: 14,
})

// Loading states
export const isCreatingInvitationAtom = atom(false)
export const resendingInvitationIdsAtom = atom<Set<string>>(new Set<string>())
export const revokingInvitationIdsAtom = atom<Set<string>>(new Set<string>())

// Filter state
export const invitationStatusFilterAtom = atom<
  'all' | 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
>('all')

// ============================================================================
// Action Atoms
// ============================================================================

// Create invitation action atom
export const createInvitationAtom = atom(
  null,
  async (get, set, payload: CreateInvitationPayload) => {
    set(isCreatingInvitationAtom, true)

    try {
      const response = await api.post<{
        success: boolean
        invitation: Invitation
        emailSent: boolean
      }>('/api/invitations', payload)

      // Refresh the sent invitations list
      set(sentInvitationsAsyncAtom)

      // Close modal and reset form
      set(isInviteModalOpenAtom, false)
      set(inviteFormAtom, {
        email: '',
        role: 'runner',
        message: '',
        expirationDays: 14,
      })

      return response.data
    } finally {
      set(isCreatingInvitationAtom, false)
    }
  }
)

// Resend invitation action atom
export const resendInvitationAtom = atom(null, async (get, set, invitationId: string) => {
  set(resendingInvitationIdsAtom, (prev: Set<string>) => new Set(prev).add(invitationId))

  try {
    const response = await api.post<{ success: boolean }>(`/api/invitations/${invitationId}/resend`)

    // Refresh the sent invitations list
    set(sentInvitationsAsyncAtom)

    return response.data
  } finally {
    set(resendingInvitationIdsAtom, (prev: Set<string>) => {
      const newSet = new Set(prev)
      newSet.delete(invitationId)
      return newSet
    })
  }
})

// Revoke invitation action atom
export const revokeInvitationAtom = atom(null, async (get, set, invitationId: string) => {
  set(revokingInvitationIdsAtom, (prev: Set<string>) => new Set(prev).add(invitationId))

  try {
    const response = await api.post<{ success: boolean }>(`/api/invitations/${invitationId}/revoke`)

    // Refresh the sent invitations list
    set(sentInvitationsAsyncAtom)

    return response.data
  } finally {
    set(revokingInvitationIdsAtom, (prev: Set<string>) => {
      const newSet = new Set(prev)
      newSet.delete(invitationId)
      return newSet
    })
  }
})

// ============================================================================
// Debug Labels
// ============================================================================

sentInvitationsAsyncAtom.debugLabel = 'invitations/sent'
receivedInvitationsAsyncAtom.debugLabel = 'invitations/received'
isInviteModalOpenAtom.debugLabel = 'invitations/modalOpen'
inviteFormAtom.debugLabel = 'invitations/form'
isCreatingInvitationAtom.debugLabel = 'invitations/creating'
resendingInvitationIdsAtom.debugLabel = 'invitations/resendingIds'
revokingInvitationIdsAtom.debugLabel = 'invitations/revokingIds'
invitationStatusFilterAtom.debugLabel = 'invitations/statusFilter'
createInvitationAtom.debugLabel = 'invitations/create'
resendInvitationAtom.debugLabel = 'invitations/resend'
revokeInvitationAtom.debugLabel = 'invitations/revoke'
