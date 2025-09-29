'use client'

import { Provider } from 'jotai'

import type { ComponentType } from 'react'

import dynamic from 'next/dynamic'

// Gate the dynamic import itself so the devtools chunk is not included in production
let DevTools: ComponentType | null = null
if (process.env.NODE_ENV === 'development') {
  DevTools = dynamic(() => import('jotai-devtools').then(m => m.DevTools), {
    ssr: false,
  }) as unknown as ComponentType
}

export function JotaiProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      {children}
      {DevTools ? <DevTools /> : null}
    </Provider>
  )
}
