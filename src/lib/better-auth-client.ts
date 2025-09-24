import { customSessionClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import type { auth } from '@/lib/better-auth'
// Re-exported types from better-auth
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Session, User } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('better-auth-client')

// Lazy initialization to prevent issues during SSR/build
let _authClient: ReturnType<typeof createAuthClient> | null = null

function getAuthClient() {
  if (!_authClient) {
    // Prevent client creation on server side
    if (typeof window === 'undefined') {
      throw new Error('Auth client should not be created on server side')
    }

    // Use a same-origin absolute baseURL (Better Auth requires absolute URLs)
    const baseURL =
      typeof window !== 'undefined' ? `${window.location.origin}/api/auth` : '/api/auth'
    _authClient = createAuthClient({
      baseURL, // Explicitly set to ensure proper cookie handling
      plugins: [
        customSessionClient<typeof auth>(), // Enable custom session inference
      ],
      fetchOptions: {
        onError(context) {
          logger.error('Better Auth client error:', {
            error: context.error?.message || 'Unknown error',
            status: context.response?.status || 'No status',
            url: context.request?.url || 'No URL',
          })
        },
        onSuccess(context) {
          logger.debug('Better Auth client success:', {
            url: context.request?.url || 'No URL',
            status: context.response?.status || 'No status',
          })
        },
      },
    })
  }
  return _authClient
}

/**
 * UltraCoach Better Auth Client
 *
 * Provides a centralized, type-safe interface to Better Auth client methods.
 * Uses lazy initialization to prevent SSR issues and improve performance.
 *
 * ## Usage Examples:
 *
 * ```typescript
 * // Sign in
 * const result = await authClient.signIn.email({
 *   email: 'user@example.com',
 *   password: 'password123'
 * })
 *
 * // Get current session
 * const session = await authClient.getSession()
 *
 * // Sign out
 * await authClient.signOut()
 * ```
 *
 * ## Available Methods:
 * - `signIn` - Authentication methods (email, social, etc.)
 * - `signUp` - User registration methods
 * - `signOut` - Session termination
 * - `getSession` - Current session retrieval
 * - `updateUser` - User profile updates
 * - `changePassword` - Password management
 * - `forgetPassword` - Password reset initiation
 * - `resetPassword` - Password reset completion
 * - `deleteUser` - Account deletion
 *
 * ## Advanced Usage:
 * For methods not explicitly listed above, use `_getClient()`:
 *
 * ```typescript
 * const client = authClient._getClient()
 * const result = await client.someNewMethod()
 * ```
 *
 * ## Method Access Guidance:
 * - **Core methods**: Available directly on `authClient` for common use cases
 * - **Plugin methods**: Use `_getClient()` to access plugin-specific functionality
 * - **New methods**: Better Auth updates add methods to the underlying client first
 * - **Type safety**: All methods maintain full TypeScript support
 *
 * ## Security Notes:
 * - Client is lazily initialized to prevent SSR issues
 * - Error logging excludes sensitive data
 * - All authentication requests use HTTPS in production
 *
 * @see https://better-auth.com/docs/concepts/client
 */
export const authClient = {
  // Core authentication methods
  get signIn() {
    return getAuthClient().signIn
  },
  get signOut() {
    return getAuthClient().signOut
  },
  get signUp() {
    return getAuthClient().signUp
  },

  // Session management
  get getSession() {
    return getAuthClient().getSession
  },

  // User management
  get updateUser() {
    return getAuthClient().updateUser
  },
  get deleteUser() {
    return getAuthClient().deleteUser
  },

  // Password management
  get changePassword() {
    return getAuthClient().changePassword
  },
  get forgetPassword() {
    return getAuthClient().forgetPassword
  },
  get resetPassword() {
    return getAuthClient().resetPassword
  },

  /**
   * Get the underlying Better Auth client instance.
   *
   * Use this method to access any Better Auth client methods that aren't
   * explicitly exported above. This is particularly useful when Better Auth
   * adds new methods or when you need to access plugin-specific methods.
   *
   * @example
   * ```typescript
   * const client = authClient._getClient()
   * const result = await client.someNewMethod()
   * ```
   *
   * @returns The complete Better Auth client instance
   */
  _getClient() {
    return getAuthClient()
  },
}

export type { Session } from './better-auth'
export type { User } from './better-auth'
