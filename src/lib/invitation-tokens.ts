import { createHash, randomBytes, timingSafeEqual } from 'crypto'

import { BASE_URL_CONFIG, getBaseUrl } from './base-url'

const TOKEN_LENGTH = 32 // 256 bits of entropy
const DEFAULT_EXPIRATION_DAYS = 14
const MAX_EXPIRATION_DAYS = 30
/** Maximum number of times an invitation can be resent */
const MAX_RESENDS = 3

export interface TokenData {
  /** URL-safe token for email link */
  token: string
  /** SHA-256 hash stored in database */
  tokenHash: string
  /** When the invitation expires */
  expiresAt: Date
}

/**
 * Generates a secure invitation token
 *
 * Security considerations:
 * - Token is URL-safe base64 encoded (32 bytes = 256 bits of entropy)
 * - Only the hash is stored in the database
 * - Raw token is only sent via email and never logged
 * - This prevents token exposure if database is compromised
 */
export function generateInvitationToken(
  expirationDays: number = DEFAULT_EXPIRATION_DAYS
): TokenData {
  // Validate and clamp expiration
  const days = Math.min(Math.max(1, expirationDays), MAX_EXPIRATION_DAYS)

  // Generate cryptographically secure random bytes
  const randomData = randomBytes(TOKEN_LENGTH)

  // Create URL-safe base64 token (replaces +, /, and = with URL-safe chars)
  const token = randomData.toString('base64url')

  // Create SHA-256 hash for secure storage
  const tokenHash = createHash('sha256').update(token).digest('hex')

  // Calculate expiration date
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)

  return { token, tokenHash, expiresAt }
}

/**
 * Creates a SHA-256 hash of a token for database lookup/comparison
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Validates a token against its stored hash using constant-time comparison
 * This prevents timing attacks
 */
export function validateTokenHash(token: string, storedHash: string): boolean {
  try {
    const computedHash = hashToken(token)
    // Use constant-time comparison to prevent timing attacks
    return timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'))
  } catch {
    // If hash lengths don't match or other error, return false
    return false
  }
}

/**
 * Checks if an invitation token has expired
 * Accepts both Date objects and ISO strings for defensive handling
 */
export function isTokenExpired(expiresAt: Date | string): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return new Date() > expiry
}

// Re-export getBaseUrl for backward compatibility
export { getBaseUrl } from './base-url'

/**
 * Builds the full invitation acceptance URL
 * @param token - The invitation token to include in the URL
 * @returns The complete acceptance URL
 */
export function buildInvitationUrl(token: string): string {
  return `${getBaseUrl()}/invitations/accept/${token}`
}

/**
 * Builds the invitation decline URL
 * @param token - The invitation token to include in the URL
 * @returns The complete decline URL
 */
export function buildDeclineUrl(token: string): string {
  return `${getBaseUrl()}/invitations/decline/${token}`
}

/**
 * Configuration constants exposed for use elsewhere.
 * Use these constants to ensure consistency between client and server.
 */
export const INVITATION_CONFIG = {
  DEFAULT_EXPIRATION_DAYS,
  MAX_EXPIRATION_DAYS,
  TOKEN_LENGTH,
  MAX_RESENDS,
  DEFAULT_BASE_URL: BASE_URL_CONFIG.DEFAULT_BASE_URL,
} as const
