# UltraCoach - Project Planning & Architecture

## 🎯 Vision

Transform UltraCoach into a professional ultramarathon coaching platform that supports proper periodization, race-centric training plans, and seamless coach-runner relationships. The platform enables coaches to create sophisticated training programs while providing runners with clear guidance, progress tracking, and real-time communication.

## 🏗️ Architecture Overview

### Frontend Architecture
- **Framework**: Next.js 15.3.5 with App Router
- **Styling**: Tailwind CSS v4 with component-based design
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
  "tailwindcss": "^4",
  "jotai": "^2.x",
  "next-auth": "^4.24.11",
  "@supabase/supabase-js": "^2.50.5",
  "bcrypt": "^6.0.0",
  "tslog": "^4.9.3"
}
```

### Development Tools
```json
{
  "eslint": "^9",
  "eslint-config-next": "15.3.5",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/bcrypt": "^5.0.2"
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

### Current Development Status (Updated 2025-07-13)
- **Project Progress**: 57.0% complete (65/114 tasks)
- **Active Milestone**: Milestone 3 - Enhanced Training Features
- **Recent Completions**: HeroUI integration foundation with core components, Dark/Light Mode Toggle, Form Component Migration, Build Fixes
- **Next Priorities**: Complete remaining Jotai migration (dashboard components), Update training plan UI for enhanced features

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

## 🎯 Success Metrics

### Technical Goals
- 🔄 Zero React Context for global state (notifications, workouts, training plans, chat system with UX enhancements migrated)
- ✅ Comprehensive database schema for professional coaching
- ✅ Real-time updates with sub-second latency, error resilience, and graceful fallbacks
- 🔄 Full TypeScript coverage with strict mode
- 🔄 Component library with consistent design system

### User Experience Goals
- Intuitive race targeting and goal setting
- Clear phase progression visualization
- Seamless coach-runner communication with smart auto-scroll and optimized loading
- Mobile-responsive training plan management
- Fast, performant state updates with granular reactivity

### Business Goals
- Support for multiple race distances and types
- Scalable template system for different coaching styles
- Professional periodization methodology
- Data-driven training insights and progress tracking

This planning document serves as the foundation for all development decisions and architectural choices in the UltraCoach project.