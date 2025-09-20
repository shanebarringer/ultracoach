# UltraCoach Code Conventions

## Code Style & Formatting

- **Prefer self-documenting code**: Add brief comments only for non-obvious intent, invariants, and public APIs
- **Prettier formatting**: Always run `pnpm format` before committing changes
- **ESLint compliance**: Code must pass `pnpm lint` without warnings
- **TypeScript strict mode**: All code must have proper type annotations

## Naming Conventions

### Files & Components

- React components: PascalCase (e.g., `TrainingPlanCard.tsx`)
- Client components: Suffix with `Client` (e.g., `DashboardClient.tsx`)
- Utility files: camelCase (e.g., `dateUtils.ts`)
- API routes: kebab-case (e.g., `/api/training-plans/route.ts`)

### Variables & Functions

- camelCase for variables and functions
- PascalCase for types and interfaces
- SCREAMING_SNAKE_CASE for constants
- Prefix boolean variables with `is`, `has`, `can`, `should`

## Import Organization

Use the configured import sorting:

1. Node modules
2. Internal imports (absolute paths)
3. Relative imports
4. Type-only imports at the end

## State Management Rules

### Jotai Atoms

- Use `useAtomValue` when only reading (no setter needed)
- Use `useSetAtom` when only writing (no subscription needed)
- Use `useAtom` when both reading and writing the same atom
- Never use `any` type - always define proper atom types

### Server/Client Components

- Server components handle authentication, redirects, and data fetching
- Client components handle interactivity and state management
- Always use `await headers()` in server components to force dynamic rendering

## Error Handling

- Use structured logging with `tslog` - never `console.log`
- Handle async operations with proper try/catch blocks
- Provide meaningful error messages to users
- Use toast notifications for user feedback

## Authentication Patterns

- Use `getServerSession()` in server components
- Store user type in `userType` field (not `role`)
- Filter database queries by `user.userType` for coach/runner separation
- Use `credentials: 'same-origin'` for internal API calls

## File Organization

- Place client components in same directory as server component
- Group related utilities in `lib/` directory
- Keep atom definitions in `lib/atoms.ts`
- API routes follow REST conventions
