import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, better_auth_users } from './schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool);

// Enhanced user mapping with caching and bidirectional support
const userMappingCache = new Map<string, string>();

export async function mapBetterAuthUserToOriginalUser(betterAuthUserId: string): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = `ba_to_orig_${betterAuthUserId}`;
    if (userMappingCache.has(cacheKey)) {
      return userMappingCache.get(cacheKey)!;
    }

    // First get the email from Better Auth user
    const betterAuthUser = await db
      .select({ email: better_auth_users.email })
      .from(better_auth_users)
      .where(eq(better_auth_users.id, betterAuthUserId))
      .limit(1);

    if (!betterAuthUser.length) {
      return null;
    }

    // Find the original user by email
    const originalUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, betterAuthUser[0].email))
      .limit(1);

    const result = originalUser.length ? originalUser[0].id : null;
    
    // Cache the result
    if (result) {
      userMappingCache.set(cacheKey, result);
      userMappingCache.set(`orig_to_ba_${result}`, betterAuthUserId);
    }

    return result;
  } catch (error) {
    console.error('Error mapping Better Auth user to original user:', error);
    return null;
  }
}

export async function mapOriginalUserToBetterAuthUser(originalUserId: string): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = `orig_to_ba_${originalUserId}`;
    if (userMappingCache.has(cacheKey)) {
      return userMappingCache.get(cacheKey)!;
    }

    // First get the email from original user
    const originalUser = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, originalUserId))
      .limit(1);

    if (!originalUser.length) {
      return null;
    }

    // Find the Better Auth user by email
    const betterAuthUser = await db
      .select({ id: better_auth_users.id })
      .from(better_auth_users)
      .where(eq(better_auth_users.email, originalUser[0].email))
      .limit(1);

    const result = betterAuthUser.length ? betterAuthUser[0].id : null;
    
    // Cache the result
    if (result) {
      userMappingCache.set(cacheKey, result);
      userMappingCache.set(`ba_to_orig_${result}`, originalUserId);
    }

    return result;
  } catch (error) {
    console.error('Error mapping original user to Better Auth user:', error);
    return null;
  }
}

// Enhanced function to handle both UUID and text ID formats
export async function resolveUserId(userId: string): Promise<{ originalId: string; betterAuthId: string } | null> {
  try {
    // Check if this looks like a UUID (36 characters with dashes)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    if (isUUID) {
      // This is likely an original UUID - map to Better Auth
      const betterAuthId = await mapOriginalUserToBetterAuthUser(userId);
      if (betterAuthId) {
        return { originalId: userId, betterAuthId };
      }
    } else {
      // This is likely a Better Auth ID - map to original UUID
      const originalId = await mapBetterAuthUserToOriginalUser(userId);
      if (originalId) {
        return { originalId, betterAuthId: userId };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving user ID:', error);
    return null;
  }
}

// Utility function to determine if an ID is a Better Auth ID format
export function isBetterAuthId(id: string): boolean {
  // Better Auth IDs are typically 32 characters of alphanumeric characters
  return id.length === 32 && /^[a-zA-Z0-9]+$/.test(id);
}

// Utility function to determine if an ID is a UUID format
export function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}