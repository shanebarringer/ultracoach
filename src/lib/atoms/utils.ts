import type { Atom } from 'jotai'

// Extend Jotai's Atom with the optional debugLabel field in dev
type DebuggableAtom = Atom<unknown> & { debugLabel?: string }

/**
 * Attach a Jotai Devtools debug label to an atom at instantiation time.
 * No-ops in production builds.
 */
export function withDebugLabel<T extends Atom<unknown>>(a: T, label: string): T {
  if (process.env.NODE_ENV !== 'production') {
    ;(a as DebuggableAtom).debugLabel = label
  }
  return a
}
