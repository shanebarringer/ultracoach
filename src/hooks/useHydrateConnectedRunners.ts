'use client'

import { useAtomValue } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'

import { connectedRunnersAtom, connectedRunnersSyncAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useHydrateConnectedRunners')

/**
 * Hook to hydrate the synchronous connectedRunnersSyncAtom from the async Suspense-based atom.
 * Uses synchronous useHydrateAtoms to eliminate race condition with BetterAuthProvider.
 * This ensures data consistency between the two atoms and prevents data mismatches.
 *
 * Call this hook at the top of components that need connected runners data
 * before they read from the sync atom.
 */
export function useHydrateConnectedRunners() {
  // This will trigger Suspense if not already loaded
  const asyncRunners = useAtomValue(connectedRunnersAtom)

  // Synchronously hydrate BEFORE first render to prevent race condition
  // Same pattern as useHydrateWorkouts - eliminates timing issues on page refresh
  useHydrateAtoms([[connectedRunnersSyncAtom, asyncRunners ?? []]])

  logger.debug('Hydrating connected runners atom from async data', {
    count: asyncRunners?.length ?? 0,
  })

  return asyncRunners
}
