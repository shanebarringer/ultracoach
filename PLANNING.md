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
- **Authentication**: NextAuth.js with custom credentials provider
- **Real-time**: Supabase Realtime for live updates
- **TypeScript**: Full TypeScript with strict mode for type safety

### Backend Architecture
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth integrated with NextAuth.js
- **API**: Next.js API routes with RESTful design
- **Real-time**: Supabase Realtime subscriptions
- **File Storage**: Supabase Storage (future: workout photos, documents)

### Database Schema

#### Core Tables
- **users**: Coach and runner accounts with roles
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

### Strava Integration Dependencies
```json
{
  "strava-v3": "^2.0.0",
  "node-cron": "^3.0.0",
  "date-fns": "^2.30.0"
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
- **Setup**: `./supabase/scripts/setup_enhanced_training.sh`
- **Seed**: `./supabase/scripts/seed_database.sh`
- **Reset**: `./supabase/scripts/reset_database.sh`
- **Backup**: `./supabase/scripts/backup_user_data.sh`

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
│   │   ├── auth.ts          # NextAuth configuration
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

### Current Development Status (Updated 2025-07-14)
- **Project Progress**: 90% complete (101/112 tasks) + Complete Design System + HeroUI Integration + Performance Optimization
- **Active Milestone**: Enhanced Training Features (Milestone 3)
- **Recent Completions**: Training-plans page performance optimization with split hook architecture and Axios integration
- **Major Achievement**: Eliminated training-plans page flickering and multiple API calls - now demo-ready!
- **Next Priorities**: Race management system, phase progression, and advanced workout planning features
- **Performance**: Single API call per page load, smooth user experience, production-ready

### Database Operations
```bash
# Seed database with templates and test data
./supabase/scripts/seed_database.sh

# Backup before major changes
./supabase/scripts/backup_user_data.sh

# Reset database (development only)
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

This planning document serves as the foundation for all development decisions and architectural choices in the UltraCoach project.