'use client'

import { Card, CardBody } from '@heroui/react'
import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react'

import { ErrorInfo, ReactNode, Suspense } from 'react'

import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { createLogger } from '@/lib/logger'

import { GenericContentSkeleton } from './LoadingSkeletons'

const logger = createLogger('SuspenseBoundary')

interface SuspenseBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  errorFallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  name?: string
  enableRetry?: boolean
  maxRetries?: number
}

interface SuspenseErrorFallbackProps {
  error?: Error
  onRetry?: () => void
  enableRetry?: boolean
  name?: string
}

const DefaultSuspenseErrorFallback = ({
  error,
  onRetry,
  enableRetry = true,
  name = 'content',
}: SuspenseErrorFallbackProps) => (
  <Card className="w-full">
    <CardBody className="text-center py-12">
      <AlertCircleIcon className="mx-auto h-12 w-12 text-danger mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load {name}</h3>
      <p className="text-foreground-600 mb-4">
        {error?.message || 'An unexpected error occurred while loading the data.'}
      </p>
      {enableRetry && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <RefreshCwIcon className="w-4 h-4" />
          Try Again
        </button>
      )}
    </CardBody>
  </Card>
)

/**
 * Enhanced Suspense boundary that combines loading states, error boundaries,
 * and retry functionality for better user experience
 */
export function SuspenseBoundary({
  children,
  fallback,
  errorFallback,
  onError,
  name = 'content',
  enableRetry = true,
  maxRetries = 3,
}: SuspenseBoundaryProps) {
  const defaultFallback = fallback || <GenericContentSkeleton />

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error(`SuspenseBoundary [${name}] caught error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })

    onError?.(error, errorInfo)
  }

  const createErrorFallback = ({ retry }: { retry?: () => void }) => {
    if (errorFallback) {
      return errorFallback
    }

    return <DefaultSuspenseErrorFallback onRetry={retry} enableRetry={enableRetry} name={name} />
  }

  return (
    <ModernErrorBoundary
      fallback={createErrorFallback}
      onError={handleError}
      maxRetries={enableRetry ? maxRetries : 0}
    >
      <Suspense fallback={defaultFallback}>{children}</Suspense>
    </ModernErrorBoundary>
  )
}

/**
 * Specialized Suspense boundaries for common use cases
 */

export function DataListSuspenseBoundary({
  children,
  itemType = 'items',
  fallback,
}: {
  children: ReactNode
  itemType?: string
  fallback?: ReactNode
}) {
  return (
    <SuspenseBoundary name={itemType} fallback={fallback}>
      {children}
    </SuspenseBoundary>
  )
}

export function DashboardSuspenseBoundary({
  children,
  section = 'dashboard',
}: {
  children: ReactNode
  section?: string
}) {
  return (
    <SuspenseBoundary name={`${section} data`} fallback={<GenericContentSkeleton rows={3} />}>
      {children}
    </SuspenseBoundary>
  )
}

export function FormSuspenseBoundary({
  children,
  formType = 'form',
}: {
  children: ReactNode
  formType?: string
}) {
  return (
    <SuspenseBoundary
      name={`${formType} data`}
      fallback={
        <Card className="w-full">
          <CardBody className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
            </div>
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
            </div>
          </CardBody>
        </Card>
      }
    >
      {children}
    </SuspenseBoundary>
  )
}

// Higher-order component for wrapping components with Suspense
export function withSuspenseBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    name?: string
    fallback?: ReactNode
    enableRetry?: boolean
  } = {}
) {
  const WrappedComponent = (props: P) => (
    <SuspenseBoundary
      name={options.name || Component.displayName || Component.name || 'component'}
      fallback={options.fallback}
      enableRetry={options.enableRetry}
    >
      <Component {...props} />
    </SuspenseBoundary>
  )

  WrappedComponent.displayName = `withSuspenseBoundary(${
    Component.displayName || Component.name || 'Component'
  })`

  return WrappedComponent
}
