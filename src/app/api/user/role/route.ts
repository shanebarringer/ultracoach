import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, better_auth_users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { resolveUserId, isBetterAuthId, isUUID } from '@/lib/user-mapping';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let userRole: string | null = null;

    // Handle different ID formats
    if (isBetterAuthId(userId)) {
      // This is a Better Auth ID - get role from Better Auth users table
      const betterAuthUser = await db
        .select({ role: better_auth_users.role })
        .from(better_auth_users)
        .where(eq(better_auth_users.id, userId))
        .limit(1);

      if (betterAuthUser.length) {
        userRole = betterAuthUser[0].role || 'runner';
      }
    } else if (isUUID(userId)) {
      // This is a UUID - get role from original users table
      const originalUser = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (originalUser.length) {
        userRole = originalUser[0].role;
      }
    } else {
      // Try to resolve the user ID through mapping
      const resolvedUser = await resolveUserId(userId);
      if (resolvedUser) {
        // Get role from Better Auth users table using the resolved Better Auth ID
        const betterAuthUser = await db
          .select({ role: better_auth_users.role })
          .from(better_auth_users)
          .where(eq(better_auth_users.id, resolvedUser.betterAuthId))
          .limit(1);

        if (betterAuthUser.length) {
          userRole = betterAuthUser[0].role || 'runner';
        }
      }
    }

    if (!userRole) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ role: userRole });
  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}