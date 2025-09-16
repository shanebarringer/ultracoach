import { Card, CardBody, Tab, Tabs } from '@heroui/react'

/**
 * Skeleton component for RelationshipsList
 * Provides loading state that matches the actual component structure
 */
export function RelationshipsListSkeleton() {
  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <div className="space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 bg-default-200 rounded animate-pulse" />
            <div className="h-6 w-40 bg-default-200 rounded animate-pulse" />
          </div>

          {/* Tabs skeleton */}
          <Tabs variant="underlined" className="mb-4" isDisabled>
            <Tab key="all" title="All" />
            <Tab key="pending" title="Pending" />
            <Tab key="active" title="Active" />
            <Tab key="inactive" title="Inactive" />
          </Tabs>

          {/* Relationship cards skeleton */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-default-50 rounded-lg">
              {/* Avatar skeleton */}
              <div className="h-12 w-12 bg-default-200 rounded-full animate-pulse flex-shrink-0" />

              {/* Content skeleton */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 bg-default-200 rounded animate-pulse" />
                  <div className="h-5 w-12 bg-default-200 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-default-200 rounded animate-pulse" />
                </div>
                <div className="h-3 w-48 bg-default-200 rounded animate-pulse" />
              </div>

              {/* Action buttons skeleton */}
              <div className="flex gap-2">
                <div className="h-8 w-16 bg-default-200 rounded animate-pulse" />
                <div className="h-8 w-16 bg-default-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
