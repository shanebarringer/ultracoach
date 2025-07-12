# UltraCoach

A Next.js application for ultra-marathon training management with coach-runner relationships, training plans, and workout tracking.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Package Manager**: pnpm (for better performance and disk efficiency)
- **Database**: Supabase with PostgreSQL
- **Authentication**: NextAuth.js with custom credentials
- **Styling**: Tailwind CSS v4
- **State Management**: Jotai

## Getting Started

### Prerequisites

Install pnpm if you haven't already:
```bash
npm install -g pnpm
```

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Add your Supabase credentials and database password
```

4. Set up the database:
```bash
pnpm run db:setup
```

### Development

Start the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Database Commands

Rails-style database management:
```bash
pnpm run db:setup        # Complete setup with schema, seeds, and test users
pnpm run db:reset        # Reset database (drop + recreate + seed)
pnpm run db:seed         # Seed database with sample data only
pnpm run db:fix-passwords # Fix test user password hashes
pnpm run db:backup       # Backup user data before major changes
```

### Test Users

The database setup creates test accounts:
- **Coaches**: coach1@ultracoach.dev, coach2@ultracoach.dev
- **Runners**: runner1-10@ultracoach.dev
- **Password**: password123

## Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run linting
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
