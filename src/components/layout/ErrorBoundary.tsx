'use client'

import React from 'react'
import { Card, CardBody, Button } from '@heroui/react'
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>
}

const DefaultErrorFallback = ({ error, retry }: { error?: Error; retry?: () => void }) => (
  <Card className="py-12">
    <CardBody className="text-center space-y-4">
      <AlertTriangleIcon className="mx-auto h-12 w-12 text-danger mb-4" />
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
        <p className="text-foreground-600 mb-4">
          {error?.message || 'An unexpected error occurred while loading your data.'}
        </p>
      </div>
      {retry && (
        <Button
          color="primary"
          variant="flat"
          startContent={<RefreshCwIcon className="w-4 h-4" />}
          onPress={retry}
        >
          Try Again
        </Button>
      )}
    </CardBody>
  </Card>
)

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to your error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
    }

    return this.props.children
  }
}

export default ErrorBoundary