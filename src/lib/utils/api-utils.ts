/**
 * API utilities for normalizing response formats
 *
 * @module utils/api-utils
 */

/**
 * Normalizes API list responses that can be either arrays or wrapped objects
 *
 * @template T - The type of items in the array
 * @param data - The response data (array, object with key, or null/undefined)
 * @param key - The key to extract from object responses
 * @returns Normalized array of items
 *
 * @example
 * // Direct array response
 * normalizeListResponse([{id: 1}, {id: 2}], 'items') // [{id: 1}, {id: 2}]
 *
 * // Wrapped object response
 * normalizeListResponse({items: [{id: 1}]}, 'items') // [{id: 1}]
 *
 * // Null/undefined response
 * normalizeListResponse(null, 'items') // []
 */
export function normalizeListResponse<T>(
  data: ReadonlyArray<T> | Record<string, unknown> | null | undefined,
  key: string
): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, key)) {
    const extracted = (data as Record<string, unknown>)[key]
    if (Array.isArray(extracted)) {
      return extracted as T[]
    }
  }
  return []
}
