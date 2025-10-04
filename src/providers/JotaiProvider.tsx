'use client'

import { Provider } from 'jotai'
import { DevTools } from 'jotai-devtools'

export function JotaiProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      {children}
      {/* DevTools only works in development environment */}
      {process.env.NODE_ENV === 'development' && <DevTools />}
    </Provider>
  )
}
