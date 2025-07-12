# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```
The dev server uses Turbopack for faster builds and runs on http://localhost:3000

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm start
```

**Run linting:**
```bash
npm run lint
```

## Database Setup

**Rails-style database commands (recommended):**
```bash
# Complete setup with schema, seeds, and test users
npm run db:setup

# Reset database (drop + recreate + seed)
npm run db:reset

# Seed database with sample data only
npm run db:seed

# Fix test user password hashes
npm run db:fix-passwords

# Backup user data before major changes
npm run db:backup
```

**Direct script execution:**
```bash
# Set up enhanced training system
./supabase/scripts/setup_with_env.sh
```
These scripts load environment variables from `.env.local` automatically.

**Manual database operations:**
```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Login to Supabase
supabase login --token YOUR_TOKEN

# Link to project
supabase link --project-ref ccnbzjpccmlribljugve
```

**Test Users:**
- **Coaches:** coach1@ultracoach.dev, coach2@ultracoach.dev
- **Runners:** runner1-10@ultracoach.dev
- **Password:** password123
- **Credentials:** Available in `supabase/temp/credentials/latest.txt`

**Troubleshooting login issues:**
```bash
# Quick fix for test user login issues
npm run db:fix-passwords

# Or run the script directly:
./supabase/scripts/fix_test_passwords.sh
```

## Architecture

This is a Next.js 15 application using the App Router with the following structure:

- **Framework**: Next.js 15.3.5 with App Router
- **Database**: Supabase with PostgreSQL
- **Authentication**: NextAuth.js with custom credentials provider
- **Styling**: Tailwind CSS v4
- **State Management**: Jotai (migrated from React Context)
- **TypeScript**: Full TypeScript support with strict mode
- **Fonts**: Uses Geist Sans and Geist Mono fonts via `next/font/google`
- **Path aliases**: `@/*` maps to `./src/*`

### Key Files

**Frontend:**
- `src/app/layout.tsx` - Root layout with font configuration
- `src/lib/auth.ts` - NextAuth configuration with Supabase integration
- `src/lib/supabase.ts` - Supabase client configuration
- `src/lib/atoms.ts` - Jotai state atoms
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration with path aliases

**Database:**
- `supabase/migrations/` - Database schema migrations
- `supabase/seeds/` - Test data and sample content
- `supabase/scripts/` - Database setup and management scripts
- `.env.local` - Environment variables (includes DATABASE_PASSWORD)

**Auth & Users:**
- Uses NextAuth.js with custom credentials provider
- User data stored in `public.users` table
- Password hashing with bcrypt
- Coach-runner relationships via training plans