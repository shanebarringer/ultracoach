'use client'

import { Suspense } from 'react'

import type { User } from '@/lib/better-auth-client'

import { AsyncRunnerSelector } from './AsyncRunnerSelector'
import { RunnerSelectorSkeleton } from './RunnerSelectorSkeleton'

interface RunnerSelectorProps {
  onRelationshipCreated?: () => void
  user: User
}

/**
 * RunnerSelector component with Suspense boundary
 * Provides seamless loading experience using Suspense pattern
 */
export function RunnerSelector({ onRelationshipCreated, user }: RunnerSelectorProps) {
  return (
    <Suspense fallback={<RunnerSelectorSkeleton />}>
      <AsyncRunnerSelector onRelationshipCreated={onRelationshipCreated} user={user} />
    </Suspense>
  )
}
