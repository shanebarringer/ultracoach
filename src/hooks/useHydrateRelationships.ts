'use client'

import { useAtomValue } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'

import { relationshipsAsyncAtom, relationshipsAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useHydrateRelationships')

/**
 * Hook to hydrate the synchronous relationshipsAtom from the async Suspense-based atom
 * Uses synchronous useHydrateAtoms to eliminate race condition with BetterAuthProvider
 * This ensures data consistency between the two atoms and prevents data mismatches
 *
 * Pattern matches useHydrateWorkouts for consistency across the codebase.
 */
export function useHydrateRelationships() {
  // This will trigger Suspense if not already loaded
  const asyncRelationships = useAtomValue(relationshipsAsyncAtom)

  // Synchronously hydrate BEFORE first render to prevent race condition
  // Same pattern as BetterAuthProvider and useHydrateWorkouts
  useHydrateAtoms([[relationshipsAtom, asyncRelationships ?? []]])

  logger.debug('Hydrating relationships atom from async data', {
    count: asyncRelationships?.length ?? 0,
  })

  return asyncRelationships
}
