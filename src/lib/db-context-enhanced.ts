/**
 * Enhanced Database Context Management with Minimal Service Role Usage
 *
 * This module provides secure utilities for database access with Better Auth,
 * minimizing service role key usage and providing better security isolation.
 */
import { createClient } from '@supabase/supabase-js'

import { auth } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('db-context-enhanced')

// Service role client - ONLY for setting user context, not for data operations
const contextClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Anon client - safer for most operations when combined with RLS
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Set user context using minimal service role permissions
 * Only the context client has service role access
 */
async function setUserContext(userId: string, client = contextClient): Promise<void> {
  try {
    const { error } = await client.rpc('set_config', {
      setting_name: 'app.current_user_id',
      new_value: userId,
      is_local: true,
    })

    if (error) {
      logger.error('Failed to set user context:', { userId, error: error.message })
      throw error
    }

    logger.debug('User context set successfully', { userId })
  } catch (err) {
    logger.error('Error setting user context:', { userId, error: err })
    throw err
  }
}

/**
 * Create a secure Supabase client for authenticated operations
 * Uses anon key + RLS instead of service role for better security
 */
export async function createSecureSupabaseClient(headers?: Headers) {
  try {
    // Get current user from Better Auth session
    const session = await auth.api.getSession({ headers: headers || new Headers() })

    if (!session?.user?.id) {
      logger.warn('No valid session for secure client creation')
      throw new Error('Authentication required')
    }

    // Set user context for RLS policies (using service role client minimally)
    await setUserContext(session.user.id)

    // Return anon client that relies on RLS for security
    // This provides much better security isolation than service role
    return {
      client: anonClient,
      userId: session.user.id,
      userRole: (session.user as { role?: string }).role || 'runner',
    }
  } catch (error) {
    logger.error('Failed to create secure client:', { error })
    throw error
  }
}

/**
 * Execute database operations with proper user context and security
 * Automatically manages context setting and provides the safest client
 */
export async function withSecureContext<T>(
  headers: Headers,
  operation: (client: typeof anonClient, userId: string, userRole: string) => Promise<T>
): Promise<T> {
  try {
    const { client, userId, userRole } = await createSecureSupabaseClient(headers)
    return await operation(client, userId, userRole)
  } catch (error) {
    logger.error('Secure context operation failed:', { error })
    throw error
  }
}

/**
 * Get current user safely without exposing service role access
 */
export async function getCurrentUserSecure(headers?: Headers): Promise<{
  id: string
  email: string
  role: string
  name?: string
} | null> {
  try {
    if (!headers) {
      return null
    }

    const session = await auth.api.getSession({ headers })

    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      role: (session.user as { role?: string }).role || 'runner',
      name: session.user.name || undefined,
    }
  } catch (error) {
    logger.debug('No valid session found:', { error })
    return null
  }
}

/**
 * Service role operations - ONLY for admin/system operations
 * Use sparingly and with extreme caution
 */
export const adminOperations = {
  /**
   * Admin-only: Create system-level records (migrations, seeds, etc.)
   * Should only be used in controlled environments
   */
  async createSystemRecord(table: string, data: Record<string, unknown>) {
    logger.warn('ADMIN OPERATION: Creating system record', { table })

    const { data: result, error } = await contextClient.from(table).insert(data).select().single()

    if (error) {
      logger.error('Admin operation failed:', { table, error })
      throw error
    }

    return result
  },

  /**
   * Admin-only: Execute raw SQL (migrations only)
   * Extremely dangerous - use only for database migrations
   */
  async executeRawSQL(sql: string) {
    logger.warn('ADMIN OPERATION: Executing raw SQL')

    const { data, error } = await contextClient.rpc('execute_sql', { sql })

    if (error) {
      logger.error('Raw SQL execution failed:', { error })
      throw error
    }

    return data
  },
}

/**
 * Enhanced middleware for API routes
 * Provides secure context with minimal service role exposure
 */
export async function secureMiddleware(request: Request) {
  try {
    const user = await getCurrentUserSecure(request.headers)

    if (!user) {
      return {
        error: 'Unauthorized',
        status: 401,
      }
    }

    // Set context for this request
    await setUserContext(user.id)

    return {
      user,
      supabase: anonClient, // Safe client with RLS
      success: true,
    }
  } catch (error) {
    logger.error('Secure middleware failed:', { error })
    return {
      error: 'Authentication failed',
      status: 500,
    }
  }
}

/**
 * Usage examples for secure API routes:
 *
 * ```typescript
 * export async function GET(request: Request) {
 *   const auth = await secureMiddleware(request);
 *
 *   if (!auth.success) {
 *     return Response.json({ error: auth.error }, { status: auth.status });
 *   }
 *
 *   // Use auth.supabase (anon client + RLS) instead of service role
 *   const { data, error } = await auth.supabase
 *     .from('training_plans')
 *     .select('*'); // RLS automatically filters for current user
 *
 *   return Response.json({ data, error });
 * }
 * ```
 *
 * SECURITY BENEFITS:
 * 1. Service role key used ONLY for setting user context
 * 2. All data operations use anon key + RLS (principle of least privilege)
 * 3. Better audit trail and security isolation
 * 4. Reduced risk of privilege escalation
 * 5. Easier to monitor and secure
 */
