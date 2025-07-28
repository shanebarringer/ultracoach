import { createAuthClient } from 'better-auth/client'

import type { Session, User } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('better-auth-client')

// Lazy initialization to prevent issues during SSR/build
let _authClient: ReturnType<typeof createAuthClient> | null = null

function getAuthClient() {
  if (!_authClient) {
    _authClient = createAuthClient({
      baseURL: '/api/auth',
      fetchOptions: {
        onError(context) {
          logger.error('Better Auth client error:', {
            error: context.error,
            response: context.response,
            status: context.response?.status,
            url: context.request?.url,
          })
        },
        onSuccess(context) {
          logger.debug('Better Auth client success:', {
            url: context.request?.url,
            status: context.response?.status,
          })
        },
      },
    })
  }
  return _authClient
}

export const authClient = new Proxy({} as ReturnType<typeof createAuthClient>, {
  get(target, prop) {
    return getAuthClient()[prop as keyof ReturnType<typeof createAuthClient>]
  }
})

export type { Session, User }
