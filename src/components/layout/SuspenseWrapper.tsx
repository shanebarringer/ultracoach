import React, { Suspense } from 'react'
import { Spinner } from '@heroui/react'

interface SuspenseWrapperProps {
  children: React.ReactNode
  loadingMessage?: string
}

export default function SuspenseWrapper({ 
  children, 
  loadingMessage = "Loading your training journey..."
}: SuspenseWrapperProps) {
  const fallback = (
    <div className="flex justify-center items-center h-64">
      <Spinner size="lg" color="primary" label={loadingMessage} />
    </div>
  )

  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}