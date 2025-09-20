# UltraCoach Database Patterns

## Database Architecture

### Technology Stack

- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **ORM**: Drizzle ORM with TypeScript integration
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Connection pooling with environment-aware configuration

## Database Connection Patterns

### CRITICAL: Use Proper Database Scripts

**NEVER connect directly as local user!** Always use the configured scripts:

```bash
# Local database operations
pnpm db:connect           # Connect to local database
pnpm db:query "SQL"       # Execute query on local database
pnpm db:generate          # Generate migrations
pnpm db:push              # Push schema changes (uses --force)
pnpm db:migrate           # Apply migrations
pnpm db:studio            # Open Drizzle Studio
pnpm db:seed              # Seed database with test data
pnpm db:fresh             # Reset and seed database

# Production database operations
pnpm prod:db:query "SQL"  # Execute query on production database
```

### Environment Configuration

- Local development: Uses `.env.local` with Supabase local instance
- Production: Uses `.env.production` with proper database password
- Test environment: Isolated test database for CI/CD

## Better Auth Schema Requirements

### CRITICAL Better Auth Fields

- **Session table**: MUST have both `id` (primary key) AND `token` (unique) fields
- **User roles**: Store as `role: 'user'` (Better Auth standard)
- **Application roles**: Use `user_type` field for coach/runner differentiation
- **Password hashing**: NEVER use bcrypt - Better Auth has its own system

### Schema Pattern

```typescript
export const user = pgTable('better_auth_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: text('role').default('user').notNull(), // Better Auth standard
  userType: text('user_type').default('runner').notNull(), // App-specific
  // ... other fields
})

export const session = pgTable('better_auth_sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(), // CRITICAL: Both fields required
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  // ... other fields
})
```

## Query Patterns

### Authentication Queries

```typescript
// ✅ CORRECT - Use userType field for queries
.where(eq(user.userType, 'runner'))
.where(eq(user.userType, 'coach'))

// ❌ WRONG - Don't use role field for app logic
.where(eq(user.role, 'runner'))
```

### Row Level Security (RLS)

- All tables have RLS policies ensuring users can only access their data
- Coach-runner relationships enforced at database level
- API endpoints must include user authentication context

## Migration Management

### Drizzle Kit Workflow

```bash
# 1. Update schema in src/lib/schema.ts
# 2. Generate migration
pnpm db:generate

# 3. Review generated migration file
# 4. Apply migration
pnpm db:migrate

# For production
pnpm prod:db:generate
pnpm prod:db:migrate
```

### Migration Best Practices

- Always review generated migrations before applying
- Use transactions for complex schema changes
- Test migrations on staging before production
- Keep migration files in version control

## Data Seeding

### Development Seeding

```bash
# Create comprehensive test data
pnpm db:seed

# Reset and reseed database
pnpm db:fresh

# Secure seeding with Better Auth
pnpm db:seed:secure
```

### Production Seeding

```bash
# Seed production with templates only
pnpm prod:db:seed

# CRITICAL: Use DATABASE_PASSWORD from .env.production
```

## Common Database Operations

### User Management

- Create users through Better Auth API (never direct SQL)
- Handle password hashing through Better Auth system
- Manage sessions with proper token generation

### Coach-Runner Relationships

- Use `coach_runners` table for relationship management
- Support bidirectional connections and invitations
- Implement proper status tracking (pending, active, inactive)

### Training Data

- Training plans linked to races with phase progression
- Workouts categorized by type and intensity
- Performance metrics integrated with Strava data

## Security Considerations

### Data Protection

- All sensitive data encrypted at rest
- Database connection strings in environment variables only
- No hardcoded credentials in codebase
- Proper input validation and parameterized queries

### Access Control

- RLS policies enforce user data isolation
- Coach access to assigned runners only
- API endpoints validate user permissions
- Session management with secure token handling

## Performance Optimization

### Query Optimization

- Use database indexes for frequently queried fields
- Implement proper pagination for large datasets
- Cache frequently accessed data where appropriate
- Monitor query performance with database tools

### Connection Management

- Use connection pooling for production
- Proper connection cleanup and error handling
- Environment-specific connection configuration
- Timeout handling for long-running operations
