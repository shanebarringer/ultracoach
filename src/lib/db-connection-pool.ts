/**
 * Database Connection Pooling for Enhanced Performance
 *
 * This module provides connection pooling and caching for Supabase clients
 * to reduce the overhead of creating new clients for each request.
 */
import { SupabaseClient, createClient } from '@supabase/supabase-js'

import { createLogger } from '@/lib/logger'

const logger = createLogger('db-connection-pool')

// Connection pool configuration
const POOL_CONFIG = {
  maxConnections: 10,
  idleTimeoutMs: 30000, // 30 seconds
  maxLifetimeMs: 300000, // 5 minutes
  connectionCheckIntervalMs: 10000, // 10 seconds
}

interface PooledConnection {
  client: SupabaseClient
  createdAt: number
  lastUsed: number
  inUse: boolean
  userId?: string
}

class SupabaseConnectionPool {
  private connections: Map<string, PooledConnection> = new Map()
  private cleanupInterval?: NodeJS.Timeout
  private stats = {
    totalCreated: 0,
    totalReused: 0,
    totalCleaned: 0,
  }

  constructor() {
    this.startCleanupInterval()
  }

  /**
   * Get a pooled connection for a specific user context
   * Reuses existing connections when possible
   */
  async getConnection(userId?: string, useServiceRole = false): Promise<SupabaseClient> {
    const connectionKey = this.getConnectionKey(userId, useServiceRole)
    const existing = this.connections.get(connectionKey)

    // Reuse existing connection if available and not expired
    if (existing && !this.isExpired(existing) && !existing.inUse) {
      existing.lastUsed = Date.now()
      existing.inUse = true
      this.stats.totalReused++

      logger.debug('Reusing pooled connection', {
        connectionKey,
        age: Date.now() - existing.createdAt,
      })

      return existing.client
    }

    // Create new connection if pool has space
    if (this.connections.size < POOL_CONFIG.maxConnections) {
      const client = this.createNewClient(useServiceRole)
      const connection: PooledConnection = {
        client,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        inUse: true,
        userId,
      }

      this.connections.set(connectionKey, connection)
      this.stats.totalCreated++

      logger.debug('Created new pooled connection', {
        connectionKey,
        poolSize: this.connections.size,
      })

      return client
    }

    // Pool is full, find least recently used connection to replace
    const lruKey = this.findLeastRecentlyUsed()
    if (lruKey) {
      this.connections.delete(lruKey)
      this.stats.totalCleaned++
    }

    // Create new connection
    const client = this.createNewClient(useServiceRole)
    const connection: PooledConnection = {
      client,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: true,
      userId,
    }

    this.connections.set(connectionKey, connection)
    this.stats.totalCreated++

    logger.debug('Replaced LRU connection', {
      connectionKey,
      replacedKey: lruKey,
    })

    return client
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(client: SupabaseClient, userId?: string, useServiceRole = false): void {
    const connectionKey = this.getConnectionKey(userId, useServiceRole)
    const connection = this.connections.get(connectionKey)

    if (connection && connection.client === client) {
      connection.inUse = false
      connection.lastUsed = Date.now()

      logger.debug('Released connection to pool', { connectionKey })
    }
  }

  /**
   * Execute an operation with a pooled connection
   * Automatically manages connection lifecycle
   */
  async withPooledConnection<T>(
    operation: (client: SupabaseClient) => Promise<T>,
    userId?: string,
    useServiceRole = false
  ): Promise<T> {
    const client = await this.getConnection(userId, useServiceRole)

    try {
      return await operation(client)
    } finally {
      this.releaseConnection(client, userId, useServiceRole)
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getStats() {
    const activeConnections = Array.from(this.connections.values()).filter(
      conn => conn.inUse
    ).length

    const totalConnections = this.connections.size

    return {
      ...this.stats,
      activeConnections,
      totalConnections,
      poolUtilization: totalConnections / POOL_CONFIG.maxConnections,
      hitRate: this.stats.totalReused / (this.stats.totalReused + this.stats.totalCreated),
    }
  }

  /**
   * Clean up expired connections
   */
  private cleanup(): void {
    const beforeCount = this.connections.size

    for (const [key, connection] of this.connections.entries()) {
      if (this.isExpired(connection) && !connection.inUse) {
        this.connections.delete(key)
        this.stats.totalCleaned++
      }
    }

    const cleaned = beforeCount - this.connections.size
    if (cleaned > 0) {
      logger.debug('Cleaned up expired connections', {
        cleaned,
        remaining: this.connections.size,
      })
    }
  }

  private createNewClient(useServiceRole: boolean): SupabaseClient {
    if (useServiceRole) {
      return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  private getConnectionKey(userId?: string, useServiceRole = false): string {
    return `${useServiceRole ? 'service' : 'anon'}-${userId || 'anonymous'}`
  }

  private isExpired(connection: PooledConnection): boolean {
    const now = Date.now()
    const isIdle = now - connection.lastUsed > POOL_CONFIG.idleTimeoutMs
    const isOld = now - connection.createdAt > POOL_CONFIG.maxLifetimeMs

    return isIdle || isOld
  }

  private findLeastRecentlyUsed(): string | null {
    let lruKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, connection] of this.connections.entries()) {
      if (!connection.inUse && connection.lastUsed < oldestTime) {
        oldestTime = connection.lastUsed
        lruKey = key
      }
    }

    return lruKey
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, POOL_CONFIG.connectionCheckIntervalMs)
  }

  /**
   * Graceful shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.connections.clear()
    logger.info('Connection pool destroyed')
  }
}

// Global connection pool instance
const connectionPool = new SupabaseConnectionPool()

// Export pool methods
export const {
  getConnection,
  releaseConnection,
  withPooledConnection,
  getStats: getPoolStats,
} = connectionPool

/**
 * Enhanced db-context integration with connection pooling
 */
export async function createPooledSupabaseClient(userId?: string, useServiceRole = false) {
  return getConnection(userId, useServiceRole)
}

export async function withPooledSupabaseClient<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  userId?: string,
  useServiceRole = false
): Promise<T> {
  return withPooledConnection(operation, userId, useServiceRole)
}

// Graceful shutdown on process termination
process.on('SIGTERM', () => connectionPool.destroy())
process.on('SIGINT', () => connectionPool.destroy())

/**
 * Usage examples:
 *
 * ```typescript
 * // Basic usage
 * const client = await createPooledSupabaseClient(userId);
 * const { data } = await client.from('training_plans').select('*');
 * releaseConnection(client, userId);
 *
 * // Automatic lifecycle management (recommended)
 * const result = await withPooledSupabaseClient(
 *   async (client) => {
 *     return client.from('training_plans').select('*');
 *   },
 *   userId
 * );
 *
 * // Monitor pool performance
 * const stats = getPoolStats();
 * console.log('Pool hit rate:', stats.hitRate);
 * ```
 *
 * PERFORMANCE BENEFITS:
 * 1. Reduced connection overhead (reuse existing clients)
 * 2. Better resource utilization (connection limits)
 * 3. Automatic cleanup (expired connections)
 * 4. Performance monitoring (hit rates, utilization)
 * 5. Graceful resource management
 */
