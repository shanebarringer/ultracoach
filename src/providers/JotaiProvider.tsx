'use client'

import { Provider } from 'jotai'

import dynamic from 'next/dynamic'

// Load DevTools only on the client to avoid server bundle issues
const DevTools = dynamic(() => import('jotai-devtools').then(m => m.DevTools), {
  ssr: false,
})

export function JotaiProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === 'development' ? <DevTools /> : null}
    </Provider>
  )
}
