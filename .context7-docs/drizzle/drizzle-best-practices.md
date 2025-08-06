# Drizzle ORM Best Practices for UltraCoach

## Migration Strategies

### 1. Code-First vs Database-First Approaches

**Code-First (Recommended for UltraCoach):**

- Use `drizzle-kit push` for rapid development and schema changes
- Schema changes are made in TypeScript first, then pushed to database
- Ideal for rapid prototyping and local development

**Database-First:**

- Use `drizzle-kit pull` to sync schema from existing database
- Use `drizzle-kit generate` + `drizzle-kit migrate` for production migrations

### 2. Schema Change Best Practices

**For Development (UltraCoach Current Use):**

```bash
# Make schema changes in src/lib/schema.ts
# Then push directly to database
pnpm drizzle-kit push
```

**For Production Migration Management:**

```bash
# Generate migration files
pnpm drizzle-kit generate --name="make_training_plan_id_nullable"
# Apply migrations
pnpm drizzle-kit migrate
```

### 3. Schema Definition Best Practices

**Nullable Foreign Keys Pattern:**

```typescript
// ✅ GOOD - Allows optional relationships
training_plan_id: uuid('training_plan_id')
  .references(() => training_plans.id, { onDelete: 'cascade' }),

// ❌ BAD - Forces required relationship
training_plan_id: uuid('training_plan_id')
  .notNull()
  .references(() => training_plans.id, { onDelete: 'cascade' }),
```

**Performance Indexes:**

```typescript
// Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_training_plan_id ON workouts(training_plan_id) WHERE training_plan_id IS NOT NULL;
```

### 4. Configuration Best Practices

**drizzle.config.ts Pattern:**

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
})
```

### 5. Migration Workflow for UltraCoach

**Development Workflow:**

1. Update schema in `src/lib/schema.ts`
2. Run `pnpm drizzle-kit push` to apply changes
3. Test functionality
4. Commit schema changes

**Production Workflow:**

1. Generate migration: `pnpm drizzle-kit generate`
2. Review generated SQL
3. Apply migration: `pnpm drizzle-kit migrate`
4. Deploy application

### 6. Common Patterns

**Relationship Management:**

```typescript
// Optional relationships (like workouts -> training_plans)
training_plan_id: uuid('training_plan_id')
  .references(() => training_plans.id, { onDelete: 'cascade' }),

// Required relationships (like training_plans -> users)
coach_id: text('coach_id')
  .notNull()
  .references(() => user.id, { onDelete: 'cascade' }),
```

**Timestamps and Defaults:**

```typescript
created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
```

## UltraCoach-Specific Patterns

### Schema Issues Fixed:

1. **Nullable training_plan_id**: Allows workouts to exist independently
2. **Proper indexing**: Performance optimization for date-based queries
3. **Cascade deletes**: Proper cleanup of related data

### Database Seeding Strategy:

- Use separate scripts for local vs production seeding
- Include comprehensive test data for all relationship types
- Maintain referential integrity during seeding

## Command Reference

```bash
# Development (Direct Push)
pnpm drizzle-kit push

# Production (Managed Migrations)
pnpm drizzle-kit generate --name="description"
pnpm drizzle-kit migrate

# Inspection
pnpm drizzle-kit introspect  # Pull schema from database
pnpm drizzle-kit studio     # Visual database explorer

# Database Management
pnmp db:seed                # Seed with test data
pnpm db:fresh               # Reset and reseed
pnpm db:query "SQL"         # Execute raw SQL
```

## Error Prevention

1. **Always test schema changes locally first**
2. **Use transactions for complex migrations**
3. **Backup production data before schema changes**
4. **Validate foreign key relationships after changes**
5. **Monitor query performance after adding indexes**

## Performance Considerations

- Add indexes for frequently queried columns
- Use partial indexes for nullable foreign keys
- Consider composite indexes for multi-column queries
- Monitor query execution plans after schema changes
