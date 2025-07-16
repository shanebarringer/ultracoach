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

export async function mapBetterAuthUserToOriginalUser(betterAuthUserId: string): Promise<string | null> {
  try {
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

    return originalUser.length ? originalUser[0].id : null;
  } catch (error) {
    console.error('Error mapping Better Auth user to original user:', error);
    return null;
  }
}

export async function mapOriginalUserToBetterAuthUser(originalUserId: string): Promise<string | null> {
  try {
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

    return betterAuthUser.length ? betterAuthUser[0].id : null;
  } catch (error) {
    console.error('Error mapping original user to Better Auth user:', error);
    return null;
  }
}