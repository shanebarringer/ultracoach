'use client'

import { Suspense } from 'react'

import { AsyncInvitationsList } from './AsyncInvitationsList'
import { InvitationsListSkeleton } from './InvitationsListSkeleton'

interface InvitationsListProps {
  onInvitationUpdated?: () => void
}

/**
 * InvitationsList component with Suspense boundary
 * Provides seamless loading experience using Suspense pattern
 */
export function InvitationsList({ onInvitationUpdated }: InvitationsListProps) {
  return (
    <Suspense fallback={<InvitationsListSkeleton />}>
      <AsyncInvitationsList onInvitationUpdated={onInvitationUpdated} />
    </Suspense>
  )
}
