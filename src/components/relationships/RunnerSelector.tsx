'use client'

import { Suspense } from 'react'

import { AsyncRunnerSelector } from './AsyncRunnerSelector'
import { RunnerSelectorSkeleton } from './RunnerSelectorSkeleton'

interface RunnerSelectorProps {
  onRelationshipCreated?: () => void
}

/**
 * RunnerSelector component with Suspense boundary
 * Provides seamless loading experience using Suspense pattern
 */
export function RunnerSelector({ onRelationshipCreated }: RunnerSelectorProps) {
  return (
    <Suspense fallback={<RunnerSelectorSkeleton />}>
      <AsyncRunnerSelector onRelationshipCreated={onRelationshipCreated} />
    </Suspense>
  )
}
