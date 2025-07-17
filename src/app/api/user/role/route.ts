import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { better_auth_users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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

    // Database now uses Better Auth IDs directly - only query better_auth_users table
    const betterAuthUser = await db
      .select({ role: better_auth_users.role })
      .from(better_auth_users)
      .where(eq(better_auth_users.id, userId))
      .limit(1);

    if (!betterAuthUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = betterAuthUser[0].role || 'runner';
    return NextResponse.json({ role: userRole });
  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}