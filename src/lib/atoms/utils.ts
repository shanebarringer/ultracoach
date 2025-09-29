import type { Atom } from 'jotai'

/**
 * Attaches a debug label to a Jotai atom in non-production builds.
 * Keeps production bundles clean while making DevTools readable in dev.
 */
export function withDebugLabel<T>(a: Atom<T>, label: string): Atom<T> {
  if (process.env.NODE_ENV !== 'production') {
    ;(a as unknown as { debugLabel?: string }).debugLabel = label
  }
  return a
}
