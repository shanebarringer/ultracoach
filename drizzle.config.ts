import * as dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load environment-specific config
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local'
dotenv.config({ path: envFile })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/schema.ts',
  out: './supabase/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  verbose: true,
  strict: true,
})
