# Drizzle + Supabase Best Practices

Based on Context7 documentation research (2025-08-03).

## Key Findings

### Migration Strategy

- **Use Drizzle for all database operations** - Context7 confirms this is the recommended approach
- **Migration Commands**:
  - `drizzle-kit generate` - Creates migration files
  - `drizzle-kit migrate` - Applies migrations to database
  - `drizzle-kit push` - Direct schema push (good for rapid prototyping)

### Best Practices

1. **Migration Directory**: Store migrations in `./supabase/migrations`
2. **Configuration**: Use `drizzle.config.ts` with proper dialect and credentials
3. **Connection**: Use connection pooling for serverless, direct connection for long-running servers
4. **Migration Prefixes**: Can use `prefix: 'supabase'` in config for better Supabase integration

### Recommended Workflow

1. Define schema in `schema.ts`
2. Generate migrations: `npx drizzle-kit generate`
3. Apply migrations: `npx drizzle-kit migrate`
4. For Supabase projects: `supabase db push` (optional)

### Configuration Example

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    prefix: 'supabase', // Optional: Better Supabase integration
  },
})
```

## Current Issue Resolution

The baseline migration has unclosed SQL comments causing parsing errors. Need to either:

1. Fix the baseline file SQL syntax
2. Or start fresh with clean migrations
