# Charlie Build Configuration Setup

This document explains how Charlie AI code review bot is configured to run production builds locally in ephemeral environments.

## Overview

Charlie now includes `pnpm build:charlie` as a check command, allowing it to verify build integrity during PR reviews without requiring real environment variables or database connectivity.

## How It Works

### Build Command

- **Command**: `pnpm build:charlie`
- **What it does (safe backup/restore)**:
  1. If a `.env.local` exists, it is moved to a backup file `.env.local.charlie.backup`.
  2. Copies `.env.charlie` to `.env.local` for the duration of the build.
  3. Runs `next build` to verify the production build.
  4. Always removes the temporary `.env.local` and restores the original `.env.local` from the backup in a finally-style step (via shell `trap`), even if the build fails or is interrupted.
- **Purpose**: Catches TypeScript errors, missing dependencies, and build-time issues without risking loss of a developer's local environment file.

> Portability & Guarantees
>
> - Requires Bash (macOS/Linux/WSL). On Windows, run via Git Bash or WSL.
> - The script traps EXIT/INT/TERM to guarantee cleanup and restoration.
> - It fails fast if `.env.charlie` is missing and avoids overwriting an existing `.env.local.charlie.backup` by using a timestamped filename when needed.

### Environment Variables

- **File**: `.env.charlie` (tracked in version control)
- **Contents**: Dummy values that allow Next.js to build successfully
- **Safety**: All values are fake/dummy credentials, safe to commit publicly
- **Scope**: Build-time only. Do not use `.env.charlie` for local development or production; it exists solely so Charlie can run a production build in ephemeral environments.

### Configuration

- **File**: `.charlie/config.yml`
- **Check Commands**:
  - `fix: pnpm format` - Auto-format code
  - `lint: pnpm lint` - Check code quality
  - `types: pnpm typecheck` - Verify TypeScript
  - `test: pnpm test:run` - Run unit tests
  - `build: pnpm build:charlie` - Verify production build

## Testing Locally

To test the Charlie build process locally:

```bash
# Test the build command directly
pnpm build:charlie

# Or run all Charlie check commands
pnpm format && pnpm lint && pnpm typecheck && pnpm test:run && pnpm build:charlie
```

## Environment Variables Explained

The `.env.charlie` file contains minimal dummy values required for Next.js build:

| Variable                        | Purpose                | Value                |
| ------------------------------- | ---------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase endpoint      | Dummy URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key    | Dummy key            |
| `BETTER_AUTH_SECRET`            | Auth encryption secret | 64-char hex dummy    |
| `DATABASE_URL`                  | Database connection    | Dummy PostgreSQL URL |
| `NODE_ENV`                      | Environment mode       | `production`         |

## Troubleshooting

### Build Fails with "Missing Environment Variable"

1. Check if the variable is defined in `.env.charlie`
2. Add missing variables with dummy values
3. Ensure the variable is referenced correctly in code

### Build Fails with TypeScript Errors

1. Fix TypeScript errors in the codebase
2. Run `pnpm typecheck` locally to verify
3. The build command will catch these before merge

### Build Succeeds Locally but Fails for Charlie

1. Ensure `.env.charlie` is committed to version control
2. Check that `build:charlie` script exists in `package.json`
3. Verify `.charlie/config.yml` includes the build command

## Benefits

1. **Early Detection**: Catches build issues before merge
2. **No Credentials**: No real secrets exposed in Charlie's environment
3. **Comprehensive**: Verifies entire build pipeline
4. **Fast Feedback**: Provides immediate build status in PR reviews

## Maintenance

### Adding New Environment Variables

1. Add dummy values to `.env.charlie`
2. Test locally with `pnpm build:charlie`
3. Commit changes

### Updating Dummy Values

- Keep dummy values clearly identifiable as fake
- Ensure they meet format requirements (URL, length, etc.)
- Test after changes to ensure build still works

## Security Notes

- ✅ `.env.charlie` contains only dummy values
- ✅ Safe to commit to public repositories
- ✅ No real credentials exposed to Charlie
- ✅ Build process doesn't connect to real services
- ❌ Never put real credentials in `.env.charlie`
- ❌ Don't use `.env.charlie` for development/production

## Related Files

- `.charlie/config.yml` - Charlie configuration
- `.env.charlie` - Dummy environment variables
- `package.json` - Build script definitions
- `.gitignore` - Ensures `.env.charlie` is tracked
