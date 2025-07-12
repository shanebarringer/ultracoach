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

**Set up enhanced training system:**
```bash
./supabase/scripts/setup_with_env.sh
```
This script loads environment variables from `.env.local` and sets up the complete training system including test users.

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
# If test users can't login, fix password hashes:
source .env.local && PGPASSWORD="$DATABASE_PASSWORD" psql -h aws-0-us-east-2.pooler.supabase.com -U postgres.ccnbzjpccmlribljugve -d postgres -f supabase/temp/fix_passwords.sql

# Or run the password fix script:
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