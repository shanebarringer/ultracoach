declare module 'jotai-devtools' {
  import type { ComponentType } from 'react'
  // DevTools has no required props; allow arbitrary optional props
  export const DevTools: ComponentType<Record<string, unknown>>
}
