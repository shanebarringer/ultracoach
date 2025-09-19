'use client'

import { Suspense } from 'react'

import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'

import { AsyncRelationshipsList } from './AsyncRelationshipsList'
import { RelationshipsListSkeleton } from './RelationshipsListSkeleton'

interface RelationshipsListProps {
  onRelationshipUpdated?: () => void
}

/**
 * RelationshipsList component with Error Boundary and Suspense
 * Provides robust error handling and seamless loading experience
 */
export function RelationshipsList({ onRelationshipUpdated }: RelationshipsListProps) {
  return (
    <ModernErrorBoundary>
      <Suspense fallback={<RelationshipsListSkeleton />}>
        <AsyncRelationshipsList onRelationshipUpdated={onRelationshipUpdated} />
      </Suspense>
    </ModernErrorBoundary>
  )
}
