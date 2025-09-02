# UltraCoach 🏔️

A professional ultramarathon coaching platform built with Next.js 15, enabling sophisticated training programs, real-time coach-runner communication, and comprehensive performance tracking.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![Test Coverage](https://img.shields.io/badge/tests-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Tech Stack

### Core Technologies

- **Framework**: Next.js 15.3.5 with App Router, React 19, TypeScript 5
- **Package Manager**: pnpm (optimized performance and disk efficiency)
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with custom session management
- **State Management**: Jotai atomic state management with performance optimizations

### UI & Design

- **Component Library**: HeroUI with Mountain Peak Enhanced design system
- **Styling**: Tailwind CSS v3 with custom alpine theme
- **Icons**: Lucide React for consistent iconography
- **Animations**: Framer Motion for smooth interactions

### Developer Experience

- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **CI/CD**: GitHub Actions with automated testing
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks
- **Type Safety**: 100% TypeScript with strict mode

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/ultracoach.git
cd ultracoach

# Install dependencies
pnpm install

# Set up environment
cp .env.local.example .env.local

# Start development environment
supabase start  # Start database (requires Docker)
pnpm dev        # Start Next.js dev server

# Open http://localhost:3001
```

## 📋 Prerequisites

- **Node.js** 18+ (recommend 20+)
- **pnpm** package manager
- **Docker Desktop** for local database
- **Git** for version control

### Installation Steps

#### 1. Install Required Tools

```bash
# Install pnpm globally
npm install -g pnpm

# Install Supabase CLI
npm install -g supabase

# Verify installations
node --version    # Should be 18+
pnpm --version    # Should be 8+
docker --version  # Docker Desktop should be running
```

#### 2. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-username/ultracoach.git
cd ultracoach

# Install dependencies
pnpm install

# Copy environment template
cp .env.local.example .env.local
```

#### 3. Configure Environment

Edit `.env.local` with your configuration:

```env
# Database (local Supabase)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Authentication
BETTER_AUTH_SECRET=your-secret-here  # Generate with: openssl rand -hex 32

# Email (optional for local dev)
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

#### 4. Start Development Environment

```bash
# Terminal 1: Start Supabase (database, auth, storage)
supabase start

# Terminal 2: Run database migrations
supabase db reset

# Terminal 3: Start Next.js development server
pnpm dev
```

#### 5. Access the Application

- **Application**: [http://localhost:3001](http://localhost:3001)
- **Supabase Studio**: [http://localhost:54323](http://localhost:54323)
- **API Documentation**: [http://localhost:3001/api](http://localhost:3001/api)

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

### 🧪 Test Data

The project includes comprehensive test data for development:

#### Available Test Users

- **Coach Account**: `emma@ultracoach.dev`
- **Runner Accounts**: `alex.rivera@ultracoach.dev`, `riley.parker@ultracoach.dev`

_Test credentials are managed securely through environment variables and CI/CD configuration._

#### Development Seed Data

- **Multiple Training Plans**: Various ultra distances (50K, 50M, 100K, 100M)
- **19 Real Races**: Western States, Leadville, UTMB, Hardrock, etc.
- **Workout Templates**: Base building, speed work, long runs, recovery
- **Sample Messages**: Coach-runner communication examples

#### Creating Test Users

```bash
# Create test users for local development
export $(grep -v '^#' .env.local | xargs) && pnpm tsx scripts/testing/create-playwright-test-users.ts

# Run comprehensive database seed
pnpm tsx scripts/database/comprehensive-seed.ts
```

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

## 📦 Available Scripts

### Development

```bash
pnpm dev              # Start Next.js development server (port 3001)
pnpm dev:local        # Start both Supabase and Next.js together
pnpm dev:db           # Start only Supabase services
```

### Testing

```bash
pnpm test             # Run Vitest tests in watch mode
pnpm test:run         # Run Vitest tests once
pnpm playwright test  # Run Playwright E2E tests
```

### Code Quality

```bash
pnpm lint             # Run ESLint
pnpm lint:fix         # Run ESLint with auto-fix
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting
pnpm typecheck        # Run TypeScript type checking
```

### Database Management

```bash
pnpm db:connect       # Connect to database via psql
pnpm db:query         # Run SQL queries
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio
pnpm db:seed          # Seed database with test data
```

### Production

```bash
pnpm build            # Build for production
pnpm start            # Start production server
```

## 🏆 Key Features

### ✅ **Production-Ready Core Platform**

- **Advanced Authentication**: Better Auth with role-based access and session management
- **Real-time Communication**: Coach-runner chat with typing indicators and message synchronization
- **Comprehensive Training Plans**: Race-centric planning with periodization and phase progression
- **Strava Integration**: OAuth flow, bi-directional sync, and performance metrics analysis
- **Mountain Peak Design**: Professional alpine-themed UI with HeroUI components
- **Advanced State Management**: Jotai atomic patterns with performance optimization

### 🏃‍♂️ **Coach & Runner Experience**

- **Coach Dashboard**: Athlete management, progress tracking, and performance analytics
- **Runner Dashboard**: Training plan overview, workout tracking, and progress visualization
- **Relationship Management**: Flexible coach-runner connections with invitation system
- **Workout Management**: Detailed workout logging, completion tracking, and progress analysis
- **Race Targeting**: Goal-oriented training plans built around specific ultramarathon events

### 🛠️ **Technical Excellence**

- **Zero TypeScript Errors**: Full type safety with strict mode enforcement
- **Zero ESLint Warnings**: Clean, maintainable codebase with modern patterns
- **Production Database**: Comprehensive relationships and data integrity
- **Mobile-Optimized**: Responsive design with touch-friendly interactions
- **Real-time Updates**: Sub-second latency with error resilience and graceful fallbacks

## 📈 Project Status

### Current Phase: Production Readiness

- ✅ **Core Platform Complete**: All essential features implemented
- ✅ **Type Safety**: 100% TypeScript with zero errors
- ✅ **Test Coverage**: Comprehensive unit and E2E tests
- ✅ **CI/CD Pipeline**: Automated testing on all PRs
- 🔄 **Active Development**: Performance optimizations and feature enhancements

### Recent Achievements

- Completed comprehensive codebase reorganization
- Implemented advanced Jotai state management patterns
- Integrated Strava OAuth with bi-directional sync
- Built real-time messaging with typing indicators
- Achieved zero ESLint warnings and TypeScript errors

## 📁 Project Structure

```
ultracoach/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and configurations
│   ├── providers/           # React context providers
│   └── types/               # TypeScript type definitions
├── scripts/
│   ├── auth/                # Authentication scripts
│   ├── database/            # Database operations
│   ├── debug/               # Debug utilities
│   ├── migration/           # Database migrations
│   ├── strava/              # Strava integration
│   └── testing/             # Test utilities
├── supabase/
│   ├── migrations/          # Database schema migrations
│   └── seed.sql             # Database seed data
├── tests/                   # Playwright E2E tests
└── public/                  # Static assets
```

## 🤝 Contributing

We welcome contributions! Please see [CLAUDE.md](./CLAUDE.md) for development guidelines and detailed setup instructions.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) by Vercel
- UI components from [HeroUI](https://heroui.com/)
- Database powered by [Supabase](https://supabase.com/)
- Authentication by [Better Auth](https://better-auth.com/)
- State management with [Jotai](https://jotai.org/)

---

<p align="center">Made with ❤️ for the ultrarunning community</p>
