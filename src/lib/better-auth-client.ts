import { createAuthClient } from 'better-auth/client'

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

    // For Vercel deployments, omit baseURL to use same-domain default
    // Better Auth automatically uses window.location.origin + '/api/auth'
    _authClient = createAuthClient({
      // baseURL is omitted - Better Auth will use current domain + /api/auth
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

// Replace Proxy pattern with explicit lazy-loaded methods for better performance
// Only export methods that are commonly used to avoid TypeScript errors
export const authClient = {
  get signIn() { return getAuthClient().signIn },
  get signOut() { return getAuthClient().signOut },
  get signUp() { return getAuthClient().signUp },
  get getSession() { return getAuthClient().getSession },
  get updateUser() { return getAuthClient().updateUser },
  get changePassword() { return getAuthClient().changePassword },
  get forgetPassword() { return getAuthClient().forgetPassword },
  get resetPassword() { return getAuthClient().resetPassword },
  get verifyEmail() { return getAuthClient().verifyEmail },
  
  // Fallback for any other methods not explicitly listed
  _getClient() { return getAuthClient() }
}

export type { Session, User }
