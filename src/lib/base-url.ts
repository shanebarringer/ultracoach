/**
 * Shared base URL utility for consistent URL resolution across the application.
 *
 * Used by:
 * - Invitation tokens (email links)
 * - Strava OAuth redirects
 * - Any other feature requiring the application base URL
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('base-url')

/** Default fallback URL for development */
const DEFAULT_BASE_URL = 'http://localhost:3001'

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
 * Gets the application base URL from environment variables.
 *
 * Priority order:
 * 1. NEXT_PUBLIC_APP_URL - Explicitly set app URL (recommended for production)
 * 2. NEXT_PUBLIC_BETTER_AUTH_URL - Better Auth URL (often set in production)
 * 3. VERCEL_PROJECT_PRODUCTION_URL - Auto-set by Vercel for production domain
 * 4. VERCEL_URL - Auto-set by Vercel for preview/production deployments
 * 5. DEFAULT_BASE_URL - Fallback for local development
 *
 * @returns The base URL for building application links
 * @throws Error if NEXT_PUBLIC_APP_URL is set but missing http:// or https:// protocol
 */
export function getBaseUrl(): string {
  // Priority 1: Explicitly configured app URL
  const appUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL)
  if (appUrl) {
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      const errorMsg = `NEXT_PUBLIC_APP_URL must start with http:// or https://, got: ${appUrl}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
    return appUrl
  }

  // Priority 2: Better Auth URL (often set in production)
  const betterAuthUrl = normalizeUrl(process.env.NEXT_PUBLIC_BETTER_AUTH_URL)
  if (betterAuthUrl) {
    if (!betterAuthUrl.startsWith('http://') && !betterAuthUrl.startsWith('https://')) {
      const errorMsg = `NEXT_PUBLIC_BETTER_AUTH_URL must start with http:// or https://, got: ${betterAuthUrl}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
    return betterAuthUrl
  }

  // Priority 3: Vercel production URL (hostname only, needs https://)
  // Strip any accidental protocol to prevent double-protocol URLs
  const prodUrl = normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  if (prodUrl) {
    return `https://${stripProtocol(prodUrl)}`
  }

  // Priority 4: Vercel deployment URL (hostname only, needs https://)
  // Strip any accidental protocol to prevent double-protocol URLs
  const vercelUrl = normalizeUrl(process.env.VERCEL_URL)
  if (vercelUrl) {
    return `https://${stripProtocol(vercelUrl)}`
  }

  // Priority 5: Local development fallback
  return DEFAULT_BASE_URL
}

/** Configuration constants for base URL handling */
export const BASE_URL_CONFIG = {
  DEFAULT_BASE_URL,
} as const
