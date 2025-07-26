# Database Schema Migration Plan: Better Auth IDs

## Overview

Migrate from hybrid authentication system to use Better Auth IDs directly throughout the database, eliminating the user mapping complexity.

## Current State

- **Primary Users Table**: `users` (text IDs, original UUIDs)
- **Better Auth Table**: `better_auth_users` (text IDs, Better Auth format)
- **Mapping System**: Runtime mapping between the two ID formats
- **Performance Impact**: Every request requires ID mapping lookup

## Target State

- **Single Users Table**: `better_auth_users` becomes the primary user table
- **Direct References**: All foreign keys reference `better_auth_users.id` directly
- **No Mapping**: Eliminate user mapping system entirely
- **Performance**: Direct ID usage, no mapping overhead

## Migration Steps

### Phase 1: Preparation & Backup

1. **Data Backup**
   - Export current user mappings
   - Backup all existing data
   - Create rollback scripts

2. **Schema Analysis**
   - Identify all tables with user ID foreign keys
   - Map data relationships
   - Plan migration sequence

### Phase 2: Schema Migration

1. **Update Schema File**
   - Change all `users.id` references to `better_auth_users.id`
   - Update foreign key constraints
   - Ensure data types match (text to text)

2. **Tables to Update**
   - `training_plans`: coach_id, runner_id
   - `messages`: sender_id, recipient_id
   - `notifications`: user_id
   - `conversations`: coach_id, runner_id
   - Any other tables with user references

### Phase 3: Data Migration

1. **User Data Consolidation**
   - Migrate essential user data from `users` to `better_auth_users`
   - Update all foreign key references
   - Ensure data integrity

2. **Reference Updates**
   - Update training_plans with Better Auth IDs
   - Update messages with Better Auth IDs
   - Update notifications with Better Auth IDs
   - Update conversations with Better Auth IDs

### Phase 4: Code Updates

1. **Remove Mapping System**
   - Delete `src/lib/user-mapping.ts`
   - Update `src/lib/server-auth.ts`
   - Remove mapping from all API routes

2. **Update Authentication**
   - Use Better Auth IDs directly in all API calls
   - Update session handling
   - Remove UUID conversion logic

3. **Update Components**
   - Remove ID mapping from frontend components
   - Update type definitions
   - Test all authentication flows

### Phase 5: Cleanup

1. **Remove Old System**
   - Drop `users` table
   - Remove mapping-related code
   - Update documentation

2. **Testing & Validation**
   - Test all authentication flows
   - Verify data integrity
   - Performance testing

## Risk Mitigation

- **Rollback Plan**: Complete backup and rollback scripts
- **Testing**: Comprehensive testing in development environment
- **Staging**: Deploy to staging environment first
- **Monitoring**: Monitor for issues during migration

## Benefits

- **Simplified Architecture**: Single source of truth for users
- **Improved Performance**: No mapping overhead
- **Better Maintainability**: Less complex codebase
- **Future-Proof**: Clean foundation for future development

## Timeline

- **Phase 1**: 1-2 hours (Preparation)
- **Phase 2**: 2-3 hours (Schema Migration)
- **Phase 3**: 2-3 hours (Data Migration)
- **Phase 4**: 3-4 hours (Code Updates)
- **Phase 5**: 1-2 hours (Cleanup)

**Total Estimated Time**: 8-12 hours
