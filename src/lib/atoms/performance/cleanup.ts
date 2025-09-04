/**
 * Cleanup utilities for atomFamily patterns to prevent memory leaks
 *
 * AtomFamily creates new atoms dynamically based on parameters, which can lead
 * to memory leaks if atoms are created but never cleaned up. This module provides
 * utilities to manage atom lifecycle and ensure proper cleanup.
 */
import type { Atom } from 'jotai'

/**
 * WeakMap to store atom instances for automatic garbage collection
 * when references are no longer needed
 */
const atomCache = new WeakMap<object, Map<string, Atom<unknown>>>()

/**
 * Track atom usage count to know when to clean up
 */
const atomUsageCount = new Map<string, number>()

/**
 * Get or create an atom with automatic cleanup tracking
 *
 * @param key - Unique key for the atom instance
 * @param factory - Factory function to create the atom
 * @param cacheKey - Object key for WeakMap caching (for GC)
 * @returns The atom instance
 *
 * @example
 * ```typescript
 * const workoutAtom = getOrCreateAtom(
 *   `workout-${id}`,
 *   () => atom<Workout | null>(null),
 *   workoutCacheKey
 * )
 * ```
 */
export function getOrCreateAtom<T>(
  key: string,
  factory: () => Atom<T>,
  cacheKey: object = {}
): Atom<T> {
  // Get or create the cache for this object
  let cache = atomCache.get(cacheKey)
  if (!cache) {
    cache = new Map()
    atomCache.set(cacheKey, cache)
  }

  // Get or create the atom
  let atomInstance = cache.get(key) as Atom<T> | undefined
  if (!atomInstance) {
    atomInstance = factory()
    cache.set(key, atomInstance)

    // Track usage
    atomUsageCount.set(key, (atomUsageCount.get(key) || 0) + 1)
  }

  return atomInstance
}

/**
 * Release an atom reference and clean up if no longer needed
 *
 * @param key - The atom key to release
 * @param cacheKey - The cache key used when creating the atom
 *
 * @example
 * ```typescript
 * // In component cleanup
 * useEffect(() => {
 *   return () => releaseAtom(`workout-${id}`, workoutCacheKey)
 * }, [id])
 * ```
 */
export function releaseAtom(key: string, cacheKey: object = {}): void {
  const count = atomUsageCount.get(key) || 0

  if (count <= 1) {
    // Remove from cache if this was the last reference
    const cache = atomCache.get(cacheKey)
    if (cache) {
      cache.delete(key)
      if (cache.size === 0) {
        atomCache.delete(cacheKey)
      }
    }
    atomUsageCount.delete(key)
  } else {
    // Decrement usage count
    atomUsageCount.set(key, count - 1)
  }
}

/**
 * Create an atomFamily with built-in cleanup
 *
 * @param atomFactory - Factory function that creates atoms based on parameters
 * @param getKey - Function to generate a unique key from parameters
 * @returns Functions to get and remove atoms
 *
 * @example
 * ```typescript
 * const { getAtom, removeAtom } = createAtomFamilyWithCleanup(
 *   (workoutId: string) => atom<Workout | null>(null),
 *   (workoutId) => `workout-${workoutId}`
 * )
 *
 * // Get or create atom
 * const workoutAtom = getAtom('workout-123')
 *
 * // Clean up when done
 * removeAtom('workout-123')
 * ```
 */
export function createAtomFamilyWithCleanup<Params extends readonly unknown[], T>(
  atomFactory: (...params: Params) => Atom<T>,
  getKey: (...params: Params) => string
) {
  const familyCacheKey = {} // Unique object for this family

  return {
    getAtom: (...params: Params): Atom<T> => {
      const key = getKey(...params)
      return getOrCreateAtom(key, () => atomFactory(...params), familyCacheKey)
    },
    removeAtom: (...params: Params): void => {
      const key = getKey(...params)
      releaseAtom(key, familyCacheKey)
    },
    clearAll: (): void => {
      // Clear all atoms in this family
      const cache = atomCache.get(familyCacheKey)
      if (cache) {
        for (const key of cache.keys()) {
          atomUsageCount.delete(key)
        }
        atomCache.delete(familyCacheKey)
      }
    },
  }
}

// Note: React hook for cleanup should be implemented directly in components
// to avoid conditional hook usage and ensure proper React patterns.
// Example usage in components:
//
// useEffect(() => {
//   return () => {
//     workoutAtomFamilyEnhanced.removeAtom(workoutId)
//   }
// }, [workoutId])

/**
 * Global cleanup function to clear all cached atoms
 * Useful for testing or when resetting the entire application state
 */
export function clearAllAtomCaches(): void {
  atomUsageCount.clear()
  // WeakMap will automatically garbage collect when references are released
}
