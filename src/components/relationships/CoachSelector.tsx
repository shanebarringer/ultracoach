'use client'

import { Suspense } from 'react'

import type { User } from '@/lib/better-auth-client'

import { AsyncCoachSelector } from './AsyncCoachSelector'
import { CoachSelectorSkeleton } from './CoachSelectorSkeleton'

interface CoachSelectorProps {
  onRelationshipCreated?: () => void
  user: User
}

/**
 * CoachSelector component with Suspense boundary
 * Provides seamless loading experience using Suspense pattern
 */
export function CoachSelector({ onRelationshipCreated, user }: CoachSelectorProps) {
  return (
    <Suspense fallback={<CoachSelectorSkeleton />}>
      <AsyncCoachSelector onRelationshipCreated={onRelationshipCreated} user={user} />
    </Suspense>
  )
}
