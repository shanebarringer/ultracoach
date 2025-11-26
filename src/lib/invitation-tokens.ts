import { createHash, randomBytes, timingSafeEqual } from 'crypto'

const TOKEN_LENGTH = 32 // 256 bits of entropy
const DEFAULT_EXPIRATION_DAYS = 14
const MAX_EXPIRATION_DAYS = 30

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
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt)
}

/**
 * Builds the full invitation acceptance URL
 */
export function buildInvitationUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  return `${baseUrl}/invitations/accept/${token}`
}

/**
 * Builds the invitation decline URL
 */
export function buildDeclineUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  return `${baseUrl}/invitations/decline/${token}`
}

/**
 * Configuration constants exposed for use elsewhere
 */
export const INVITATION_CONFIG = {
  DEFAULT_EXPIRATION_DAYS,
  MAX_EXPIRATION_DAYS,
  TOKEN_LENGTH,
} as const
