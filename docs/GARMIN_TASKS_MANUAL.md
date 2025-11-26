# Garmin Integration - Manual Task Creation Guide

## Epic: ULT-16

**Title**: Garmin Connect IQ Integration

**Description**:
Develop UltraCoach companion app for Garmin devices using Connect IQ SDK and Training API.

**Goal**: Enable seamless workout sync between UltraCoach training plans and Garmin devices.

**Scope**:

- Phase 1: Garmin Training API integration (calendar sync)
- OAuth connection management
- Workout format conversion
- Automatic daily sync via cron
- Activity import from Garmin

**Timeline**: 3-4 weeks

**Labels**: integration, garmin, high-priority
**Estimate**: 0 (Epic)
**Priority**: High

---

## Task 1: Garmin Developer Setup

**Title**: Garmin Developer Setup & Environment Configuration

**Description**:
Enroll in Garmin Developer Program and configure OAuth application credentials.

**Acceptance Criteria**:

- [ ] Garmin Developer account created
- [ ] OAuth application registered
- [ ] Environment variables configured (.env.local and Vercel)
- [ ] API credentials tested

**Environment Variables**:

```
GARMIN_CLIENT_ID
GARMIN_CLIENT_SECRET
GARMIN_REDIRECT_URI
GARMIN_ENCRYPTION_KEY
GARMIN_API_BASE_URL
```

**Labels**: integration, garmin, backend, high-priority
**Estimate**: 4 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 2: Database Schema Migration

**Title**: Database Schema Migration for Garmin Tables

**Description**:
Create database migration for Garmin connection tracking and sync status.

**Status**: ✅ Migration file already created

**Acceptance Criteria**:

- [x] Migration file created: 20250112_add_garmin_integration.sql
- [x] Tables created: garmin_connections, garmin_workout_syncs, garmin_devices
- [ ] Foreign key constraints to better_auth_users and workouts
- [ ] Row Level Security (RLS) policies implemented
- [ ] Indexes created for performance
- [ ] Migration applied and tested
- [ ] Schema types generated with Drizzle

**Labels**: integration, garmin, backend, high-priority
**Estimate**: 6 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 3: OAuth Flow Implementation

**Title**: OAuth Flow Implementation

**Description**:
Implement Garmin OAuth 2.0 authentication with secure token storage.

**Acceptance Criteria**:

- [ ] OAuth connect endpoint: POST /api/garmin/connect
- [ ] OAuth callback handler: GET /api/garmin/callback
- [ ] Disconnect endpoint: DELETE /api/garmin/disconnect
- [ ] Status check endpoint: GET /api/garmin/status
- [ ] Tokens encrypted using pgcrypto
- [ ] Token refresh logic implemented
- [ ] Error handling and logging
- [ ] Unit tests and E2E test for OAuth flow

**Dependencies**: Database migration must be complete

**Labels**: integration, garmin, backend, high-priority
**Estimate**: 12 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 4: Workout Format Converter

**Title**: Garmin Workout Format Converter Utility

**Description**:
Create utility to convert UltraCoach workout format to Garmin Training API JSON.

**Status**: ✅ Type definitions already created

**Acceptance Criteria**:

- [ ] Converter utility created: src/utils/garmin-workout-converter.ts
- [ ] Maps workout types to Garmin sport types
- [ ] Converts categories to Garmin step types
- [ ] Handles intervals, tempo, easy, long run workouts
- [ ] Validates output against Garmin API schema
- [ ] Comprehensive unit tests (95%+ coverage)
- [x] Type definitions for Garmin structures
- [ ] Documentation with examples

**Labels**: integration, garmin, backend, high-priority
**Estimate**: 10 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 5: Manual Workout Sync API

**Title**: Manual Workout Sync API Endpoint

**Description**:
Create API endpoint to manually sync workouts to Garmin Connect calendar.

**Acceptance Criteria**:

- [ ] Sync endpoint: POST /api/garmin/sync
- [ ] Supports single and bulk workout sync
- [ ] Creates sync tracking records
- [ ] Handles Garmin API errors gracefully
- [ ] Implements retry logic (3 attempts)
- [ ] Returns sync status and Garmin workout IDs
- [ ] Rate limiting to prevent abuse
- [ ] Unit and integration tests

**Dependencies**: OAuth and converter must be complete

**Labels**: integration, garmin, backend, high-priority
**Estimate**: 12 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 6: Garmin Activity Import

**Title**: Garmin Activity Import Implementation

**Description**:
Import completed activities from Garmin Connect to UltraCoach workouts.

**Acceptance Criteria**:

- [ ] Activities endpoint: GET /api/garmin/activities
- [ ] Import endpoint: POST /api/garmin/import
- [ ] Fetches activities from Garmin Training API
- [ ] Matches activities to workouts (date/type/distance)
- [ ] Updates workout with actual data
- [ ] Imports GPS track data (optional)
- [ ] Creates sync records with from_garmin direction
- [ ] Handles duplicate imports gracefully
- [ ] Confidence scoring for activity matching
- [ ] Unit and integration tests

**Dependencies**: Manual sync must be complete

**Labels**: integration, garmin, backend, high-priority
**Estimate**: 14 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 7: Automatic Sync Cron Job

**Title**: Automatic Sync Cron Job Setup

**Description**:
Set up Vercel cron job to automatically sync workouts daily.

**Acceptance Criteria**:

- [ ] Cron configuration added to vercel.json
- [ ] Cron endpoint: GET /api/cron/garmin-sync
- [ ] Runs daily at midnight UTC
- [ ] Syncs next 7 days of workouts for all connected users
- [ ] Skips already-synced workouts
- [ ] Updates modified workouts on Garmin
- [ ] Error notifications for failed syncs
- [ ] Structured logging for monitoring
- [ ] Protected by Vercel cron secret
- [ ] Tested in preview deployment

**Note**: Requires Vercel Pro plan

**Labels**: integration, garmin, backend, infrastructure
**Estimate**: 8 points
**Priority**: Medium
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 8: Settings - Garmin Connection Card

**Title**: Settings Page - Garmin Connection Card

**Description**:
Create UI component in Settings for Garmin connection management.

**Acceptance Criteria**:

- [ ] Component: src/components/settings/GarminConnectionCard.tsx
- [ ] Displays connection status (connected/disconnected)
- [ ] Shows connected Garmin user email
- [ ] Displays last sync timestamp
- [ ] Connect Garmin button (initiates OAuth)
- [ ] Disconnect button (with confirmation modal)
- [ ] Sync Now button (manual sync trigger)
- [ ] Loading states for all actions
- [ ] Error handling with toast notifications
- [ ] Mountain Peak design system styling
- [ ] Responsive design (mobile + desktop)
- [ ] Accessibility compliance (WCAG 2.1 AA)

**Pattern**: Follow StravaConnectionCard.tsx

**Labels**: integration, garmin, frontend, high-priority
**Estimate**: 10 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 9: Workout List - Garmin Sync

**Title**: Workout List - Garmin Sync Integration

**Description**:
Add Garmin sync status and actions to workout list views.

**Acceptance Criteria**:

- [ ] Sync status badge added to workout cards
- [ ] Sync to Garmin action button in workout detail
- [ ] Bulk sync action for weekly planner
- [ ] Sync status indicators (synced/pending/failed)
- [ ] Click badge to view sync details
- [ ] Loading states during sync
- [ ] Success/error toast notifications
- [ ] Responsive design
- [ ] Accessibility compliance

**Components**: WorkoutCard.tsx, WorkoutDetailModal.tsx, WeeklyPlannerCalendar.tsx

**Labels**: integration, garmin, frontend
**Estimate**: 8 points
**Priority**: Medium
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 10: Dashboard - Garmin Activity Widget

**Title**: Dashboard Widget - Garmin Activity Import

**Description**:
Create dashboard widget showing recent Garmin activities.

**Acceptance Criteria**:

- [ ] Widget: src/components/dashboard/GarminActivityWidget.tsx
- [ ] Displays 5 most recent activities from Garmin
- [ ] Shows activity details (date, type, distance, pace)
- [ ] Match confidence indicator for each activity
- [ ] Import button to import activity to workout
- [ ] View All link to activities page
- [ ] Loading skeleton during fetch
- [ ] Error state handling
- [ ] Mountain Peak styling
- [ ] Responsive design

**Labels**: integration, garmin, frontend
**Estimate**: 10 points
**Priority**: Medium
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 11: E2E Tests - OAuth Flow

**Title**: E2E Tests for Garmin OAuth Flow

**Description**:
Write Playwright E2E tests for complete OAuth workflow.

**Acceptance Criteria**:

- [ ] Test file: tests/garmin-oauth.spec.ts
- [ ] Test cases: OAuth connection, cancellation, token refresh, disconnect, reconnection
- [ ] Tests pass in CI/CD pipeline
- [ ] Mock Garmin OAuth for test stability
- [ ] Cleanup test data after each run
- [ ] Documentation for running tests

**Pattern**: Follow tests/auth.spec.ts

**Labels**: integration, garmin, testing, high-priority
**Estimate**: 8 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 12: E2E Tests - Workout Sync

**Title**: E2E Tests for Workout Sync

**Description**:
Write Playwright E2E tests for workout synchronization.

**Acceptance Criteria**:

- [ ] Test file: tests/garmin-sync.spec.ts
- [ ] Test cases: Single sync, bulk sync, status updates, failed syncs, re-sync
- [ ] Tests pass in CI/CD pipeline
- [ ] Mock Garmin Training API
- [ ] Verify database sync records
- [ ] Documentation

**Labels**: integration, garmin, testing, high-priority
**Estimate**: 10 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 13: E2E Tests - Activity Import

**Title**: E2E Tests for Activity Import

**Description**:
Write Playwright E2E tests for importing Garmin activities.

**Acceptance Criteria**:

- [ ] Test file: tests/garmin-import.spec.ts
- [ ] Test cases: Fetch activities, activity matching, import updates, duplicate prevention, unmatched handling
- [ ] Tests pass in CI/CD pipeline
- [ ] Mock Garmin API responses
- [ ] Verify workout data updates
- [ ] Documentation

**Labels**: integration, garmin, testing
**Estimate**: 10 points
**Priority**: Medium
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 14: Documentation

**Title**: Documentation and User Guide

**Description**:
Create comprehensive documentation for Garmin integration.

**Status**: ✅ Planning docs already created

**Acceptance Criteria**:

- [x] Developer documentation in .context7-docs/garmin-connect-iq/
- [ ] API documentation with examples
- [ ] User guide for connecting Garmin account
- [ ] Troubleshooting guide for common issues
- [ ] Screenshots of UI components
- [ ] FAQ section
- [ ] Update PLANNING.md with Garmin section

**Labels**: integration, garmin, documentation
**Estimate**: 6 points
**Priority**: Medium
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Task 15: Production Deployment

**Title**: Production Deployment and Monitoring

**Description**:
Deploy Garmin integration to production with monitoring.

**Acceptance Criteria**:

- [ ] Environment variables configured in Vercel production
- [ ] Database migration applied to production
- [ ] Vercel cron job enabled and tested
- [ ] Monitoring dashboard for sync success rates
- [ ] Error alerting (Sentry)
- [ ] Rate limiting configured
- [ ] Production smoke tests pass
- [ ] Rollback plan documented
- [ ] Post-deployment verification checklist

**Monitoring Metrics**: Garmin connections, sync success rate, API error rates, cron execution time

**Labels**: integration, garmin, infrastructure, high-priority
**Estimate**: 8 points
**Priority**: High
**Parent**: [EPIC] Garmin Connect IQ Integration

---

## Quick Creation Steps

1. Create the Epic first (Task 0)
2. Create each task (1-15) and set the Epic as parent
3. Add labels and estimates as you go
4. Set priorities (High/Medium)

**Total**: 1 Epic + 15 Tasks = 16 issues
**Total Estimate**: 116 points (~3-4 weeks)
