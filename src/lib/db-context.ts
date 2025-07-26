/**
 * Database Context Management for Better Auth + Supabase RLS
 *
 * This module provides utilities to set the current user context
 * for Row Level Security policies in Supabase when using Better Auth.
 */
import { createClient } from '@supabase/supabase-js'

import { auth } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('db-context')

// Create a Supabase client with service role for setting context
const supabaseService = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Set the current user context in the database session
 * This allows RLS policies to work with Better Auth
 */
export async function setDatabaseUserContext(userId: string): Promise<void> {
  try {
    const { error } = await supabaseService.rpc('set_config', {
      setting_name: 'app.current_user_id',
      new_value: userId,
      is_local: true,
    })

    if (error) {
      logger.error('Failed to set database user context:', {
        userId,
        error: error.message,
      })
      throw error
    }

    logger.debug('Database user context set successfully', { userId })
  } catch (err) {
    logger.error('Error setting database user context:', {
      userId,
      error: err,
    })
    throw err
  }
}

/**
 * Clear the current user context from the database session
 */
export async function clearDatabaseUserContext(): Promise<void> {
  try {
    const { error } = await supabaseService.rpc('set_config', {
      setting_name: 'app.current_user_id',
      new_value: '',
      is_local: true,
    })

    if (error) {
      logger.error('Failed to clear database user context:', {
        error: error.message,
      })
      throw error
    }

    logger.debug('Database user context cleared successfully')
  } catch (err) {
    logger.error('Error clearing database user context:', {
      error: err,
    })
    throw err
  }
}

/**
 * Execute a database operation with user context
 * Automatically sets and clears the user context
 */
export async function withUserContext<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  try {
    await setDatabaseUserContext(userId)
    const result = await operation()
    return result
  } finally {
    // Always clear context, even if operation fails
    try {
      await clearDatabaseUserContext()
    } catch (clearError) {
      logger.warn('Failed to clear user context after operation:', {
        clearError,
      })
    }
  }
}

/**
 * Get the current user from Better Auth session
 * Returns null if no valid session
 */
export async function getCurrentUser(
  headers?: Headers
): Promise<{ id: string; email: string } | null> {
  try {
    if (!headers) {
      logger.debug('No headers provided, cannot get current user')
      return null
    }

    const session = await auth.api.getSession({
      headers: headers,
    })

    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
    }
  } catch (error) {
    logger.debug('No valid session found:', { error })
    return null
  }
}

/**
 * Create a Supabase client configured for the current user
 * This client will have the user context automatically set
 */
export async function createUserSupabaseClient(userId?: string, headers?: Headers) {
  const effectiveUserId = userId || (await getCurrentUser(headers))?.id

  if (!effectiveUserId) {
    logger.warn('No user ID available for Supabase client')
    return supabaseService // Return service client as fallback
  }

  // Create client with user context
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Set user context for this client's requests
  await setDatabaseUserContext(effectiveUserId)

  return client
}

/**
 * Middleware helper to set database context from Better Auth session
 * Use this in API routes to ensure RLS policies work correctly
 */
export async function setContextFromSession(request: Request): Promise<string | null> {
  try {
    // Extract session from Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (session?.user?.id) {
      await setDatabaseUserContext(session.user.id)
      return session.user.id
    }

    return null
  } catch (error) {
    logger.debug('Failed to set context from session:', { error })
    return null
  }
}

/**
 * PostgreSQL function to support setting configuration
 * This should be created in the database to support the RPC calls above
 */
export const SET_CONFIG_FUNCTION_SQL = `
CREATE OR REPLACE FUNCTION set_config(
  setting_name text,
  new_value text,
  is_local boolean DEFAULT false
) RETURNS text AS $$
BEGIN
  PERFORM set_config(setting_name, new_value, is_local);
  RETURN new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

/**
 * Example usage in API routes:
 *
 * ```typescript
 * import { setContextFromSession } from '@/lib/db-context';
 * import { supabase } from '@/lib/supabase';
 *
 * export async function GET(request: Request) {
 *   // Set database user context from Better Auth session
 *   const userId = await setContextFromSession(request);
 *
 *   if (!userId) {
 *     return Response.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *
 *   // Now RLS policies will work correctly
 *   const { data, error } = await supabase
 *     .from('training_plans')
 *     .select('*');
 *
 *   return Response.json({ data, error });
 * }
 * ```
 */
