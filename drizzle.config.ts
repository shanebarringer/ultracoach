import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/schema.ts',
  out: './supabase/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: {
      rejectUnauthorized: false
    }
  },
  verbose: true,
  strict: true,
});
