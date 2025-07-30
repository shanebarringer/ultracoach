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

- **Active Milestone**: UI Modernization & Developer Experience Enhancement ✅ **COMPLETE!**
- **Core Development**: 100% (222/222 tasks) ✅ **COMPLETE** - All performance optimizations and React patterns implemented
- **Production Readiness**: All phases complete with comprehensive security, authentication, and UI modernization
- **Recent Achievement**: Tailwind CSS v4 upgrade, password reset flow implementation, Husky pre-commit automation, and coach/runner routing fixes
- **Tech Stack Modernization**: Upgraded to Tailwind v4 with CSS-first configuration, automated quality checks
- **Developer Experience**: Pre-commit hooks prevent failed builds, automated TypeScript/ESLint validation
- **Authentication Enhancement**: Full password reset flow with Better Auth integration and role-based routing fixes
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
- **Code Quality**: Husky pre-commit hooks with TypeScript, ESLint, and Prettier validation
- **Pre-commit Automation**: Automated quality checks prevent failed builds and maintain code standards

(Rest of the existing content remains unchanged)

## 📝 Recent Project Notes

- **UI Modernization & Developer Experience (2025-07-30)**: Tailwind CSS v4 upgrade with CSS-first configuration, password reset flow implementation, Husky pre-commit automation, and coach/runner routing fixes
- **Tailwind CSS v4 Migration**: Upgraded from v3 to v4 with CSS-first configuration, improved performance (~50% smaller bundles), and modern features like native CSS layers
- **Password Reset Implementation**: Complete forgot/reset password flow with Better Auth integration, email templates, and production-ready error handling
- **Pre-commit Automation**: Husky hooks prevent failed builds with automated TypeScript checking, ESLint validation, and Prettier formatting
- **Authentication Routing Fix**: Resolved production issue where coaches saw runner interface by fixing role extraction from Better Auth sessions
- **HeroUI Compatibility**: Verified full compatibility with Tailwind v4 and Mountain Peak theme system
- **Developer Experience**: Enhanced development workflow with automated quality checks and build validation

---

_This file is updated at the end of each development session. Always check PLANNING.md and TASKS.md at the start of new conversations for current context and priorities._
