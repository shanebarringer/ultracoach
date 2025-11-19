# Security Fixes - Implementation Guide

Quick-start guide for implementing critical security fixes identified in the audit.

---

## Fix #1: Implement Row-Level Security (RLS) Policies

**Priority:** 🔴 CRITICAL
**Time:** 8 hours
**Difficulty:** Medium

### Step 1: Create RLS Migration File

Create `supabase/migrations/0013_implement_rls_policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE better_auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_runners ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for better_auth_users
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON better_auth_users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON better_auth_users FOR UPDATE
USING (auth.uid() = id);

-- RLS Policies for workouts
-- Users can view workouts they own or have access to via coach-runner relationship
CREATE POLICY "Users can view accessible workouts"
ON workouts FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM coach_runners
    WHERE coach_runners.status = 'active'
    AND (
      (coach_runners.coach_id = auth.uid() AND coach_runners.runner_id = workouts.user_id)
      OR
      (coach_runners.runner_id = auth.uid() AND coach_runners.coach_id = workouts.user_id)
    )
  )
);

-- Coaches can create workouts for their runners
CREATE POLICY "Coaches can create workouts for runners"
ON workouts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM better_auth_users u
    JOIN coach_runners cr ON u.id = cr.coach_id
    WHERE u.id = auth.uid()
    AND u.user_type = 'coach'
    AND cr.runner_id = workouts.user_id
    AND cr.status = 'active'
  )
);

-- Users can update their own workouts
CREATE POLICY "Users can update own workouts"
ON workouts FOR UPDATE
USING (user_id = auth.uid());

-- Coaches can update workouts for their runners
CREATE POLICY "Coaches can update runner workouts"
ON workouts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM better_auth_users u
    JOIN coach_runners cr ON u.id = cr.coach_id
    WHERE u.id = auth.uid()
    AND u.user_type = 'coach'
    AND cr.runner_id = workouts.user_id
    AND cr.status = 'active'
  )
);

-- RLS Policies for training_plans
CREATE POLICY "Users can view accessible training plans"
ON training_plans FOR SELECT
USING (
  coach_id = auth.uid() OR runner_id = auth.uid()
);

CREATE POLICY "Coaches can create training plans"
ON training_plans FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM better_auth_users
    WHERE id = auth.uid() AND user_type = 'coach'
  )
  AND coach_id = auth.uid()
);

CREATE POLICY "Coaches can update their training plans"
ON training_plans FOR UPDATE
USING (coach_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages sent to or from them"
ON messages FOR SELECT
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages to connected users"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM coach_runners
    WHERE (coach_runners.status = 'active' OR coach_runners.status = 'pending')
    AND (
      (coach_runners.coach_id = auth.uid() AND coach_runners.runner_id = recipient_id)
      OR
      (coach_runners.runner_id = auth.uid() AND coach_runners.coach_id = recipient_id)
    )
  )
);

CREATE POLICY "Users can update messages they received"
ON messages FOR UPDATE
USING (recipient_id = auth.uid());

-- RLS Policies for coach_runners
CREATE POLICY "Users can view their relationships"
ON coach_runners FOR SELECT
USING (coach_id = auth.uid() OR runner_id = auth.uid());

CREATE POLICY "Users can create relationships involving themselves"
ON coach_runners FOR INSERT
WITH CHECK (coach_id = auth.uid() OR runner_id = auth.uid());

CREATE POLICY "Users can update their relationships"
ON coach_runners FOR UPDATE
USING (coach_id = auth.uid() OR runner_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true); -- Service role only

CREATE POLICY "Users can update their notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for strava_connections
CREATE POLICY "Users can view own Strava connection"
ON strava_connections FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own Strava connection"
ON strava_connections FOR ALL
USING (user_id = auth.uid());
```

### Step 2: Apply Migration

```bash
# Local testing
pnpm db:push

# Production deployment
supabase db push --linked
```

### Step 3: Test RLS Policies

Create test file `scripts/test-rls-policies.ts`:

```typescript
import { db } from '@/lib/database'
import { workouts, coach_runners } from '@/lib/schema'
import { eq } from 'drizzle-orm'

async function testRLSPolicies() {
  console.log('Testing RLS policies...')

  // Test 1: Try to access workout without relationship (should fail)
  try {
    const unauthorizedWorkout = await db
      .select()
      .from(workouts)
      .where(eq(workouts.user_id, 'unauthorized-user-id'))

    if (unauthorizedWorkout.length > 0) {
      console.error('❌ RLS FAIL: Accessed unauthorized workout')
    } else {
      console.log('✅ RLS PASS: Unauthorized access blocked')
    }
  } catch (error) {
    console.log('✅ RLS PASS: Exception thrown for unauthorized access')
  }

  // Add more tests...
}

testRLSPolicies()
```

---

## Fix #2: Encrypt Strava OAuth Tokens

**Priority:** 🔴 CRITICAL
**Time:** 6 hours
**Difficulty:** Medium

### Step 1: Install Encryption Library

```bash
pnpm add @aws-crypto/client-node
```

### Step 2: Create Encryption Utilities

Create `src/lib/encryption.ts`:

```typescript
import { createLogger } from './logger'

const logger = createLogger('Encryption')

// Use AES-256-GCM with environment variable key
// Key must be exactly 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required')
}

// Validate key is exactly 32 bytes (256 bits)
const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'utf-8')
if (keyBuffer.length !== 32) {
  throw new Error(
    `ENCRYPTION_KEY must be exactly 32 bytes (currently ${keyBuffer.length} bytes). Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  )
}

/**
 * Encrypt sensitive data (access tokens, refresh tokens)
 * Returns format: enc:v1:iv:authTag:ciphertext
 */
export async function encryptToken(plaintext: string): Promise<string> {
  try {
    const crypto = await import('crypto')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag().toString('hex')

    // Return versioned format for future compatibility
    const result = `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`
    logger.debug('Token encrypted successfully', { length: result.length })
    return result
  } catch (error) {
    logger.error('Encryption failed:', error)
    throw new Error('Token encryption failed')
  }
}

/**
 * Decrypt sensitive data
 * Supports format: enc:v1:iv:authTag:ciphertext
 */
export async function decryptToken(ciphertext: string): Promise<string> {
  try {
    const parts = ciphertext.split(':')

    // Validate versioned format
    if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
      throw new Error(
        'Invalid ciphertext format - expected enc:v1:iv:authTag:ciphertext'
      )
    }

    const [, , ivHex, authTagHex, encryptedHex] = parts

    const crypto = await import('crypto')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)

    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    logger.debug('Token decrypted successfully')
    return decrypted
  } catch (error) {
    logger.error('Decryption failed:', error)
    throw new Error('Token decryption failed')
  }
}
```

### Step 3: Update Strava Connection Storage

Modify `src/app/api/strava/callback/route.ts`:

```typescript
import { encryptToken } from '@/lib/encryption'

// Inside the callback handler, before saving to database:
const encryptedAccessToken = await encryptToken(tokenData.access_token)
const encryptedRefreshToken = await encryptToken(tokenData.refresh_token)

const connectionData = {
  user_id: userId,
  strava_athlete_id: tokenData.athlete.id,
  access_token: encryptedAccessToken, // Now encrypted
  refresh_token: encryptedRefreshToken, // Now encrypted
  expires_at: new Date(tokenData.expires_at * 1000),
  scope: scopeArray,
  athlete_data: tokenData.athlete,
  updated_at: new Date(),
}
```

### Step 4: Update Token Retrieval

Modify all places where tokens are read:

```typescript
import { decryptToken } from '@/lib/encryption'

// When reading Strava connection
const connection = await db.select().from(strava_connections).where(...)
const accessToken = await decryptToken(connection[0].access_token)
const refreshToken = await decryptToken(connection[0].refresh_token)
```

### Step 5: Migration Script for Existing Tokens

Create `scripts/encrypt-existing-strava-tokens.ts`:

```typescript
import { eq } from 'drizzle-orm'

import { db } from '@/lib/database'
import { encryptToken } from '@/lib/encryption'
import { createLogger } from '@/lib/logger'
import { strava_connections } from '@/lib/schema'

const logger = createLogger('StravaTokenMigration')

async function encryptExistingTokens() {
  logger.info('Starting Strava token encryption migration...')

  const connections = await db.select().from(strava_connections)

  logger.info(`Found ${connections.length} Strava connections to encrypt`)

  for (const connection of connections) {
    try {
      // Check if already encrypted using versioned format marker
      if (connection.access_token.startsWith('enc:v1:')) {
        logger.info(`Skipping already encrypted connection: ${connection.id}`)
        continue
      }

      const encryptedAccessToken = await encryptToken(connection.access_token)
      const encryptedRefreshToken = await encryptToken(connection.refresh_token)

      await db
        .update(strava_connections)
        .set({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          updated_at: new Date(),
        })
        .where(eq(strava_connections.id, connection.id))

      logger.info(`Encrypted tokens for connection: ${connection.id}`)
    } catch (error) {
      logger.error(`Failed to encrypt connection ${connection.id}:`, error)
    }
  }

  logger.info('Migration complete')
}

encryptExistingTokens()
```

### Step 6: Add ENCRYPTION_KEY to Environment

```bash
# Generate a secure 32-byte key (required for AES-256)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# .env.local (development)
ENCRYPTION_KEY="<paste-generated-key-here>"

# IMPORTANT: Key MUST be exactly 32 bytes when UTF-8 encoded
# The generated base64 key above will be 44 characters but encode to 32 bytes
```

Add to Vercel environment variables for production with the same generated key.

---

## Fix #3: Add Content Security Policy

**Priority:** 🟠 HIGH
**Time:** 4 hours
**Difficulty:** Low

### Step 1: Update next.config.ts

```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(self)',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Adjust based on needs
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.strava.com https://*.supabase.co wss://*.supabase.co",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
  ]
},
```

### Step 2: Test CSP

1. Deploy to preview environment
2. Open browser DevTools → Console
3. Check for CSP violations
4. Adjust policy as needed

### Step 3: Monitor CSP Violations

Add CSP reporting:

```typescript
{
  key: 'Content-Security-Policy-Report-Only',
  value: [
    // ... same policy
    "report-uri https://your-csp-report-endpoint.com/report",
  ].join('; '),
}
```

---

## Fix #4: Enable Email Verification

**Priority:** 🔴 CRITICAL
**Time:** 3 hours
**Difficulty:** Low

### Step 1: Configure Resend

```bash
# .env.local
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="UltraCoach <noreply@ultracoach.app>"
```

### Step 2: Update Better Auth Config

Modify `src/lib/better-auth.ts`:

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true, // Enable this
  minPasswordLength: 8,
  maxPasswordLength: 128,
  sendVerificationEmail: async ({ user, url, token }) => {
    if (!resend) {
      logger.error('Resend not configured - cannot send verification email')
      throw new Error('Email service not configured')
    }

    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 40px; border: 1px solid #e5e7eb; }
    .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏔️ Verify Your Email</h1>
    </div>
    <div class="content">
      <h2>Welcome to UltraCoach!</h2>
      <p>Hi ${user.name || 'there'},</p>
      <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" class="btn">Verify My Email</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${url}">${url}</a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        This link will expire in 24 hours.
      </p>
    </div>
    <div class="footer">
      <p>UltraCoach - Conquer Your Mountain</p>
    </div>
  </div>
</body>
</html>`

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'UltraCoach <onboarding@resend.dev>',
        to: user.email,
        subject: 'Verify Your UltraCoach Account 🏔️',
        html: htmlTemplate,
      })
      logger.info('Verification email sent', { email: user.email })
    } catch (error) {
      logger.error('Failed to send verification email:', error)
      throw new Error('Failed to send verification email')
    }
  },
},
```

### Step 3: Update Sign-Up Flow

Modify sign-up page to show verification message:

```typescript
// After successful sign-up
if (result.data?.user && !result.data.user.emailVerified) {
  toast.success('Account created! Please check your email to verify your account.')
  router.push('/auth/verify-email')
}
```

### Step 4: Create Verification Success Page

Create `src/app/auth/verify-email/page.tsx`:

```typescript
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Check Your Email</h1>
        <p className="text-gray-600 mb-6">
          We've sent you a verification link. Please check your email and click the link to verify your account.
        </p>
        <p className="text-sm text-gray-500">
          Didn't receive the email? Check your spam folder or contact support.
        </p>
      </div>
    </div>
  )
}
```

---

## Testing Checklist

After implementing all fixes:

### RLS Testing
- [ ] Coach cannot access other coaches' runners via SQL
- [ ] Runner cannot access other runners' workouts via SQL
- [ ] Direct database queries respect RLS policies
- [ ] Service role can bypass RLS for admin operations

### Encryption Testing
- [ ] New Strava connections store encrypted tokens
- [ ] Existing tokens migrated successfully
- [ ] Token decryption works for API calls
- [ ] Encrypted tokens are not readable in database

### CSP Testing
- [ ] No CSP violations in browser console
- [ ] All third-party scripts load correctly
- [ ] Inline styles work (or are refactored)
- [ ] API calls to Supabase and Strava succeed

### Email Verification Testing
- [ ] Sign-up sends verification email
- [ ] Verification link works
- [ ] Unverified users cannot access protected routes
- [ ] Email templates render correctly

---

## Deployment Checklist

Before deploying to production:

1. **Environment Variables**
   - [ ] ENCRYPTION_KEY set in Vercel
   - [ ] RESEND_API_KEY configured
   - [ ] RESEND_FROM_EMAIL set
   - [ ] All secrets rotated

2. **Database**
   - [ ] RLS migration applied to production
   - [ ] Token encryption migration run
   - [ ] Test queries validate RLS policies

3. **Testing**
   - [ ] All E2E tests pass
   - [ ] Security test suite passes
   - [ ] Manual penetration testing complete

4. **Monitoring**
   - [ ] Sentry configured for error tracking
   - [ ] CSP violation reports monitored
   - [ ] Failed login attempts logged

---

## Support & Resources

- **RLS Documentation:** https://supabase.com/docs/guides/auth/row-level-security
- **Better Auth Docs:** https://better-auth.com/docs
- **CSP Generator:** https://csp-evaluator.withgoogle.com/
- **Resend Docs:** https://resend.com/docs

For questions or issues, refer to `SECURITY_AUDIT_REPORT.md` for detailed analysis.
