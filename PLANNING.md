# UltraCoach - Project Planning & Architecture

## 🎯 Vision

Transform UltraCoach into a professional ultramarathon coaching platform that supports proper periodization, race-centric training plans, and seamless coach-runner relationships. The platform enables coaches to create sophisticated training programs while providing runners with clear guidance, progress tracking, and real-time communication.

## 🏗️ Architecture Overview

### Frontend Architecture

- **Framework**: Next.js 15.3.5 with App Router
- **Design System**: Mountain Peak Enhanced - Alpine aesthetic with professional UX patterns
- **UI Library**: HeroUI with custom Mountain Peak theme
- **Styling**: Tailwind CSS v3 with HeroUI theme integration + Custom alpine color palette
- **State Management**: Jotai for atomic, granular state management
- **Authentication**: Better Auth with Drizzle adapter, custom session management, and role-based access
- **Real-time**: Supabase Realtime for live updates
- **TypeScript**: Full TypeScript with strict mode for type safety

### Backend Architecture

- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Better Auth with custom fields (role, fullName), customSession plugin, and proper TypeScript inference
- **API**: Next.js API routes with RESTful design
- **Real-time**: Supabase Realtime subscriptions
- **File Storage**: Supabase Storage (future: workout photos, documents)

### Database Schema

#### Core Tables

- **better_auth_users**: Coach and runner accounts with roles (Better Auth managed)
- **better_auth_sessions**: User sessions with correct schema (id AND token fields)
- **better_auth_accounts**: OAuth accounts for social authentication
- **better_auth_verification_tokens**: Email verification and password reset tokens
- **training_plans**: Enhanced with race targeting and phase tracking
- **workouts**: Enhanced with categorization and intensity tracking
- **conversations/messages**: Real-time chat system
- **notifications**: User notification system

#### Enhanced Training System (NEW)

- **races**: Target races with distance, terrain, elevation data
- **training_phases**: Standard periodization phases (Base, Build, Peak, Taper, Recovery)
- **plan_phases**: Training plan phase progression tracking
- **plan_templates**: Reusable templates for common distances (50K-100M)
- **template_phases**: Phase structure definitions for templates

### Coach-Runner Relationship System (NEW 2025-08-03)

- **coach_runners**: Direct coach-runner relationships with status management and bidirectional connections
- **Support for multiple relationship types**: Standard coaching, invited connections, pending relationships
- **Invitation system**: Coaches can invite runners via email with automatic account creation
- **Bidirectional discovery**: Both coaches and runners can browse and connect with each other
- **Relationship status tracking**: pending, active, inactive with proper state management
- **API Integration**: 5 comprehensive endpoints for relationship CRUD and discovery
- **UI Components**: CoachSelector, RunnerSelector, RelationshipsList for complete relationship management
- **Dashboard Enhancement**: Relationship-aware dashboards showing connected vs available users

### State Management (Jotai)

```typescript
// Core atoms
notificationsAtom: Notification[]
workoutsAtom: Workout[]
trainingPlansAtom: TrainingPlan[]
uiStateAtom: UI state (modals, filters, selections)

// Derived atoms
filteredWorkoutsAtom: Computed filtered workouts
unreadNotificationsAtom: Computed unread notifications
activeTrainingPlansAtom: Computed active plans
```

## 💻 Technology Stack

### Core Dependencies

```json
{
  "next": "15.3.5",
  "react": "^19.0.0",
  "typescript": "^5",
  "tailwindcss": "^3.4.17",
  "@heroui/react": "^2.7.11",
  "@heroui/theme": "^2.4.17",
  "jotai": "^2.12.5",
  "better-auth": "^1.0.0",
  "@supabase/supabase-js": "^2.50.5",
  "axios": "^1.10.0",
  "bcrypt": "^6.0.0",
  "tslog": "^4.9.3",
  "framer-motion": "^12.23.3",
  "classnames": "^2.5.1"
}
```

### Third-Party Integration Dependencies

```json
{
  "strava-v3": "^2.0.0",
  "node-cron": "^3.0.0",
  "date-fns": "^2.30.0"
}
```

### Garmin Connect IQ Integration (Future Roadmap)

```json
{
  "garmin-connect-iq": "^1.0.0",
  "connect-iq-sdk": "^4.0.0",
  "@internationalized/date": "^3.8.2"
}
```

### Testing & CI/CD Infrastructure

```json
{
  "@playwright/test": "^1.45.0",
  "playwright": "^1.45.0"
}
```

### Development Tools

```json
{
  "eslint": "^9",
  "eslint-config-next": "15.3.5",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "@types/bcrypt": "^5.0.2",
  "autoprefixer": "^10.4.21",
  "eslint-plugin-react-hooks": "^5.2.0"
}
```

### Package Manager

- **Primary**: pnpm (better performance, disk efficiency, stricter dependency management)
- **Commands**: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`

## 🛠️ Required Tools

### Development Environment

- **Node.js**: v18+ (recommended v20+)
- **pnpm**: Latest version for package management
- **Git**: Version control with GitHub integration
- **VS Code**: Recommended IDE with TypeScript/React extensions

### Database & Infrastructure

- **Supabase CLI**: For database management and migrations
  ```bash
  npm install -g supabase
  supabase login --token YOUR_TOKEN
  supabase link --project-ref ccnbzjpccmlribljugve
  ```
- **PostgreSQL**: Local development (optional, Supabase provides hosted)
- **GitHub CLI**: For PR management
  ```bash
  brew install gh
  gh auth login
  ```

### Database Management Scripts

- **TypeScript Seeding**: `pnpm db:seed` or `pnpm prod:db:seed` - Production-ready seeding with Better Auth integration
- **Setup**: `./supabase/scripts/setup_enhanced_training.sh` - Initial database setup
- **Reset**: `./supabase/scripts/reset_database.sh` - Development database reset
- **Backup**: `./supabase/scripts/backup_user_data.sh` - User data backup utility

### Better Auth Schema Requirements (CRITICAL)

⚠️ **Important**: Better Auth has specific schema requirements that must be followed exactly:

- **Session Table**: Must have BOTH `id` field (primary key) AND separate `token` field (unique)
- **Schema Generation**: Always use `npx @better-auth/cli generate` to create correct schemas
- **Manual Schema**: If creating manually, ensure session table has both `id` AND `token` columns
- **Validation**: Run schema validation before deploying to prevent "hex string expected" errors
- **Credential Accounts**: Users need proper `provider_id: 'credential'` records for password authentication

### Supabase CLI Operations (Modern Approach)

```bash
# Direct SQL execution (preferred for 2025+)
supabase db query "SELECT table_name FROM information_schema.tables;"

# File-based operations
supabase db query --file ./path/to/script.sql

# Environment-specific operations
supabase db reset --linked    # Production database
supabase db reset --local     # Local development

# Migration management
supabase db push              # Apply migrations
supabase db pull              # Sync schema changes
```

## 🎯 Key Features

### Race-Centric Planning

- Training plans built around specific target races
- Goal types: completion, time goals, placement
- Race information: distance, terrain, elevation, location
- Real ultra races included (Western States, Leadville, UTMB, etc.)

### Periodization Support

- Standard training phases with automatic progression
- Phase-specific workout organization and targets
- Focus areas for each phase (base, build, peak, taper, recovery)
- Training load management and progression tracking

### Plan Templates

- 15+ pre-built templates for common ultra distances
- Difficulty levels: beginner, intermediate, advanced
- Specialized plans: base building, bridge plans, recovery
- Public templates available to all users, custom templates for coaches

### Plan Sequencing

- Link training plans together for race progressions
- Support for 50K → 50M → 100K → 100M pathways
- Base building periods between race cycles
- Bridge plans for maintaining fitness between races

### Enhanced Workouts

- Workout categories: easy, tempo, interval, long_run, race_simulation
- Intensity levels (1-10) and effort tracking
- Terrain types: trail, road, track, treadmill
- Elevation gain and weather condition tracking

### Strava Integration

- Seamless OAuth connection between UltraCoach and Strava accounts
- Bi-directional workout sync: planned workouts → Strava calendar, completed activities → UltraCoach
- Real-time activity import with GPS data, pace, heart rate, and elevation metrics
- Automatic workout completion logging based on Strava activities
- Enhanced analytics combining planned vs actual performance data
- Coach insights dashboard with execution vs planning analysis

### Coach-Runner Relationship Management (NEW 2025-08-03)

- **Bidirectional Discovery**: Runners can browse available coaches, coaches can browse available runners
- **Flexible Connection Flow**: Both parties can initiate relationships for optimal user experience
- **Invitation System**: Coaches can create accounts for runners via email and invite them to join
- **Relationship Status Management**: pending, active, inactive states with proper lifecycle management
- **Multi-Coach Support**: Runners can potentially work with multiple coaches (future enhancement)
- **Relationship History**: Track when relationships started, notes, and relationship metadata

### Real-time Communication

- Coach-runner chat with typing indicators and smart auto-scroll
- Notification system for workout updates
- Real-time plan and workout synchronization with error resilience
- Status indicators and message delivery confirmation
- Enhanced UX with optimized loading states and contained scrolling

## 🔄 Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **feature/**: Feature development branches
- **hotfix/**: Critical bug fixes

### Commit Conventions

- **feat**: New features
- **fix**: Bug fixes
- **refactor**: Code refactoring
- **docs**: Documentation updates
- **test**: Test additions/updates

### Testing Strategy

- **Manual Testing**: Test user accounts with realistic data
- **Integration Testing**: Database operations and real-time features
- **Performance Testing**: State management and large datasets
- **Security Testing**: RLS policies and authentication
- **End-to-End Testing**: Playwright for cross-browser testing
- **CI/CD Pipeline**: GitHub Actions for automated testing and deployment

## 📁 Project Structure

```
ultracoach/
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and configurations
│   │   ├── atoms.ts         # Jotai state atoms
│   │   ├── better-auth.ts   # Better Auth configuration
│   │   └── supabase.ts      # Supabase client
│   ├── hooks/               # Custom React hooks
│   └── providers/           # Context providers (minimal with Jotai)
├── supabase/
│   ├── migrations/          # Database schema migrations
│   ├── seeds/               # Seed data and templates
│   └── scripts/             # Database management scripts
├── CLAUDE.md               # Claude Code session guide
├── PLANNING.md             # This file - project planning
└── TASKS.md                # Milestone-based task tracking
```

## 🔧 Recent Authentication Fixes (2025-08-03)

### Critical Issues Resolved

1. **Routing Loop Bug (FIXED)** ✅
   - **Issue**: Infinite redirect loop between `/dashboard/runner` and `/dashboard/coach`
   - **Root Cause**: Circular redirect logic when user role didn't match expected route
   - **Solution**: Created unified `DashboardRouter` component with proper state handling
   - **Files**: `src/components/dashboard/DashboardRouter.tsx`, updated dashboard pages

2. **Better Auth Role Integration (FIXED)** ✅
   - **Issue**: User roles stored as `'user'` instead of `'coach'/'runner'`
   - **Root Cause**: Manual database insertion bypassing Better Auth validation
   - **Solution**: Added `customSession` plugin and `customSessionClient` for proper type inference
   - **Files**: `src/lib/better-auth.ts`, `src/lib/better-auth-client.ts`

3. **Database Schema Standardization (IMPROVED)** ✅
   - **Issue**: Inconsistent field naming and role values
   - **Solution**: Updated existing user roles and created Better Auth-compliant seeding script
   - **Files**: `scripts/seed-users-better-auth.ts`, database role updates

### Better Auth Integration Best Practices

- ✅ Use Better Auth sign-up API instead of manual user insertion
- ✅ Configure `customSession` plugin for proper session data transformation
- ✅ Add `customSessionClient` for client-side type inference
- ✅ Implement unified dashboard routing to prevent circular redirects
- ✅ Store Better Auth documentation in `.context7-docs/better-auth/`

### New Seeding Approach

```bash
# Use Better Auth-compliant seeding (recommended)
pnpm tsx scripts/seed-users-better-auth.ts

# Old manual seeding (deprecated)
pnpm run db:seed
```

## 🚀 Development Commands

### Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Set up database (first time)
./supabase/scripts/setup_enhanced_training.sh

# Start development server
pnpm dev
```

### Current Development Status (Updated 2025-07-29)

- **Project Progress**: 100% complete (222/222 tasks) + Authentication Crisis Resolution ✅ **COMPLETE**
- **Active Milestone**: Production Readiness with Authentication Fixes
- **Recent Completions**: Better Auth schema fixes, TypeScript database seeding, credential account creation
- **Major Achievement**: Authentication system fully restored - users can now log in successfully!
- **Next Priorities**: Production monitoring, user feedback systems, and Strava integration
- **Performance**: Production build passes with zero TypeScript errors, authentication working

### Database Operations

```bash
# TypeScript database seeding (recommended)
pnpm db:seed              # Development database
pnpm prod:db:seed         # Production database

# Drizzle Migration Management (NEW 2025-08-03)
pnpm db:generate          # Generate migrations from schema changes
pnpm db:migrate           # Apply migrations to database
pnpm db:studio            # Launch Drizzle Studio for database visualization
pnpm db:drop              # Drop migration (use with caution)

# Legacy shell scripts (backup)
./supabase/scripts/seed_database.sh
./supabase/scripts/backup_user_data.sh
./supabase/scripts/reset_database.sh
```

### Code Quality

```bash
# Run linting
pnpm lint

# Build for production
pnpm build

# Type checking
npx tsc --noEmit
```

### Testing & CI/CD

```bash
# Run Playwright tests
npx playwright test

# Run tests on specific browser
npx playwright test --project=chromium

# Run tests with UI
npx playwright test --ui

# Install browsers
npx playwright install
```

## 🎯 Success Metrics

### Technical Goals

- ✅ Zero React Context for global state (notifications, workouts, training plans, chat system with UX enhancements migrated)
- ✅ Comprehensive database schema for professional coaching
- ✅ Real-time updates with sub-second latency, error resilience, and graceful fallbacks
- ✅ Complete design system with Mountain Peak Enhanced aesthetic
- ✅ HeroUI component migration with Mountain Peak theme implementation
- ✅ Production-ready build with professional alpine aesthetic
- ✅ Full TypeScript coverage with strict mode
- ✅ Resolved Tailwind CSS v3 compatibility and HeroUI integration

### User Experience Goals

- ✅ Inspiring mountain-themed design that emotionally connects with ultramarathon athletes
- ✅ Professional data organization with scientific training zone color coding
- ✅ Intuitive race targeting and goal setting
- Clear phase progression visualization
- Seamless coach-runner communication with smart auto-scroll and optimized loading
- Mobile-responsive training plan management with Mountain Peak Enhanced design
- Fast, performant state updates with granular reactivity

### Business Goals

- Support for multiple race distances and types
- Scalable template system for different coaching styles
- Professional periodization methodology
- Data-driven training insights and progress tracking

## 🛡️ Security Architecture

### Database Security

- **Row Level Security (RLS)**: Comprehensive policies ensuring users can only access their own data
- **Environment Variables**: All database connection details use environment variables - no hardcoded credentials
- **SQL Injection Protection**: Parameterized queries and input validation in all database scripts
- **Connection Security**: Secure PostgreSQL connection pooling with timeout handling

### Authentication Security

- **Better Auth Integration**: Modern, secure authentication with proper session management
- **Password Security**: Bcrypt hashing with salt for all user passwords
- **Session Management**: Secure JWT tokens with proper expiration and refresh logic
- **Role-Based Access**: Coach and runner roles with appropriate permission boundaries

### Environment Security

- **Secure Environment Loading**: Robust environment variable parsing that handles special characters
- **Secret Management**: All secrets stored in `.env.local` (excluded from version control)
- **Development vs Production**: Clear separation of environment configurations
- **API Key Rotation**: Support for rotating Supabase API keys without code changes

### Script Security

- **Input Validation**: All database scripts validate table names and inputs
- **Process Security**: No password exposure in process lists or command-line arguments
- **Error Handling**: Secure error messages that don't expose internal details
- **Transaction Safety**: Atomic operations with proper rollback mechanisms

### Production Security Checklist

- [ ] All `.env.local` files excluded from version control
- [ ] Database passwords rotated and stored securely
- [ ] API keys use least-privilege access
- [ ] SSL/TLS enforced for all database connections
- [ ] Regular security audit of RLS policies
- [ ] Monitor for suspicious database activity
- [ ] Backup encryption and secure storage

## 📱 Garmin Connect IQ Integration Roadmap

### Phase 1: Foundation (Q2 2025)

#### Garmin API Integration

- **Connect IQ Store App**: Develop UltraCoach companion app for Garmin devices
- **OAuth 2.0 Setup**: Implement Garmin Connect API authentication
- **Device Compatibility**: Support for Fenix, Forerunner, Epix, and Enduro series
- **Workout Sync**: Two-way sync between UltraCoach training plans and Garmin devices

#### Core Features

```typescript
interface GarminWorkoutSync {
  id: string
  garmin_activity_id?: string
  sync_status: 'pending' | 'synced' | 'failed'
  device_model: string
  sync_timestamp: string
  workout_data: {
    planned_intervals: GarminInterval[]
    target_metrics: GarminTargets
    navigation_course?: GPXData
  }
}

interface GarminInterval {
  duration_type: 'time' | 'distance' | 'heart_rate'
  duration_value: number
  target_type: 'pace' | 'heart_rate' | 'power'
  target_zone: [number, number]
  rest_interval?: GarminInterval
}
```

### Phase 2: Advanced Features (Q3 2025)

#### Smart Notifications

- **Pre-Workout Alerts**: Send workout details to watch 24h before scheduled
- **Real-Time Coaching**: Live pace/heart rate guidance during workouts
- **Post-Workout Analysis**: Automatic upload and analysis of completed activities
- **Coach Notifications**: Alert coaches when workouts are completed or missed

#### Course Integration

- **GPX Route Sync**: Upload trail running courses directly to Garmin devices
- **Elevation Profiles**: Display elevation data for planned workouts
- **Turn-by-Turn Navigation**: Integration with Garmin's navigation system
- **Race Course Simulation**: Upload actual race courses for training

### Phase 3: Advanced Analytics (Q4 2025)

#### Physiological Monitoring

- **Training Load Integration**: Sync with Garmin's Training Load metrics
- **Recovery Metrics**: Use Body Battery and HRV data for plan adjustments
- **Sleep Analysis**: Factor sleep quality into training recommendations
- **Performance Condition**: Real-time performance indicator integration

#### Adaptive Training

```typescript
interface GarminAdaptiveMetrics {
  training_load: number
  recovery_time: number // hours
  vo2_max: number
  lactate_threshold: number // bpm
  running_power_threshold: number // watts
  suggested_adjustments: TrainingAdjustment[]
}

interface TrainingAdjustment {
  workout_id: string
  adjustment_type: 'intensity' | 'duration' | 'rest'
  original_value: number
  suggested_value: number
  reason: string
  confidence: number // 0-1
}
```

### Phase 4: Ecosystem Integration (2026)

#### Connect IQ Store Features

- **Data Fields**: Custom UltraCoach data fields for training metrics
- **Watch Faces**: Training-focused watch faces showing next workout
- **Widgets**: Quick access to training plan progress and metrics
- **Apps**: Standalone UltraCoach app for offline workout access

#### Third-Party Integrations

- **Strava Integration**: Seamless sync between Garmin → UltraCoach → Strava
- **TrainingPeaks**: Export UltraCoach plans to TrainingPeaks format
- **Zwift Integration**: Indoor training session synchronization
- **Nutrition Apps**: Integrate with MyFitnessPal, Cronometer

### Technical Implementation

#### API Integration Points

```typescript
// Garmin Connect API endpoints
const GarminAPI = {
  OAuth: 'https://connect.garmin.com/oauth/request_token',
  Activities: 'https://connect.garmin.com/modern/proxy/activity-service/activity',
  Workouts: 'https://connect.garmin.com/modern/proxy/workout-service/workout',
  UserProfile: 'https://connect.garmin.com/modern/proxy/userprofile-service/userprofile',
  Devices: 'https://connect.garmin.com/modern/proxy/device-service/device',
}

// Database schema additions
interface GarminConnection {
  id: string
  user_id: string // FK to better_auth_users
  garmin_user_id: string
  access_token: string // encrypted
  refresh_token: string // encrypted
  token_expires_at: string
  device_models: string[] // JSON array
  sync_preferences: GarminSyncPreferences
  created_at: string
  updated_at: string
}
```

#### Development Priorities

1. **Security First**: OAuth tokens encrypted at rest, secure token refresh
2. **Offline Capability**: Workout data cached on device for offline access
3. **Battery Optimization**: Minimal battery impact during sync operations
4. **User Experience**: Seamless setup and automatic sync with clear status
5. **Error Handling**: Graceful degradation when devices are offline

#### Success Metrics

- **Sync Reliability**: >95% successful workout sync rate
- **User Adoption**: 60% of users connect Garmin devices within 30 days
- **Engagement**: 40% increase in workout completion rates with Garmin sync
- **Performance**: <2 second sync time for typical workouts

## 🤖 AI-Enhanced Development Workflow

### Model Context Protocol (MCP) Integration

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "github": {
      "command": "claude-mcp-github",
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### AI-Driven Database Management

- **Context7 MCP**: Access current Supabase documentation with `use context7`
- **GitHub MCP**: Automated issue management and PR workflows
- **BigQuery MCP**: Advanced analytics and query optimization
- **Fetch MCP**: Real-time documentation and API reference retrieval

### Development Workflow Enhancement

1. **Documentation Access**: Use Context7 for up-to-date API references
2. **Code Generation**: Leverage MCP servers for scaffolding and boilerplate
3. **Testing Automation**: Integrate MCP for test generation and validation
4. **Deployment Automation**: Use GitHub MCP for CI/CD pipeline management

### Security Considerations for MCP

- Only use trusted, verified MCP servers
- Store MCP configurations in version control for team consistency
- Regularly audit MCP server permissions and access patterns
- Monitor for prompt injection or data leakage in MCP interactions

This planning document serves as the foundation for all development decisions and architectural choices in the UltraCoach project.
