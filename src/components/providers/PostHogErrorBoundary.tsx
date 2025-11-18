'use client'

import posthog from 'posthog-js'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary that captures errors and sends them to PostHog
 * Wraps critical parts of the application for better error tracking
 */
export class PostHogErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to PostHog
    if (posthog.has_opted_in_capturing()) {
      posthog.capture('$exception', {
        $exception_type: error.name,
        $exception_message: error.message,
        $exception_stack_trace_raw: error.stack,
        $exception_level: 'error',
        errorInfo: errorInfo.componentStack,
      })
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by PostHogErrorBoundary:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        this.props.fallback || (
          <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="max-w-md text-center">
              <h1 className="mb-4 text-2xl font-bold text-red-600">Something went wrong</h1>
              <p className="mb-6 text-gray-600">
                We&apos;ve been notified and will look into it. Please try refreshing the page.
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                  window.location.reload()
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Refresh Page
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
