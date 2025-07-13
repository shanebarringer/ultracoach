# GEMINI.md - UltraCoach Project Guide

This file provides guidance to Gemini when working with the UltraCoach project. It ensures consistency, context, and proper workflow across all development sessions.

## 🔄 Session Workflow (IMPORTANT)

**At the start of EVERY new conversation:**
1. **Read PLANNING.md** to understand project vision, architecture, and technical context.
2. **Check TASKS.md** to see the current milestone, pending tasks, and priorities.
3. **Review this file (GEMINI.md)** for project-specific guidance and context.
4. **Mark completed tasks** in TASKS.md immediately upon completion.
5. **Add newly discovered tasks** to TASKS.md when found during development.

## 📊 Project Overview

UltraCoach is a professional ultramarathon coaching platform built with Next.js 15, Supabase, and Jotai state management. The platform supports race-centric training plans, proper periodization, coach-runner relationships, and real-time communication.

### Current Status (Updated: 2025-07-13 from TASKS.md)
- **Active Milestone**: Milestone 3 - Enhanced Training Features
- **Completion**: 57.0% (65/114 total tasks)
- **Current Focus**: Completing remaining Jotai migration (dashboard components) and updating training plan UI for enhanced features.
- **Next Priority**: Complete remaining Jotai migration (dashboard components), Update training plan UI for enhanced features.

## 🏗️ Architecture & Technology

### Core Stack
- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript
- **UI Library**: HeroUI (React components with Tailwind CSS integration)
- **Styling**: Tailwind CSS v4 with HeroUI theme system
- **State**: Jotai atomic state management
- **Database**: Supabase PostgreSQL with enhanced training schema & RLS
- **Auth**: NextAuth.js with Supabase integration
- **Package Manager**: pnpm

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
└── providers/           # Providers (JotaiProvider, HeroUIProvider)

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

## 🔧 Important Development Guidelines

### State Management (CRITICAL)
- **Use Jotai atoms ONLY** for global/shared state. No React Context or `useState` for shared state.
- **Pattern**: Create custom hooks that use Jotai atoms (e.g., `useWorkouts`).
- **Derived State**: Use derived atoms for computed/filtered data.
- **Location**: All atoms must be defined in `src/lib/atoms.ts`.

### Database
- **Schema**: Work with the **v2_enhanced_training** schema.
- **Security**: All tables have Row Level Security (RLS) policies. Be mindful of user roles.
- **Test Data**: Use seeding scripts for a realistic development environment. Test users have the password `password123`.

### Code Quality
- **TypeScript**: Strict mode is enabled. Aim for full type coverage.
- **ESLint**: Adhere to the project's ESLint rules (`pnpm lint`).
- **Imports**: Use `@/` path aliases.
- **UI**: Use HeroUI components for consistency.

## 🚨 Critical Reminders

### Before Starting Work
1. **ALWAYS check TASKS.md** for current priorities.
2. **Backup database** (`./supabase/scripts/backup_user_data.sh`) before any schema changes.
3. **Use test credentials**: password is `password123`.

### During Development
1. **Update TASKS.md** immediately when completing tasks.
2. **Add new tasks** to TASKS.md as they are discovered.
3. **Follow Jotai patterns** strictly.

### Before Committing
1. **Run `pnpm lint` and `pnpm build`** to check for errors.
2. **Update documentation** (PLANNING.md, TASKS.md, GEMINI.md) if architecture or tasks change.
3. **Commit docs changes** with related feature changes or separately.

## 🔗 Quick Reference Links

- **Planning**: See `PLANNING.md` for vision, architecture, tech stack.
- **Tasks**: See `TASKS.md` for milestones, priorities, and progress tracking.
- **Database Scripts**: See `./supabase/scripts/` for all database operations.
- **State Atoms**: See `src/lib/atoms.ts` for all Jotai state definitions.
