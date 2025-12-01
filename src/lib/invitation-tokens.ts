import { createHash, randomBytes, timingSafeEqual } from 'crypto'

const TOKEN_LENGTH = 32 // 256 bits of entropy
const DEFAULT_EXPIRATION_DAYS = 14
const MAX_EXPIRATION_DAYS = 30
/** Maximum number of times an invitation can be resent */
const MAX_RESENDS = 3
/** Default fallback URL for development */
const DEFAULT_BASE_URL = 'http://localhost:3001'

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

/**
 * Normalizes a URL or hostname by trimming whitespace and removing trailing slashes
 * @param value - The URL or hostname to normalize
 * @returns Normalized string or null if empty/whitespace-only
 */
function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  // Strip trailing slashes to prevent double-slash URLs
  return trimmed.replace(/\/+$/, '')
}

/**
 * Strips http:// or https:// protocol from a hostname
 * Handles misconfigured env vars that accidentally include protocol
 */
function stripProtocol(hostname: string): string {
  return hostname.replace(/^https?:\/\//, '')
}

/**
 * Gets the application base URL from environment variables
 *
 * Priority order:
 * 1. NEXT_PUBLIC_APP_URL - Explicitly set app URL (recommended for production)
 * 2. VERCEL_PROJECT_PRODUCTION_URL - Auto-set by Vercel for production domain
 * 3. VERCEL_URL - Auto-set by Vercel for preview/production deployments
 * 4. DEFAULT_BASE_URL - Fallback for local development
 *
 * @returns The base URL for building invitation links
 * @throws Error if NEXT_PUBLIC_APP_URL is set but missing http:// or https:// protocol
 */
export function getBaseUrl(): string {
  // Priority 1: Explicitly configured app URL
  const appUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL)
  if (appUrl) {
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      throw new Error(`NEXT_PUBLIC_APP_URL must start with http:// or https://, got: ${appUrl}`)
    }
    return appUrl
  }

  // Priority 2: Vercel production URL (hostname only, needs https://)
  // Strip any accidental protocol to prevent double-protocol URLs
  const prodUrl = normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  if (prodUrl) {
    return `https://${stripProtocol(prodUrl)}`
  }

  // Priority 3: Vercel deployment URL (hostname only, needs https://)
  // Strip any accidental protocol to prevent double-protocol URLs
  const vercelUrl = normalizeUrl(process.env.VERCEL_URL)
  if (vercelUrl) {
    return `https://${stripProtocol(vercelUrl)}`
  }

  // Priority 4: Local development fallback
  return DEFAULT_BASE_URL
}

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
  DEFAULT_BASE_URL,
} as const
