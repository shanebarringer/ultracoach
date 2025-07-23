'use client'

import { Suspense, ReactNode } from 'react'
import { useAtom } from 'jotai'
import { Spinner, Card, CardBody } from '@heroui/react'
import { uiStateAtom } from '@/lib/atoms'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'

interface AsyncDataProviderProps {
  children: ReactNode
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
  enableSuspenseDemo?: boolean
}

const DefaultLoadingFallback = () => (
  <div className="flex justify-center items-center h-64">
    <Spinner 
      size="lg" 
      color="primary" 
      label="Loading your expedition data..." 
      classNames={{
        circle1: "border-b-primary",
        circle2: "border-b-secondary",
      }}
    />
  </div>
)

const DefaultErrorFallback = () => (
  <Card className="py-12">
    <CardBody className="text-center">
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Failed to load data
      </h3>
      <p className="text-foreground-600">
        Please check your connection and try again.
      </p>
    </CardBody>
  </Card>
)

/**
 * Modern data provider that wraps children with error boundaries and suspense
 * Provides a consistent loading and error experience across the application
 * Supports both traditional loading states and React Suspense patterns
 */
export default function AsyncDataProvider({
  children,
  loadingFallback,
  errorFallback,
  enableSuspenseDemo = false,
}: AsyncDataProviderProps) {
  const [uiState] = useAtom(uiStateAtom)
  
  // Use Suspense demo toggle if enabled, otherwise default to traditional patterns
  const useSuspense = enableSuspenseDemo ? uiState.useSuspense : true

  const LoadingComponent = loadingFallback || <DefaultLoadingFallback />
  const ErrorComponent = errorFallback || <DefaultErrorFallback />

  if (useSuspense) {
    // Modern React pattern with Suspense and Error Boundaries
    return (
      <ModernErrorBoundary
        fallback={() => ErrorComponent}
        maxRetries={3}
        onError={(error, errorInfo) => {
          console.error('AsyncDataProvider caught error:', {
            error: error.message,
            componentStack: errorInfo.componentStack,
          })
        }}
      >
        <Suspense fallback={LoadingComponent}>
          {children}
        </Suspense>
      </ModernErrorBoundary>
    )
  }

  // Traditional pattern for fallback compatibility
  return (
    <ModernErrorBoundary fallback={() => ErrorComponent}>
      {children}
    </ModernErrorBoundary>
  )
}