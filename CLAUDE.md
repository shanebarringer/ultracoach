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

### Current Status (Updated: 2025-01-13)
- **Active Milestone**: Milestone 2 - Frontend Enhancements
- **Completion**: 45.9% (45/98 total tasks)
- **Recent Completion**: Chat system fully migrated with enhanced UX improvements
- **Next Priority**: Dashboard components migration to Jotai

## 🏗️ Architecture & Technology

### Core Stack
- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4 with component-based design
- **State**: Jotai atomic state management (migrated from React Context)
- **Database**: Supabase PostgreSQL with enhanced training schema
- **Auth**: NextAuth.js with Supabase integration
- **Package Manager**: pnpm (better performance than npm)

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
- **Plan sequencing**: 50K → 50M → 100K → 100M progression support

### State Management (🔄 IN PROGRESS)
- **Jotai Migration**: Replaced React Context with atomic state management
- **Completed**: Notifications, workouts page, training plans page, chat system (with UX enhancements), core atom foundation
- **Remaining**: Dashboard components, form components
- **Key File**: `src/lib/atoms.ts` - Contains all state atoms
- **Chat Features**: Enhanced error handling, smart auto-scroll, loading state optimization

### Test Data System (✅ COMPLETED)
- **Test Users**: 2 coaches, 10 runners with realistic relationships
- **Credentials**: All test accounts use password `password123`
- **Access**: `credentials/latest.txt` (gitignored) for login details

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

### 🔄 Current Focus: Milestone 2 - Frontend Enhancements

**Recently Completed: Chat System Migration & Enhancement**
- ✅ Complete Jotai migration for chat components (`useMessages`, `useConversations`, `useTypingStatus`)
- ✅ Enhanced error handling with graceful realtime fallbacks and polling
- ✅ Smart auto-scroll behavior that respects user intent
- ✅ Optimized loading states (no more constant loading spinners)
- ✅ Fixed NextAuth compatibility issues with Next.js 15
- ✅ Resolved scroll anchoring issues for contained chat scrolling

**Next Priority Tasks:**
1. Complete Jotai migration for remaining components (dashboard components, form components)
2. Migrate form components (CreateTrainingPlanModal, WorkoutLogModal)
3. Update training plan UI for enhanced features (race targeting, goal types)
4. Implement plan template selection wizard

### 🎯 Key Success Metrics Achieved
- ✅ Zero React Context for global state (notifications, workouts, training plans, chat system migrated)
- ✅ Professional coaching database schema with race-centric planning  
- ✅ Real-time updates with Supabase integration and error resilience
- ✅ Complete test data environment for development
- ✅ Organized project structure with proper documentation
- ✅ Comprehensive project management documentation (PLANNING.md, TASKS.md)
- ✅ Enhanced chat UX with smart auto-scroll and loading optimization

## 🚨 Critical Reminders

### Before Starting Work
1. **ALWAYS check TASKS.md** for current priorities
2. **Read PLANNING.md** if new to project context
3. **Backup database** before any schema changes
4. **Use test credentials** from `credentials/latest.txt`

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

## 🔗 Quick Reference Links

- **Planning**: See PLANNING.md for vision, architecture, tech stack
- **Tasks**: See TASKS.md for milestones, priorities, and progress tracking
- **Database**: `./supabase/scripts/` for all database operations
- **State**: `src/lib/atoms.ts` for all Jotai state definitions
- **Auth**: Test users login with `password123`
- **PRs**: #1 (enhanced training system), #5 (training plans Jotai migration)

## 🎯 Development Philosophy

UltraCoach aims to be a professional-grade ultramarathon coaching platform. Every feature should support:
- **Race-centric planning** with specific target events
- **Proper periodization** following sports science principles  
- **Coach-runner relationships** with clear communication
- **Performance tracking** with meaningful metrics
- **User experience** that's intuitive for both coaches and athletes

The codebase should be maintainable, performant, and scalable to support growing usage while maintaining the high-quality user experience expected in professional coaching tools.

---

*This file is updated at the end of each development session. Always check PLANNING.md and TASKS.md at the start of new conversations for current context and priorities.*