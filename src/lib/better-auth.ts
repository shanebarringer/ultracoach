import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { better_auth_users, better_auth_accounts, better_auth_sessions, better_auth_verification_tokens } from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for Better Auth');
}

// Create a dedicated database connection for Better Auth with optimized settings
const betterAuthPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // Increased pool size for Better Auth
  min: 2, // Keep more connections alive
  idleTimeoutMillis: 120000, // 2 minutes idle timeout
  connectionTimeoutMillis: 30000, // 30 seconds connection timeout for Supabase
  acquireTimeoutMillis: 30000, // 30 seconds acquire timeout
  statement_timeout: 30000, // 30 seconds statement timeout
});

const betterAuthDb = drizzle(betterAuthPool);

export const auth = betterAuth({
  database: drizzleAdapter(betterAuthDb, {
    provider: "pg",
    schema: {
      user: better_auth_users,
      account: better_auth_accounts,
      session: better_auth_sessions,
      verification: better_auth_verification_tokens,
    },
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET!,
  
  session: {
    maxAge: 14 * 24 * 60 * 60, // 14 days
    freshAge: 60 * 60, // 1 hour
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disabled for development - enable for production
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "runner",
        input: true,
        output: true,
      },
      fullName: {
        type: "string",
        required: false,
        input: true,
        output: true,
      },
    },
  },

  plugins: [
    nextCookies(), // This must be the last plugin
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user & {
  role: "runner" | "coach";
  fullName?: string | null;
};

// Type definitions for the application
declare module "better-auth" {
  interface UserAdditionalFields {
    role: "runner" | "coach";
    full_name?: string;
  }
}