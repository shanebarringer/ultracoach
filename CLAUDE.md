# CLAUDE.md - UltraCoach Project Guide

This file provides guidance to Claude Code when working with the UltraCoach project. It ensures consistency, context, and proper workflow across all development sessions.

## 🔄 Session Workflow (IMPORTANT)

**At the start of EVERY new conversation:**
1. **Read PLANNING.md** to understand project vision, architecture, and technical context
2. **Check TASKS.md** to see current milestone, pending tasks, and priorities  
3. **Review this file** for project-specific guidance and context
4. **Mark completed tasks** in TASKS.md immediately upon completion
5. **Add newly discovered tasks** to TASKS.md when found during development

## 📊 Project Overview

UltraCoach is a professional ultramarathon coaching platform built with Next.js 15, Supabase, and Jotai state management. The platform supports race-centric training plans, proper periodization, coach-runner relationships, and real-time communication.

### Current Status (Updated: 2025-07-15)
- **Active Milestone**: Enhanced Training Features (Milestone 3) - 100% Complete! 🎉
- **Completion**: 98.7% (114/115 total tasks) + **COMPLETE MESSAGE-WORKOUT LINKING**
- **Recent Major Achievement**: Complete message-workout linking system with contextual communication
- **Performance**: All builds passing, production-ready with professional alpine aesthetic throughout
- **Next Priority**: Monthly calendar view, performance analytics, and advanced training features

## 🏗️ Architecture & Technology

### Core Stack
- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript
- **UI Library**: HeroUI (React components with Tailwind CSS integration)
- **Design System**: Mountain Peak Enhanced - Alpine aesthetic with professional UX
- **Styling**: Tailwind CSS v3 with HeroUI theme system + Custom Mountain Peak colors
- **Icons**: Lucide React icons for enhanced visual design
- **State**: Jotai atomic state management (migrated from React Context)
- **Database**: Supabase PostgreSQL with enhanced training schema
- **Auth**: NextAuth.js with Supabase integration
- **Package Manager**: pnpm (better performance than npm)
- **HTTP Client**: Axios for better request handling and error management
- **Styling Utilities**: classnames for conditional CSS classes

### Key Directories
```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
├── lib/                 # Core utilities and configurations
│   ├── atoms.ts         # Jotai state atoms (CRITICAL)
│   ├── auth.ts          # NextAuth configuration
│   └── supabase.ts      # Supabase client
├── hooks/               # Custom React hooks (Jotai-based)
└── providers/           # Minimal providers (mostly JotaiProvider)

designs/
├── concepts/            # Design exploration (Trail Runner, Mountain Peak, Endurance Athlete)
├── final/               # Mountain Peak Enhanced design + HeroUI migration guide
└── README.md            # Design system documentation

supabase/
├── migrations/v2_enhanced_training/  # Enhanced schema
├── seeds/                            # Templates and test data
└── scripts/                          # Database management
```

## 💻 Development Commands

### Essential Commands
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production  
pnpm build

# Run linting
pnpm lint
```

### Database Operations
```bash
# Complete setup (first time)
./supabase/scripts/setup_enhanced_training.sh

# Seed test data
./supabase/scripts/seed_database.sh

# Backup before changes (ALWAYS run before schema changes)
./supabase/scripts/backup_user_data.sh

# Reset database (development only)
./supabase/scripts/reset_database.sh
```

## 🎯 Key Features & Context

### Enhanced Training System (✅ COMPLETED)
- **5 new tables**: races, training_phases, plan_phases, plan_templates, template_phases
- **Enhanced existing tables**: training_plans and workouts with race targeting
- **15+ training templates**: 50K to 100M for all skill levels
- **20+ real races**: Western States, Leadville, UTMB, etc.
- **Plan sequencing**: 50K → 50M → 50K → 100M progression support

### State Management (🔄 IN PROGRESS)
- **Jotai Migration**: Replaced React Context with atomic state management
- **Completed**: Notifications, workouts page, training plans page, chat system (with UX enhancements), core atom foundation
- **Remaining**: Dashboard components, form components
- **Key File**: `src/lib/atoms.ts` - Contains all state atoms
- **Chat Features**: Enhanced error handling, smart auto-scroll, loading state optimization

### Test Data System (✅ COMPLETED)
- **Test Users**: 2 coaches, 10 runners with realistic relationships and fixed IDs
- **Credentials**: All test accounts use password `password123`
- **Access**: `supabase/temp/credentials/test_users_2025_07_15.txt` for login details
- **Consistent Testing**: Fixed UUIDs prevent messaging errors and enable reliable testing

## 🔧 Important Development Guidelines

### State Management (CRITICAL)
- **NO React Context** for global state - use Jotai atoms only
- **NO useState** for shared state - use Jotai atoms
- **Pattern**: Create hooks that use Jotai atoms (see `useNotifications`, `useWorkouts`)
- **Derived State**: Use derived atoms for computed/filtered data
- **File**: All atoms live in `src/lib/atoms.ts`

### Database Schema
- **Enhanced Schema**: 5 new tables for professional training features
- **RLS Security**: All tables have Row Level Security policies
- **Test Data**: Available via seeding scripts with realistic relationships

### Code Quality
- **TypeScript**: Strict mode enabled, full type coverage required
- **ESLint**: Next.js config with additional rules
- **Imports**: Use `@/` path aliases for clean imports
- **No console.log**: Use `tslog` for structured logging
- **UI Components**: Use HeroUI components with Mountain Peak Enhanced design system
- **Design System**: Follow Mountain Peak color palette and component patterns

### Security
- **No credentials in code**: Use environment variables
- **Test data only**: Test credentials excluded from git
- **RLS policies**: Database access controlled by user roles

## 📋 Session Summary (What We've Accomplished)

### ✅ Milestone 1: Database & State Foundation (COMPLETED)

#### Enhanced Training Database System
- **New Schema**: Created 5 new tables for race-centric training with proper periodization
  - `races`: Target races with distance, terrain, elevation data
  - `training_phases`: Standard phases (Base, Build, Peak, Taper, Recovery)
  - `plan_phases`: Training plan phase progression tracking
  - `plan_templates`: Reusable templates for 50K-100M distances
  - `template_phases`: Phase structure definitions
- **Enhanced Existing**: Added race targeting, goal types, phase tracking to training_plans and workouts
- **Management System**: Complete database management with organized scripts, interactive setup, backup utilities

#### Comprehensive Seed Data
- **Training Templates**: 15+ pre-built templates for all ultra distances and skill levels
- **Real Race Data**: 20+ actual 2025 ultra races (Western States, Leadville, UTMB, etc.)
- **Test Users**: 2 coaches + 10 runners with realistic names and relationships
- **Sample Plans**: Pre-created training plans for each coach-runner pair
- **Credential System**: Secure test credential generation with gitignore protection

#### Jotai State Management Migration
- **Atomic Architecture**: Replaced React Context with Jotai atomic state management
- **Core Atoms**: notifications, workouts, training plans, UI state, loading states
- **Derived Atoms**: Computed filtered workouts, unread notifications, active plans
- **Migrated Components**:
  - ✅ Notification system (`useNotifications` hook)
  - ✅ Workouts page (complete Jotai migration)
  - ✅ Training plans page (`useTrainingPlans` hook)
  - ✅ Chat system (`useMessages`, `useConversations`, `useTypingStatus` hooks)
  - ✅ NotificationBell component
  - ✅ TrainingPlanCard component
  - ✅ ChatWindow, ConversationList, MessageList components (with UX enhancements)
- **Performance**: Granular reactivity, components only re-render when their atoms change
- **Chat Enhancements**: Smart auto-scroll, loading optimization, error resilience, NextAuth fixes

#### Project Infrastructure
- **Database Scripts**: Interactive setup, seeding, reset, backup utilities
- **Directory Organization**: Structured migrations, seeds, scripts directories
- **Version Control**: Feature branch workflow with comprehensive PR #1
- **Documentation**: Complete setup guides and troubleshooting documentation

### ✅ Recently Completed: Milestone 2 - Frontend Enhancements (COMPLETED)

**Recently Completed: Chat System Migration & Enhancement**
- ✅ Complete Jotai migration for chat components (`useMessages`, `useConversations`, `useTypingStatus`)
- ✅ Enhanced error handling with graceful realtime fallbacks and polling
- ✅ Smart auto-scroll behavior that respects user intent
- ✅ Optimized loading states (no more constant loading spinners)
- ✅ Fixed NextAuth compatibility issues with Next.js 15
- ✅ Resolved scroll anchoring issues for contained chat scrolling
- ✅ Implemented optimistic message updates for instant sender feedback
- ✅ Enhanced Supabase realtime error handling for schema mismatches
- ✅ Improved message deduplication logic for real-time updates

**Recently Completed: Mountain Peak Enhanced Design System**
- ✅ Fixed HeroUI provider import issue (NextUIProvider → HeroUIProvider)
- ✅ Resolved Tailwind CSS v4 compatibility issues by downgrading to v3
- ✅ Successfully integrated Mountain Peak Enhanced design system
- ✅ Fixed auth system compatibility with Next.js 15
- ✅ Verified production build works with full styling
- ✅ All HeroUI components now render with proper Mountain Peak styling
- ✅ Dark/light mode theme switching functional
- ✅ Professional alpine aesthetic with training zone color coding
- ✅ Fixed development server CSS processing (removed turbopack flag)
- ✅ Implemented complete Mountain Peak branding ("🏔️ UltraCoach - Conquer Your Peaks")
- ✅ Transformed dashboards with summit terminology and achievement language
- ✅ Fixed component errors and TypeScript issues
- ✅ Added classnames library for better conditional styling
- ✅ Resolved runners page TypeError and applied mountain aesthetic

**Recently Fixed:**
- ✅ Training-plans page flickering and multiple API calls problem (RESOLVED!)
- ✅ Split useTrainingPlans hook into data and actions hooks for better performance
- ✅ Integrated Axios for improved HTTP handling

**Recently Completed: Final HeroUI Pages Transformation**
- ✅ **Runners Page**: Complete HeroUI transformation with expedition team branding
- ✅ **Chat/[userId] Page**: Enhanced individual chat interface with base camp communications
- ✅ **Weekly Planner Page**: Professional weekly expedition planning with alpine aesthetics
- ✅ **All Pages Complete**: Every major page now features consistent Mountain Peak Enhanced styling

### ✅ Latest Achievement: Complete Mountain Peak Enhanced Styling (COMPLETED)

**Recently Completed: Full Mountain Peak Enhanced Transformation**
- ✅ **Workouts Page**: Complete HeroUI transformation with training zone colors and alpine branding
- ✅ **Chat System**: Enhanced communication interface with expedition-themed styling
- ✅ **RunnerDashboard**: Complete transformation from generic to professional alpine aesthetic
- ✅ **ConversationList**: Professional avatars, role indicators, and enhanced UX
- ✅ **Auth Pages**: Sign in and sign up pages with Mountain Peak branding and alpine language
- ✅ **Icons Integration**: Added lucide-react icons throughout for enhanced visual design
- ✅ **Training Zone Colors**: Implemented professional zone-based color coding
- ✅ **Alpine Terminology**: Consistent mountain language ("Base Camp", "Expeditions", "Ascents")
- ✅ **Theme Consistency**: All colors use HeroUI theme tokens for perfect dark/light mode
- ✅ **Professional UX**: Hover states, transitions, and enhanced interactions throughout

**Technical Achievements:**
- ✅ Full HeroUI component integration (Cards, Chips, Progress, Spinner, Tabs)
- ✅ Consistent Mountain Peak branding across all pages
- ✅ Professional loading states and error handling
- ✅ Enhanced form validation and user feedback
- ✅ Training zone color system implementation
- ✅ Responsive design with alpine aesthetic
- ✅ All builds passing with zero errors

**Next Priority Tasks:**
1. ✅ ~~Enhanced Training Features - Race management system~~ **COMPLETED!**
2. **Phase Progression System** - Automatic transitions, visualization, completion criteria
3. **Plan Sequencing** - Multi-race planning workflow (50K → 50M → 100K)
4. Advanced workout planning tools and performance optimization

### ✅ Latest Major Achievement: Complete Message-Workout Linking System (COMPLETED)

**Recently Completed: Message-Workout Linking System**
- ✅ **Contextual Communication**: Complete system for linking messages to specific workouts
  - WorkoutContext component displaying workout details in chat messages
  - WorkoutLinkSelector modal for choosing workouts and link types
  - Support for 5 link types: reference, feedback, question, update, plan_change
  - Professional Mountain Peak Enhanced styling throughout
- ✅ **Enhanced Database Schema**: Comprehensive message-workout relationship system
  - Added workout_id and context_type columns to messages table
  - New message_workout_links table for many-to-many relationships
  - Conversations table for grouping related messages
  - Complete RLS policies and performance indexes
- ✅ **Chat Interface Enhancements**: Professional workout-aware communication
  - Workout filtering dropdown in chat header
  - Active filter display with closeable chips
  - Enhanced message display with workout context cards
  - Real-time updates for workout-linked messages

**Previous Achievement: Race Management System**
- ✅ **Race Expeditions Page**: Complete interface for managing target races with professional Mountain Peak styling
- ✅ **Full CRUD API**: GET, POST, PUT, DELETE endpoints at `/api/races` and `/api/races/[id]`
- ✅ **Race Categories**: Support for 50K, 50M, 100K, 100M, Marathon, and custom distances
- ✅ **Enhanced Weekly Planner**: Improved consistency and Monday-start logic
- ✅ **Database Field Standardization**: Consistent workout APIs across the application

**Technical Implementation:**
- ✅ Date-fns integration for timestamp formatting
- ✅ Complete HeroUI component integration across landing and notifications
- ✅ Mountain Peak Enhanced design system applied consistently
- ✅ Professional loading states and error handling
- ✅ Production-ready builds with zero errors

### 🎯 Key Success Metrics Achieved
- ✅ Zero React Context for global state (notifications, workouts, training plans, chat system migrated)
- ✅ Professional coaching database schema with race-centric planning  
- ✅ Real-time updates with Supabase integration and error resilience
- ✅ Complete test data environment for development
- ✅ Organized project structure with proper documentation
- ✅ Comprehensive project management documentation (PLANNING.md, TASKS.md)
- ✅ Enhanced chat UX with smart auto-scroll and loading optimization
- ✅ **100% MOUNTAIN PEAK ENHANCED STYLING** across ALL pages (runners, chat, weekly planner complete)
- ✅ Production-ready build with professional alpine aesthetic
- ✅ Fully functional auth system with Next.js 15 compatibility
- ✅ Performance-optimized training-plans page with split hook architecture
- ✅ Axios integration for robust HTTP handling and error management
- ✅ **Full HeroUI component integration** with consistent design system
- ✅ **Training zone color coding** throughout the application
- ✅ **Alpine branding and terminology** creating emotional connection
- ✅ **Professional UX patterns** with hover states and smooth transitions

## 🚨 Critical Reminders

### Before Starting Work
1. **ALWAYS check TASKS.md** for current priorities
2. **Read PLANNING.md** if new to project context
3. **Backup database** before any schema changes
4. **Use test credentials** from `supabase/temp/credentials/test_users_2025_07_15.txt`

### During Development
1. **Update TASKS.md** immediately when completing tasks
2. **Add new tasks** when discovered during development
3. **Follow Jotai patterns** - no React Context for global state
4. **Test with realistic data** using provided test accounts

### Before Committing
1. **Run linting**: `pnpm lint`
2. **Test build**: `pnpm build`
3. **Update documentation** if architecture changes
4. **Mark tasks complete** in TASKS.md
5. **Update project docs** (CLAUDE.md, PLANNING.md, TASKS.md) to reflect changes
6. **Commit docs changes** separately or with feature changes

## 🔗 Quick Reference Links

- **Planning**: See PLANNING.md for vision, architecture, tech stack
- **Tasks**: See TASKS.md for milestones, priorities, and progress tracking
- **Design System**: See `designs/README.md` for complete design documentation
- **Final Design**: `designs/final/mountain_peak_enhanced.html` - Interactive demo
- **Implementation Guide**: `designs/final/heroui_migration_guide.md` - Step-by-step migration
- **Database**: `./supabase/scripts/` for all database operations
- **State**: `src/lib/atoms.ts` for all Jotai state definitions
- **Auth**: Test users login with `password123` (see `supabase/temp/credentials/test_users_2025_07_15.txt`)
- **PRs**: #1 (enhanced training system), #5 (training plans Jotai migration), #7 (HeroUI integration)

## 🎯 Development Philosophy

UltraCoach aims to be a professional-grade ultramarathon coaching platform. Every feature should support:
- **Race-centric planning** with specific target events
- **Proper periodization** following sports science principles  
- **Coach-runner relationships** with clear communication
- **Performance tracking** with meaningful metrics
- **User experience** that's intuitive for both coaches and athletes

The codebase should be maintainable, performant, and scalable to support growing usage while maintaining the high-quality user experience expected in professional coaching tools.

## 🗺️ Files Referenced in Various Project Documents
- **@CLAUDE.md**: This project guidance document
- **@PLANNING.md**: Project vision and architectural roadmap
- **@TASKS.md**: Current milestones and task tracking
- **@designs/README.md**: Design system documentation

---

*This file is updated at the end of each development session. Always check PLANNING.md and TASKS.md at the start of new conversations for current context and priorities.*