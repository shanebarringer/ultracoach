# UltraCoach - Active Tasks & Future Milestones

## 📋 Current Status

- **Active Milestone**: Coach-Runner Relationship System 🔄 **IN PROGRESS**
- **Last Updated**: 2025-08-03
- **Current Focus**: Implementing bidirectional coach-runner relationships with proper Drizzle migrations and user discovery system
- **Recent Completion**: Email password reset implementation, 5 runners created for each coach with proper relationships established
- **Major Achievement**: Foundation for scalable coach-runner connection system with invitation workflows!

## 📊 Progress Overview

- **Next Phase**:
  1. ✅ ~~Fix Routing issues with Runners/Coaches on login~~ - **COMPLETED 2025-08-03**
  2. Email Password Reset implementation (use Resend free version or passwordless approach)
  3. Fix Playwright CI (currently failing on main)
  4. Fix Messaging Issues,
  5. Fix Notifications,
  6. Fix UI Issues,
  7. Add Monthly Calendar,
  8. UI enhancements,
     8A. Setup staging DB for Vercel Previews, and supporting commands for setup/teardown/seeding - so we're not using Prod data AND cleanup prod db:reset commands in package.json scripts (and bash scripts)
  9. Strava integration,
  10. Production monitoring,
  11. User feedback systems,
  12. Setup Playwright MCP Github action

_For complete milestone history, see [COMPLETED_MILESTONES.md](./COMPLETED_MILESTONES.md)_

---

## ✅ **Authentication & Routing Fixes Milestone (COMPLETED 2025-08-03)**

### Critical Issues Resolved

- [x] **Routing Loop Bug** - Fixed infinite redirect between runner/coach dashboards
  - Created unified `DashboardRouter` component with proper state management
  - Eliminated circular redirect logic that caused server crashes
  - Added graceful handling of invalid/missing user roles

- [x] **Better Auth Integration** - Fixed user role field mapping and session management
  - Added `customSession` plugin for proper role handling
  - Configured `customSessionClient` for TypeScript inference
  - Updated existing user roles from `'user'` to proper `'coach'/'runner'` values

- [x] **Database Seeding** - Replaced manual insertion with Better Auth sign-up API
  - Created `scripts/seed-users-better-auth.ts` using proper Better Auth flow
  - Automated `.env.local` credential updates during seeding
  - Stored Better Auth best practices in `.context7-docs/better-auth/`

### Files Modified

- `src/components/dashboard/DashboardRouter.tsx` (NEW)
- `src/app/dashboard/runner/page.tsx` (SIMPLIFIED)
- `src/app/dashboard/coach/page.tsx` (SIMPLIFIED)
- `src/lib/better-auth.ts` (Added customSession plugin)
- `src/lib/better-auth-client.ts` (Added customSessionClient)
- `scripts/seed-users-better-auth.ts` (NEW)
- `.context7-docs/better-auth/` (NEW documentation)
- `PLANNING.md` (Updated with auth architecture)
- `TASKS.md` (This file)

### Testing Results

✅ **No more routing loops** - Users can login and stay on appropriate dashboard  
✅ **Proper role-based access** - Coaches see coach features, runners see runner features  
✅ **Better Auth best practices** - Following official patterns for stability  
✅ **Reliable seeding** - Consistent test user creation with proper roles

---

## 🤝 **Coach-Runner Relationship System Milestone (IN PROGRESS 2025-08-03)**

### User Journey Implementation

- [ ] **Bidirectional Discovery System** - Both coaches and runners can browse and connect
  - [ ] Add `coach_runners` table with proper Drizzle migration
  - [ ] Create `/api/coaches/available` endpoint for runner discovery
  - [ ] Create `/api/runners/available` endpoint for coach discovery
  - [ ] Build `CoachSelector` component for runner use
  - [ ] Build `RunnerSelector` component for coach use

- [ ] **Invitation & Connection Flow** - Seamless relationship establishment
  - [ ] Create `/api/coach-runners` for relationship management
  - [ ] Create `/api/invitations` for invitation handling
  - [ ] Build `RelationshipInviteModal` component
  - [ ] Build `InviteUserModal` for email-based invitations
  - [ ] Implement notification system for invitations

- [ ] **Dashboard Integration** - Enhanced user experience
  - [ ] Update CoachDashboard with "Find Runners" functionality
  - [ ] Update RunnerDashboard with "Find a Coach" functionality
  - [ ] Add relationship status indicators
  - [ ] Create `CoachRunnerManagement` component

- [ ] **Migration from Supabase to Drizzle** - Improve consistency and type safety
  - [ ] Update existing `/api/coaches` route to use Drizzle ORM
  - [ ] Update existing `/api/runners` route to use Drizzle ORM
  - [ ] Add Drizzle migration scripts to package.json
  - [ ] Replace Supabase Admin queries with typed Drizzle queries

### Database Architecture

- **New Table**: `coach_runners` with relationship status tracking
- **Migration Strategy**: Use `drizzle-kit generate` and `supabase db push`
- **Type Safety**: Full TypeScript inference with Drizzle ORM
- **Relationship Types**: Standard, invited, pending with proper state management

---

## 🚀 Production Readiness Phase 3: Secure Environment Management (FUTURE PRIORITY)

### Production Monitoring & Analytics (FUTURE PRIORITY)

- [ ] **Error tracking setup** - Configure Sentry or similar for production error monitoring
- [ ] **Performance monitoring** - Add application performance monitoring (APM) with metrics collection
- [ ] **User analytics integration** - Track feature usage and user engagement patterns
- [ ] **Database performance monitoring** - Query performance and connection pool monitoring
- [ ] **Real-time monitoring dashboard** - Create admin dashboard for system health monitoring

### User Feedback Systems (FUTURE)

- [ ] **Feedback collection system** - In-app feedback forms and user survey capabilities
- [ ] **User testing infrastructure** - A/B testing framework and feature flag system (low priority)
- [ ] **Beta user program** - Controlled rollout system for new features
- [ ] **Support ticket system** - User support and issue tracking integration (low priority)
- [ ] **Usage analytics** - Detailed analytics on training plan usage and coach-runner interactions

---

## 🏃‍♂️ Milestone 12: Strava Integration & Data Sync (PLANNED)

**Status**: 📋 Planned | **Target**: 2025-07-26
**Goal**: Seamless integration with Strava for workout sync, performance tracking, and enhanced analytics

### Strava API Integration

- [ ] **Setup Strava OAuth** - Configure Strava API credentials and OAuth flow
- [ ] **User Authentication** - Connect UltraCoach accounts to Strava accounts
- [ ] **Activity Sync** - Sync completed workouts from Strava to UltraCoach
- [ ] **Automatic Workout Logging** - Convert Strava activities to UltraCoach workout completions

### Data Synchronization

- [ ] **Bi-directional Sync** - Sync planned workouts to Strava calendar
- [ ] **Performance Metrics** - Import pace, heart rate, elevation data from Strava
- [ ] **Route Integration** - Sync workout routes and GPS data
- [ ] **Real-time Updates** - Webhook integration for instant sync

### Enhanced Analytics

- [ ] **Training Load Analysis** - Combine UltraCoach planning with Strava execution data
- [ ] **Performance Trends** - Historical performance analysis across platforms
- [ ] **Coach Insights** - Give coaches access to actual vs planned workout data
- [ ] **Progress Tracking** - Enhanced progress visualization with real execution data

### User Experience

- [ ] **Seamless Integration** - One-click Strava connection in user settings
- [ ] **Conflict Resolution** - Handle discrepancies between planned and actual workouts
- [ ] **Privacy Controls** - User control over what data is shared and synced
- [ ] **Offline Mode** - Graceful handling when Strava is unavailable

### Testing & Validation

- [ ] **OAuth Flow Testing** - Test Strava authentication and authorization
- [ ] **Sync Reliability** - Test sync accuracy and error handling
- [ ] **Performance Impact** - Ensure sync doesn't impact app performance
- [ ] **Edge Cases** - Test with various Strava activity types and data formats

---

## 🚀 Advanced Features & Polish (FUTURE MILESTONES)

### Phase Progression System (PLANNED)

- [ ] **Phase transition management**
  - [ ] Automatic phase progression logic
  - [ ] Manual phase transition controls
  - [ ] Phase completion criteria
  - [ ] Phase transition notifications
- [ ] **Phase visualization**
  - [ ] Training phase timeline display
  - [ ] Progress indicators and milestones
  - [ ] Phase-specific metrics and targets
  - [ ] Historical phase progression tracking

### Plan Sequencing & Progression (PLANNED)

- [ ] **Multi-race planning**
  - [ ] Plan sequencing workflow (50K → 50M → 100K)
  - [ ] Automatic plan transitions
  - [ ] Bridge plan recommendations
  - [ ] Rest and recovery period management
- [ ] **Base building periods**
  - [ ] Off-season base building plans
  - [ ] Maintenance period management
  - [ ] Fitness level tracking between races
  - [ ] Return-to-training protocols

### Advanced Workout Features (PLANNED)

- [ ] **Workout intelligence**
  - [ ] Weather-based workout modifications
  - [ ] Terrain-specific recommendations
  - [ ] Recovery tracking and recommendations
  - [ ] Training load management
- [ ] **Workout planning tools**
  - [ ] Workout template system
  - [ ] Workout copying and modification

### Training Visualization (PLANNED)

- [ ] **Monthly calendar view** for training overview
- [ ] **Progress charts** and performance analytics
- [ ] **Training zone visualization** and trends
- [ ] **Race countdown** and timeline displays

### Advanced Features (PLANNED)

- [ ] **K-bar command palette** for power users
- [ ] **Dynamic plan adjustments** based on performance
- [ ] **Coach analytics** and runner performance insights

---

## 🔄 Task Management Process

### Daily Workflow

1. **Check TASKS.md** at start of work session
2. **Select highest priority pending task** from current milestone
3. **Update task status** to "in progress" when starting
4. **Mark task as completed** immediately upon completion
5. **Add newly discovered tasks** to appropriate milestone
6. **Update milestone status** when all tasks complete

### Task Status Legend

- [ ] **Pending**: Not yet started
- [x] **Completed**: Finished and verified
- 🔄 **In Progress**: Currently being worked on
- ⏸️ **Blocked**: Waiting for dependencies
- ❌ **Cancelled**: No longer needed

### Priority Levels

- **Critical**: Blocking other work or production issues
- **High**: Important for current milestone completion
- **Medium**: Should be completed in current milestone
- **Low**: Nice to have, can be deferred

### Task Categories

- **Feature**: New functionality implementation
- **Bug**: Issue fix or correction
- **Refactor**: Code improvement without new functionality
- **Test**: Testing and quality assurance
- **Docs**: Documentation updates
- **Infra**: Infrastructure and tooling changes

---

## 📊 Current Progress Summary

### Production Readiness Status

- **Phase 1**: ✅ Complete - Local development setup and database migration
- **Phase 2**: ✅ Complete - Database migration workflows and Better Auth integration
- **Phase 3**: ✅ Authentication Crisis Resolution Complete - Ready for production deployment

### Next Priorities

1. **Production Monitoring** - Error tracking, performance monitoring, and analytics setup
2. **User Feedback Systems** - Beta testing infrastructure and feedback collection
3. **Strava Integration** - Complete workout sync and performance analytics
4. **Advanced Training Features** - Phase progression and plan sequencing

### Technical Health

- **Build Status**: ✅ Clean builds with zero warnings
- **Code Quality**: ✅ Full TypeScript coverage, structured logging, modern React patterns
- **Security**: ✅ Production-ready authentication with proper credential accounts and schema compliance
- **Performance**: ✅ Optimized React components with memoization and atomic state management

---

_This file tracks active and future work. For complete milestone history, see [COMPLETED_MILESTONES.md](./COMPLETED_MILESTONES.md). Update immediately when tasks are completed or new tasks are discovered._
