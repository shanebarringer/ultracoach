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

### Current Status (Updated: 2025-07-25)

- **Active Milestone**: Production Readiness Setup (Phase 2) ✅ **COMPLETE!**
- **Core Development**: 100% (222/222 tasks) ✅ **COMPLETE** - All performance optimizations and React patterns implemented
- **Production Readiness**: Phase 2 complete with comprehensive database migration workflows, Better Auth fixes, and production-ready RLS
- **Recent Achievement**: Complete database migration system with rollback capabilities, Better Auth schema fixes, and comprehensive production security
- **Next Phase**: Secure environment management (Phase 3), production monitoring, and user feedback systems

## 🏗️ Architecture & Technology

### Core Stack

- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript
- **UI Library**: HeroUI (React components with Tailwind CSS integration)
- **Design System**: Mountain Peak Enhanced - Alpine aesthetic with professional UX
- **Styling**: Tailwind CSS v3 with HeroUI theme system + Custom Mountain Peak colors
- **Icons**: Lucide React icons for enhanced visual design
- **State**: Jotai atomic state management (migrated from React Context)
- **Database**: Supabase PostgreSQL with enhanced training schema
- **Auth**: Better Auth (migrated from NextAuth.js for improved stability)
- **Package Manager**: pnpm (better performance than npm)
- **HTTP Client**: Axios for better request handling and error management

(Rest of the existing content remains unchanged)

## 📝 Recent Project Notes

- Added cross-file sync notes between @CLAUDE.md, @PLANNING.md, and @TASKS.md to ensure documentation consistency
- Compact session notes added to track minimal important developments during rapid iterations
- **Cross-file Sync Task**: Synchronized project documentation across @CLAUDE.md, @TASKS.md, and @PLANNING.md

---

_This file is updated at the end of each development session. Always check PLANNING.md and TASKS.md at the start of new conversations for current context and priorities._
