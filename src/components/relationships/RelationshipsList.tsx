'use client'

import { Suspense } from 'react'

import { AsyncRelationshipsList } from './AsyncRelationshipsList'
import { RelationshipsListSkeleton } from './RelationshipsListSkeleton'

interface RelationshipsListProps {
  onRelationshipUpdated?: () => void
}

/**
 * RelationshipsList component with Suspense boundary
 * Provides seamless loading experience using Suspense pattern
 */
export function RelationshipsList({ onRelationshipUpdated }: RelationshipsListProps) {
  return (
    <Suspense fallback={<RelationshipsListSkeleton />}>
      <AsyncRelationshipsList onRelationshipUpdated={onRelationshipUpdated} />
    </Suspense>
  )
}
