import React, { Suspense } from 'react'
import { Spinner } from '@heroui/react'

interface SuspenseWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingMessage?: string
}

const defaultFallback = (
  <div className="flex justify-center items-center h-64">
    <Spinner size="lg" color="primary" label="Loading your training journey..." />
  </div>
)

export default function SuspenseWrapper({ 
  children, 
  fallback = defaultFallback,
  loadingMessage = "Loading your training journey..."
}: SuspenseWrapperProps) {
  const customFallback = loadingMessage !== "Loading your training journey..." ? (
    <div className="flex justify-center items-center h-64">
      <Spinner size="lg" color="primary" label={loadingMessage} />
    </div>
  ) : fallback

  return (
    <Suspense fallback={customFallback}>
      {children}
    </Suspense>
  )
}