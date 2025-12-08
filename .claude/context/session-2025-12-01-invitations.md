# Context Summary: Coach Invitations Session (2025-12-01)

## Session Overview

This session focused on completing the coach invitations feature, including database migrations and investigating email delivery issues.

## Completed Work

### 1. Vercel URL Priority for Production Links (PR Core Change)

**Implementation**: `src/lib/invitation-tokens.ts` (lines 105-141)

The `getBaseUrl()` function now uses proper priority for production URL resolution:

```typescript
// Priority order:
// 1. NEXT_PUBLIC_APP_URL - Explicitly set app URL (recommended for production)
// 2. VERCEL_PROJECT_PRODUCTION_URL - Auto-set by Vercel for production domain
// 3. VERCEL_URL - Auto-set by Vercel for preview/production deployments
// 4. DEFAULT_BASE_URL - Fallback for local development
```

**Why this matters:**
- `VERCEL_PROJECT_PRODUCTION_URL` gives the actual production domain (e.g., `www.ultracoach.dev`)
- `VERCEL_URL` gives deployment-specific URLs (e.g., `ultracoach-git-feature-xxx.vercel.app`)
- Using the production URL ensures invitation links work correctly in production emails

### 2. Database Migrations Applied

**Migration 0019: Make token_hash unique**

- File: `/Users/MXB5594/playground/ultracoach/supabase/migrations/0019_make_token_hash_unique.sql`
- Purpose: Security enhancement - prevents token collision attacks
- Applied to: Both dev and prod databases

**Migration 0020: Add revoked_at column**

- File: `/Users/MXB5594/playground/ultracoach/supabase/migrations/0020_add_revoked_at_column.sql`
- Purpose: Audit trail for revoked invitations
- Applied to: Both dev and prod databases

### 2. Email Delivery Investigation

**Root Cause Identified**: `RESEND_FROM_EMAIL` environment variable not set in Vercel production

**Current Behavior** (from `/Users/MXB5594/playground/ultracoach/src/lib/email/send-email.ts` line 47):

```typescript
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'UltraCoach <onboarding@resend.dev>'
}
```

When `RESEND_FROM_EMAIL` is not set, emails fall back to `onboarding@resend.dev` (Resend sandbox address), which only delivers to verified accounts.

## Pending Actions

### 1. Fix Email Delivery (HIGH PRIORITY)

Add to Vercel environment variables:

```bash
RESEND_FROM_EMAIL=UltraCoach <shane@ultracoach.dev>
```

- Go to Vercel Dashboard > Settings > Environment Variables
- Add for Production (and optionally Preview/Development)
- Redeploy the application

### 2. Setup Browserbase MCP

Command to run:

```bash
claude mcp add-json "browserbase" '{"command":"npx","args":["-y","@browserbasehq/mcp-server-browserbase"],"env":{"BROWSERBASE_API_KEY":"YOUR_API_KEY","BROWSERBASE_PROJECT_ID":"YOUR_PROJECT_ID"}}'
```

## Key Files

| File                                                  | Purpose                                       |
| ----------------------------------------------------- | --------------------------------------------- |
| `src/lib/email/send-email.ts`                         | Email sending utility with Resend integration |
| `src/app/api/invitations/[id]/revoke/route.ts`        | Invitation revoke endpoint                    |
| `supabase/migrations/0019_make_token_hash_unique.sql` | Token uniqueness migration                    |
| `supabase/migrations/0020_add_revoked_at_column.sql`  | Revocation tracking migration                 |

## Technical Details

### Email Service Architecture

- **Provider**: Resend
- **Lazy initialization**: Client created at request time for serverless compatibility
- **GDPR compliant**: Email addresses (PII) not logged
- **Dev mode**: Skips sending, logs preview for testing

### Invitation Security

- Token hashes are now unique (prevents collision attacks)
- Revocation timestamps provide audit trail
- Transaction wrapper ensures database consistency

## Git Status

- Branch: `feature/coach-invitations`
- Recent commits:
  - `bf9e270` - fix(invitations): add revoked_at column, transaction wrapper, and role validation
  - `ac67d6b` - fix(invitations): address final PR review feedback
  - `520326a` - fix(invitations): address code review feedback for PR #231

## Next Session Recommendations

1. Verify email delivery after setting `RESEND_FROM_EMAIL` in Vercel
2. Test full invitation flow end-to-end in production
3. Consider adding email delivery status to invitation list UI
4. Setup Browserbase MCP for browser automation testing
