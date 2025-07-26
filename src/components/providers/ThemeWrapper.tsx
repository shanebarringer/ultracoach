'use client'

import { useAtom } from 'jotai'

import { useEffect } from 'react'

import { themeModeAtom } from '@/lib/atoms'

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [themeMode] = useAtom(themeModeAtom)

  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [themeMode])

  return <>{children}</>
}
