'use client'

import { Card, CardBody, Skeleton } from '@heroui/react'

/**
 * Skeleton component for InvitationsList
 */
export function InvitationsListSkeleton() {
  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-40 rounded" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>

          {/* Invitation Items */}
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-default-50 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
