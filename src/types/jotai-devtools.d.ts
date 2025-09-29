declare module 'jotai-devtools' {
  import type { ComponentType } from 'react'
  // DevTools has no required props; disallow accidental props
  export const DevTools: ComponentType<Record<string, never>>
}
