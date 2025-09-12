/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock Providers for Testing React Components with Jotai
 *
 * Provides test wrappers for components that use Jotai atoms
 */
import { Provider } from 'jotai'
import { createStore } from 'jotai'
import type { WritableAtom } from 'jotai'

import type { ReactNode } from 'react'

interface TestProviderProps {
  children: ReactNode
  initialValues?: Map<WritableAtom<unknown, any, any>, unknown>
  store?: ReturnType<typeof createStore>
}

/**
 * Test provider wrapper for components using Jotai
 */
export function TestProvider({ children, initialValues, store }: TestProviderProps) {
  const testStore = store || createStore()

  if (initialValues && !store) {
    initialValues.forEach((value, atom) => {
      testStore.set(atom, value)
    })
  }

  return <Provider store={testStore}>{children}</Provider>
}

/**
 * Create a wrapper function for React Testing Library
 */
export function createWrapper(initialValues?: Map<WritableAtom<unknown, any, any>, unknown>) {
  const store = createStore()

  if (initialValues) {
    initialValues.forEach((value, atom) => {
      store.set(atom, value)
    })
  }

  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
    store,
  }
}
