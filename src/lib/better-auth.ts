import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { nextCookies } from "better-auth/next-js";

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET!,
  
  session: {
    maxAge: 14 * 24 * 60 * 60, // 14 days
    freshAge: 60 * 60, // 1 hour
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true for production
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "runner",
      },
      full_name: {
        type: "string",
        required: false,
      },
    },
  },

  plugins: [
    nextCookies(), // This must be the last plugin
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// Type definitions for the application
declare module "better-auth" {
  interface UserAdditionalFields {
    role: "runner" | "coach";
    full_name?: string;
  }
}