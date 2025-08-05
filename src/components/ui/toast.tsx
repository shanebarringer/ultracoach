'use client'

import { ToastProvider } from '@heroui/react'

export function Toaster() {
  return (
    <ToastProvider
      placement="top-right"
      maxVisibleToasts={5}
      toastProps={{
        color: 'primary',
        variant: 'flat',
        radius: 'md',
        timeout: 5000,
      }}
    />
  )
}

// Export toast functions from HeroUI for easy usage
export { addToast } from '@heroui/react'
