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

### Current Status (Updated: 2025-07-30)

- **Active Milestone**: React Suspense Integration & Code Quality Enhancement ✅ **COMPLETE!**
- **Core Development**: 100% (222/222 tasks) ✅ **COMPLETE** - All performance optimizations and React patterns implemented
- **Production Readiness**: All phases complete with comprehensive security, authentication, and UI modernization
- **Latest Achievement**: React Suspense modernization, TypeScript test fixes, enhanced loading states, and comprehensive error boundaries
- **Tech Stack Modernization**: Upgraded to Tailwind v4, modern Husky v10 hooks, and React Suspense integration
- **Developer Experience**: Pre-commit hooks prevent failed builds, automated TypeScript/ESLint validation, zero compilation errors
- **React Patterns**: Modern Suspense boundaries, enhanced loading skeletons, and streaming-friendly error handling
- **Code Quality**: All TypeScript errors resolved, comprehensive test suite with proper type safety
- **Next Phase**: Production monitoring, user feedback systems, and Strava integration

## 🏗️ Architecture & Technology

### Core Stack

- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript
- **UI Library**: HeroUI (React components with Tailwind CSS integration)
- **Design System**: Mountain Peak Enhanced - Alpine aesthetic with professional UX
- **Styling**: Tailwind CSS v4 with CSS-first configuration + HeroUI theme system + Custom Mountain Peak colors
- **Icons**: Lucide React icons for enhanced visual design
- **State**: Jotai atomic state management (migrated from React Context)
- **Database**: Supabase PostgreSQL with enhanced training schema
- **Auth**: Better Auth (migrated from NextAuth.js for improved stability)
- **Package Manager**: pnpm (better performance than npm)
- **HTTP Client**: Axios for better request handling and error management
- **Code Quality**: Husky v10 pre-commit hooks with TypeScript, ESLint, and Prettier validation
- **Pre-commit Automation**: Automated quality checks prevent failed builds and maintain code standards
- **React Suspense**: Modern async data loading with enhanced error boundaries and loading states
- **Loading Components**: Comprehensive skeleton components for consistent UX across all data loading

(Rest of the existing content remains unchanged)

## 📝 Recent Project Notes

- **React Suspense Integration & Code Quality (2025-07-30)**: Complete modernization of async data loading with Suspense boundaries, TypeScript test fixes, and enhanced error handling
- **React Suspense Enhancement**: Implemented comprehensive SuspenseBoundary components with retry logic, specialized boundaries for data lists/dashboard/forms, and withSuspenseBoundary HOC
- **Loading State Modernization**: Created enhanced skeleton components (WorkoutCardSkeleton, TrainingPlanCardSkeleton, etc.) for consistent loading UX across the application
- **TypeScript Quality Improvements**: Resolved all compilation errors in test files, fixed Better Auth API compatibility issues, updated environment variable handling with vi.stubEnv
- **Husky Modernization**: Updated to v10-compatible format removing deprecated scripts, preventing future failures and maintaining automated quality checks
- **Component Architecture**: Updated AsyncTrainingPlansList, AsyncWorkoutsList, and RecentActivity with modern Suspense patterns and improved error boundaries
- **Developer Experience**: Zero TypeScript compilation errors, comprehensive test coverage with proper type safety, and streamlined development workflow
- **Previous Achievements**: Tailwind CSS v4 upgrade, password reset flow, pre-commit automation, and coach/runner routing fixes all completed successfully

---

_This file is updated at the end of each development session. Always check PLANNING.md and TASKS.md at the start of new conversations for current context and priorities._
