'use client'

import { HeroUIProvider as NextUIProvider } from '@heroui/react'

export function HeroUIProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      {children}
    </NextUIProvider>
  )
}