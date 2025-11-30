# Claude Code Workflows & Infrastructure

Comprehensive documentation for hooks, agents, MCPs, and plugins. For quick reference, see the summary tables in `CLAUDE.md`.

---

## Table of Contents

1. [Hook Architecture](#hook-architecture)
2. [Available Agents](#available-agents)
3. [MCP Server Configuration](#mcp-server-configuration)
4. [Plugin Marketplace](#plugin-marketplace)
5. [Slash Commands Reference](#slash-commands-reference)
6. [Context Monitoring](#context-monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Hook Architecture

### Overview

UltraCoach uses a multi-layered hook system for quality assurance:

```
┌─────────────────────────────────────────────────────────┐
│                    HOOK PIPELINE                        │
├─────────────────────────────────────────────────────────┤
│  Pre-commit (Husky) - Blocks on failure                 │
│  ├── pnpm typecheck                                     │
│  ├── pnpm lint                                          │
│  └── pnpm format:check                                  │
├─────────────────────────────────────────────────────────┤
│  Pre-push (Husky) - Fast build check only               │
│  └── pnpm build (~10 seconds)                           │
├─────────────────────────────────────────────────────────┤
│  CI (GitHub Actions) - Full E2E suite                   │
│  └── pnpm test:e2e:ci                                   │
├─────────────────────────────────────────────────────────┤
│  PostToolUse (Claude Code) - Automatic                  │
│  ├── Auto-formatting (Prettier)                         │
│  ├── Next.js best practices validation                  │
│  ├── Dependency audit                                   │
│  └── Environment file sync alerts                       │
├─────────────────────────────────────────────────────────┤
│  PreToolUse (Claude Code)                               │
│  └── Conventional commits validation                    │
└─────────────────────────────────────────────────────────┘
```

### Pre-commit Hook (Husky)

**Location**: `.husky/pre-commit`

Runs synchronously before every commit. Blocks commit on failure.

**Checks performed:**

1. `pnpm typecheck` - TypeScript validation (fastest, fails early)
2. `pnpm lint` - ESLint style and syntax checks
3. `pnpm format:check` - Prettier formatting validation

**Important distinction:**

- `pnpm format` - Writes changes (use manually)
- `pnpm format:check` - Only checks, fails if unformatted (used in hook)

**If pre-commit fails:**

```bash
# Run manual format to fix
pnpm format

# Then retry commit
git add . && git commit -m "your message"
```

### Pre-push Hook (Simplified)

**Location**: `.husky/pre-push`

Runs a fast build check before pushing. E2E tests run in CI.

**Flow:**

```
┌─────────────────────┐
│ pnpm build          │
└────────┬────────────┘
         │
    ┌────▼────┐
    │ Build   │──Fail──► Block push
    │ passed? │
    └────┬────┘
         │Pass
    ┌────▼────┐
    │  PUSH   │
    └─────────┘
```

**Why simplified?**

- E2E tests run in CI anyway (no duplication needed)
- Server startup (60s) was causing timeouts
- Build check catches most real issues (~10 seconds)
- Use `/husky` command for full local checks when needed

**For full local checks:**

```bash
/husky                    # Runs typecheck, lint, format, tests, build
/husky --skip-tests       # Skip E2E tests
```

### PostToolUse Hooks (Claude Code)

**Location**: `.claude/settings.local.json`

Automatically triggered after Claude Code uses certain tools.

#### 1. Auto-Formatting Hook

**Triggers**: After Write/Edit tools on code files

**Supported extensions:**

- JavaScript/TypeScript: `.js`, `.ts`, `.jsx`, `.tsx`
- Web: `.json`, `.css`, `.html`
- Others: `.py`, `.go`, `.rs`, `.php`

**Action**: Runs `prettier --write` or language-specific formatter

#### 2. Next.js Best Practices Validator

**Triggers**: After Write/Edit on Next.js App Router files

**Checks:**

- Default exports in page/layout components
- Server/Client component directives
- Interactive code detection in Server Components
- `next/image` and `next/link` usage suggestions
- Component props validation

#### 3. Dependency Audit Hook

**Triggers**: After changes to `package.json` or `requirements.txt`

**Actions:**

- Runs `npm audit` for Node.js projects
- Runs `safety check` for Python projects
- Reports vulnerabilities

#### 4. Environment File Sync Hook

**Triggers**: After changes to `.env*` files

**Actions:**

- Alerts about environment file changes
- Checks for Vercel token availability
- Suggests sync if configured

### PreToolUse Hooks (Claude Code)

#### Conventional Commits Validator

**Triggers**: Before git commit commands

**Validates commit message format:**

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Allowed types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, semicolons)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding/updating tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Reverting commits

**Examples:**

```bash
# Good
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix: resolve race condition in workout sync"

# Bad - will be blocked
git commit -m "updated stuff"
git commit -m "WIP"
```

---

## Available Agents

All agents use **Opus 4.5** model for maximum capability.

### fullstack-developer

**Use when:** Building end-to-end features that touch UI, API, and database.

**Tools:** Read, Write, Edit, Bash

**Capabilities:**

- React component architecture
- Next.js API routes
- Database schema design
- Authentication flows
- State management patterns

#### Example invocation:

```text
"Create a new feature for tracking race results with UI, API, and database"
```

### frontend-developer

**Use when:** Building React components, UI work, accessibility improvements.

**Tools:** Read, Write, Edit, Bash

**Capabilities:**

- React hooks and patterns
- Tailwind CSS styling
- Responsive design
- Accessibility (WCAG compliance)
- Performance optimization

#### Example invocation:

```text
"Build a responsive race calendar component with proper ARIA labels"
```

### typescript-pro

**Use when:** Complex type system work, migrations, type safety improvements.

**Tools:** Read, Write, Edit, Bash

**Capabilities:**

- Advanced generics
- Conditional types
- Type inference optimization
- TypeScript configuration
- JavaScript to TypeScript migration

#### Example invocation:

```text
"Create type-safe API response handlers with proper error typing"
```

### mcp-expert

**Use when:** Configuring MCP servers, protocol integration.

**Tools:** Read, Write, Edit

**Capabilities:**

- MCP server configuration
- Protocol specifications
- Integration patterns
- Authentication setup

#### Example invocation:

```text
"Configure a new MCP server for Stripe integration"
```

### context-manager

**Use when:** Multi-agent workflows, long-running tasks, context preservation.

**Tools:** Read, Write, Edit, TodoWrite

**Capabilities:**

- Context capture and distribution
- Session state management
- Agent coordination
- Memory management

#### Example invocation:

```text
"Maintain context across multiple feature development sessions"
```

### dependency-manager

**Use when:** Updating dependencies, vulnerability scanning, license compliance.

**Tools:** (Implicit - Bash, Read, Write)

**Capabilities:**

- Dependency analysis
- Vulnerability scanning (npm audit, safety)
- License compliance checking
- Safe dependency updates

#### Example invocation:

```text
"Scan for vulnerabilities and update outdated dependencies"
```

---

## MCP Server Configuration

**Location**: `.mcp.json`

### Configured Servers

#### Supabase MCP

**Package:** `@supabase/mcp-server-supabase@latest`

**Configuration:**

- Read-only mode enabled
- Project ref: `ccnbzjpccmlribljugve`
- Authentication: `SUPABASE_ACCESS_TOKEN` env var

**Use for:**

- Database schema queries
- Table structure inspection
- Read-only data exploration

#### PostgreSQL MCP

**Package:** `@modelcontextprotocol/server-postgres`

**Configuration:**

- Local connection: `postgres://postgres:postgres@127.0.0.1:54322/postgres`

**Use for:**

- Local database queries
- Development database operations
- SQL execution

#### Memory MCP

**Package:** `@modelcontextprotocol/server-memory`

**Use for:**

- Persistent context storage
- Session state preservation
- Cross-session memory

### Additional Enabled MCPs (settings.local.json)

- **Context7** - Library documentation fetching
- **GitHub** - Repository management
- **Linear** - Issue tracking

### Adding New MCP Servers

1. Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "new-server": {
      "command": "npx",
      "args": ["-y", "package-name@latest"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

2. Enable in `settings.local.json` permissions if needed

---

## Plugin Marketplace

Available plugins provide additional specialized commands and agents.

### git-workflow

Git Flow operations and branch management.

**Commands:**

- `/git-workflow:feature <name>` - Create feature branch
- `/git-workflow:release <version>` - Create release branch
- `/git-workflow:hotfix <name>` - Create hotfix branch
- `/git-workflow:finish` - Complete current branch
- `/git-workflow:flow-status` - Show Git Flow status

### testing-suite

Comprehensive testing infrastructure.

**Commands:**

- `/testing-suite:generate-tests` - Generate test suite
- `/testing-suite:e2e-setup` - Configure E2E testing
- `/testing-suite:test-coverage` - Analyze coverage
- `/testing-suite:setup-visual-testing` - Visual regression setup
- `/testing-suite:setup-load-testing` - Load testing config

**Agents:**

- `senior-qa-engineer` - Test automation specialist

### pr-review-toolkit

Pull request review and code quality.

**Commands:**

- `/pr-review-toolkit:review-pr` - Comprehensive PR review

**Agents:**

- `code-reviewer` - Code review specialist
- `code-simplifier` - Code simplification
- `comment-analyzer` - Comment quality analysis
- `pr-test-analyzer` - Test coverage analysis
- `silent-failure-hunter` - Error handling review
- `type-design-analyzer` - Type design review

### nextjs-vercel-pro

Next.js and Vercel deployment optimization.

**Commands:**

- `/nextjs-vercel-pro:nextjs-scaffold` - Create Next.js app
- `/nextjs-vercel-pro:nextjs-component-generator` - Generate components
- `/nextjs-vercel-pro:vercel-deploy-optimize` - Deployment optimization
- `/nextjs-vercel-pro:vercel-edge-function` - Edge function generation

**Agents:**

- `frontend-developer` - React specialist
- `fullstack-developer` - Full-stack specialist

### supabase-toolkit

Supabase database operations.

**Commands:**

- `/supabase-toolkit:supabase-backup-manager` - Backup management
- `/supabase-toolkit:supabase-data-explorer` - Data exploration
- `/supabase-toolkit:supabase-migration-assistant` - Migration management
- `/supabase-toolkit:supabase-performance-optimizer` - Performance tuning
- `/supabase-toolkit:supabase-schema-sync` - Schema synchronization

**Agents:**

- `data-engineer` - Data pipeline specialist
- `data-scientist` - Analytics specialist

### commit-commands

Git commit automation.

**Commands:**

- `/commit-commands:commit` - Create git commit
- `/commit-commands:commit-push-pr` - Commit, push, and create PR
- `/commit-commands:clean_gone` - Clean deleted remote branches

### feature-dev

Feature development workflow.

**Commands:**

- `/feature-dev:feature-dev` - Guided feature development

**Agents:**

- `code-architect` - Architecture design
- `code-explorer` - Codebase analysis
- `code-reviewer` - Code review

---

## Slash Commands Reference

### Project-Specific Commands

| Command                           | Purpose                     | Example                                               |
| --------------------------------- | --------------------------- | ----------------------------------------------------- |
| `/husky`                          | Run CI checks with auto-fix | `/husky --skip-tests`                                 |
| `/nextjs-component-generator`     | Generate Next.js component  | `/nextjs-component-generator WorkoutCard --client`    |
| `/nextjs-api-tester`              | Test API routes             | `/nextjs-api-tester /api/workouts --method=POST`      |
| `/nextjs-performance-audit`       | Performance analysis        | `/nextjs-performance-audit --all`                     |
| `/supabase-migration-assistant`   | Database migrations         | `/supabase-migration-assistant --create`              |
| `/supabase-data-explorer`         | Query database              | `/supabase-data-explorer workouts --query "SELECT *"` |
| `/supabase-schema-sync`           | Sync schema                 | `/supabase-schema-sync --pull`                        |
| `/supabase-performance-optimizer` | DB optimization             | `/supabase-performance-optimizer --indexes`           |
| `/vercel-deploy-optimize`         | Deploy to Vercel            | `/vercel-deploy-optimize production --analyze`        |
| `/vercel-env-sync`                | Sync env variables          | `/vercel-env-sync --pull`                             |

---

## Context Monitoring

### Status Line Display

The context monitor displays real-time session information:

```
[opus] ~/ultracoach (main +5) [████████░░] 78% | $1.23 | 45m
```

**Components:**

- `[opus]` - Current model
- `~/ultracoach` - Working directory
- `(main +5)` - Git branch with uncommitted files
- `[████████░░]` - Context usage bar
- `78%` - Context percentage
- `$1.23` - Session cost
- `45m` - Session duration

### Color Coding

| Context % | Color  | Meaning                                 |
| --------- | ------ | --------------------------------------- |
| 0-50%     | Green  | Plenty of context available             |
| 50-75%    | Yellow | Monitor usage                           |
| 75-90%    | Orange | Consider context management             |
| 90%+      | Red    | Critical - wrap up or start new session |

### Managing Context

When context is high:

1. Complete current task
2. Use `/commit` to save progress
3. Start new session for next task
4. Use `context-manager` agent for complex workflows

---

## Troubleshooting

### Pre-commit Hook Failures

**Symptom:** Commit blocked by pre-commit hook

**Solutions:**

1. Run `pnpm format` to fix formatting
2. Run `pnpm lint --fix` to auto-fix lint errors
3. Fix TypeScript errors shown in output
4. Retry commit

### Pre-push Hook Failures

**Symptom:** Push blocked, build failing

**Solutions:**

1. Fix build errors shown in output
2. Run `pnpm build` locally to debug
3. Check for TypeScript errors: `pnpm typecheck`

**For full local checks before pushing:**

```bash
/husky                # Runs typecheck, lint, format, tests, build
/husky --skip-tests   # Skip E2E tests
```

### Conventional Commits Blocked

**Symptom:** Commit rejected for message format

**Solution:** Use proper format:

```bash
git commit -m "feat: add new feature"
git commit -m "fix(auth): resolve login issue"
```

### MCP Connection Issues

**Symptom:** MCP tools not responding

**Solutions:**

1. Check environment variables are set
2. Verify network connectivity
3. Restart Claude Code session
4. Check `.mcp.json` configuration

---

## Quick Reference Card

```text
HOOKS:
  Pre-commit: typecheck → lint → format:check (blocking)
  Pre-push:   build only (~10s)
  CI:         full E2E suite

COMMANDS:
  /husky              - Full CI checks (when you want thorough local testing)
  /supabase-*         - Database operations
  /vercel-*           - Deployment
  /nextjs-*           - Component/API tools

AGENTS (all Opus 4.5):
  fullstack-developer - E2E features
  frontend-developer  - React/UI
  typescript-pro      - Types
  dependency-manager  - Security

WORKFLOW:
  Write code → PostToolUse auto-formats
  Commit     → Pre-commit validates
  Push       → Pre-push builds (~10s)
  CI         → Full E2E tests
```

---

_Last updated: 2025-11-30_
