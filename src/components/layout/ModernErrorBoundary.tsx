'use client'

import React from 'react'
import { Card, CardBody, Button, Chip } from '@heroui/react'
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ModernErrorBoundary')

interface ModernErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  retryCount: number
}

interface ModernErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ 
    error?: Error
    errorInfo?: React.ErrorInfo
    retry?: () => void
    resetError?: () => void
    retryCount?: number
  }>
  maxRetries?: number
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

const DefaultErrorFallback = ({ 
  error, 
  errorInfo, 
  retry, 
  resetError, 
  retryCount = 0 
}: { 
  error?: Error
  errorInfo?: React.ErrorInfo
  retry?: () => void
  resetError?: () => void
  retryCount?: number
}) => {
  const router = useRouter()

  const isDevelopment = process.env.NODE_ENV === 'development'
  const maxRetriesReached = retryCount >= 3

  return (
    <Card className="py-12 mx-4">
      <CardBody className="text-center space-y-6">
        <div className="flex justify-center">
          <AlertTriangleIcon className="h-16 w-16 text-danger" />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h3>
          
          <p className="text-foreground-600 max-w-md mx-auto">
            {error?.message || 'An unexpected error occurred. We\'re working to fix this.'}
          </p>

          {retryCount > 0 && (
            <Chip color="warning" variant="flat" size="sm">
              Retry attempt {retryCount}
            </Chip>
          )}
        </div>

        <div className="flex justify-center gap-3 flex-wrap">
          {!maxRetriesReached && retry && (
            <Button
              color="primary"
              variant="flat"
              startContent={<RefreshCwIcon className="w-4 h-4" />}
              onPress={retry}
            >
              Try Again
            </Button>
          )}
          
          <Button
            variant="light"
            startContent={<HomeIcon className="w-4 h-4" />}
            onPress={() => router.push('/')}
          >
            Go Home
          </Button>

          {resetError && (
            <Button
              variant="ghost"
              size="sm"
              onPress={resetError}
            >
              Reset
            </Button>
          )}
        </div>

        {isDevelopment && error && (
          <details className="text-left bg-default-100 p-4 rounded-lg mt-6">
            <summary className="cursor-pointer font-medium text-sm mb-2">
              Debug Information
            </summary>
            <div className="space-y-2 text-xs font-mono">
              <div>
                <strong>Error:</strong> {error.name}: {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1 overflow-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1 overflow-auto">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </CardBody>
    </Card>
  )
}

export class ModernErrorBoundary extends React.Component<
  ModernErrorBoundaryProps, 
  ModernErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ModernErrorBoundaryProps) {
    super(props)
    this.state = { 
      hasError: false, 
      retryCount: 0 
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ModernErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error with structured logging
    logger.error('Error boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Report to error tracking service (if available)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // Example: Google Analytics error tracking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      })
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const newRetryCount = this.state.retryCount + 1

    if (newRetryCount > maxRetries) {
      logger.warn('Max retries reached', { maxRetries, retryCount: newRetryCount })
      return
    }

    logger.info('Retrying after error', { retryCount: newRetryCount })

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: newRetryCount 
    })

    // Optional: Add exponential backoff for retries
    const backoffDelay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 10000)
    this.retryTimeoutId = setTimeout(() => {
      // Force re-render after backoff
      this.forceUpdate()
    }, backoffDelay)
  }

  handleResetError = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined, 
      retryCount: 0 
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retry={this.handleRetry}
          resetError={this.handleResetError}
          retryCount={this.state.retryCount}
        />
      )
    }

    return this.props.children
  }
}

export default ModernErrorBoundary