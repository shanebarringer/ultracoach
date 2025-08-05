# UltraCoach

A Next.js application for ultra-marathon training management with coach-runner relationships, training plans, and workout tracking.

## Tech Stack

- **Framework**: Next.js 15.3.5 with App Router, React 19
- **Package Manager**: pnpm (for better performance and disk efficiency)
- **UI Library**: HeroUI with Mountain Peak Enhanced design system
- **Database**: Supabase with PostgreSQL and Better Auth
- **Authentication**: Better Auth (modern, production-ready auth system)
- **Styling**: Tailwind CSS v3 with HeroUI theme integration
- **State Management**: Jotai atomic state management
- **Icons**: Lucide React for enhanced visual design

## Getting Started

### Prerequisites

Install required tools:

```bash
# Install pnpm
npm install -g pnpm

# Install Supabase CLI
npm install -g supabase

# Verify Docker is running (required for Supabase local development)
docker --version
```

### Installation

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd ultracoach
pnpm install
```

2. Set up environment variables:

```bash
cp .env.local.example .env.local
# Edit .env.local and set DATABASE_URL to your local Supabase instance
# For local development, use: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

3. Start the local development environment:

```bash
# Start Supabase services (database, auth, API)
supabase start

# After supabase start completes, copy the DB URL from the output
# and set DATABASE_URL in your .env.local file accordingly
# The default local DB URL is: postgresql://postgres:postgres@127.0.0.1:54322/postgres

# In a separate terminal, start the Next.js development server
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the application.
Access the Supabase Studio at [http://localhost:54323](http://localhost:54323) for database management.

### Database Management

Supabase local development commands:

```bash
# Core database operations
supabase start           # Start all Supabase services
supabase stop            # Stop all services
supabase status          # Check service status

# Database operations
supabase db reset        # Reset database with migrations and seed data
supabase db seed         # Re-run seed data only
supabase db push         # Push local migrations to remote
supabase db pull         # Pull remote schema changes

# Development utilities
pnpm run db:backup       # Backup user data (legacy script)
pnpm run dev:local       # Start both Supabase and Next.js in parallel
```

### Test Users & Data

The database seeds create comprehensive test data:

- **2 Coaches**: coach1@ultracoach.dev, coach2@ultracoach.dev
- **10 Runners**: runner1-10@ultracoach.dev
- **10 Training Plans**: Various race distances and difficulty levels
- **19 Sample Races**: Real ultramarathon events (Western States, Leadville, etc.)
- **Password for all accounts**: password123

Access credentials are also available in `/supabase/temp/credentials/test_users_2025_07_15.txt`

## Code Quality & Formatting

The project uses modern code quality tools with automatic formatting:

### ESLint Configuration

- **ES2023 (ES14)** support with modern JavaScript features
- **Next.js** rules with TypeScript integration
- **Prettier** integration for consistent formatting
- **Custom rules** for better developer experience

### Prettier Configuration

- **Semi-colons**: Disabled (modern style)
- **Quotes**: Single quotes preferred
- **Print width**: 100 characters
- **Tab width**: 2 spaces
- **Trailing commas**: ES5 compatible

### VS Code Integration

For optimal development experience, add these VS Code settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Available Scripts

```bash
# Development
pnpm dev              # Start Next.js development server (port 3001)
pnpm dev:local        # Start both Supabase and Next.js together
pnpm dev:db           # Start only Supabase services

# Code Quality & Formatting (ES2023 support)
pnpm lint             # Run ESLint
pnpm lint:fix         # Run ESLint with auto-fix
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting without changes
pnpm typecheck        # Run TypeScript type checking

# Production
pnpm build            # Build for production (includes linting & type checking)
pnpm start            # Start production server

# Database (legacy scripts - prefer supabase CLI)
pnpm run db:setup     # Legacy database setup
pnpm run db:backup    # Backup user data
```

## Features

- **Coach-Runner Management**: Assign runners to coaches
- **Training Plans**: Create and manage structured training programs
- **Workout Tracking**: Log planned and completed workouts
- **Real-time Chat**: Communication between coaches and runners
- **Notifications**: Stay updated on training progress
- **Authentication**: Secure login with role-based access

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines and detailed setup instructions.
