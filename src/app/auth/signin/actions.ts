'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('auth-signin-actions')

export interface SignInResult {
  success: boolean
  error?: string
  redirectUrl?: string
}

/**
 * Server action for email/password signin with automatic redirect
 * Uses Better Auth server-side API for proper cookie handling
 */
export async function signInAction(email: string, password: string): Promise<SignInResult> {
  try {
    logger.info('Server-side signin attempt', { email })

    // Get headers for Better Auth
    const headersList = await headers()

    // Attempt signin using Better Auth server API
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: headersList,
    })

    // Check for authentication errors
    if (!result || 'error' in result) {
      const error = result && 'error' in result ? result.error : null
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Authentication failed'

      logger.error('Signin failed', { email, error: errorMessage })

      return {
        success: false,
        error: errorMessage,
      }
    }

    // Extract user data from signin result
    // The session cookie has been set, but we use the returned user data
    // instead of calling getSession() again (cookie not visible in same request)
    const userData = result && 'user' in result ? result.user : null

    if (!userData) {
      logger.error('User data not returned after signin', { email })
      return {
        success: false,
        error: 'Authentication succeeded but user data unavailable',
      }
    }

    // Determine dashboard URL based on user type from signin result
    const userType = (userData as { userType?: string }).userType || 'runner'
    const dashboardUrl = userType === 'coach' ? '/dashboard/coach' : '/dashboard/runner'

    logger.info('✅ Signin successful, redirecting to dashboard', {
      email,
      userId: (userData as { id: string }).id,
      userType,
      dashboardUrl,
    })

    // Server-side redirect - this properly propagates cookies
    redirect(dashboardUrl)
  } catch (error) {
    // Handle redirect errors (redirect() throws to perform the redirect)
    if (error && typeof error === 'object' && 'digest' in error) {
      // This is a Next.js redirect, let it propagate
      throw error
    }

    logger.error('Signin exception', { email, error })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed. Please try again.',
    }
  }
}
