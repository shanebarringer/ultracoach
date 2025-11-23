import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { admin, customSession } from 'better-auth/plugins'
import { Resend } from 'resend'

import { db } from './database'
import { createLogger } from './logger'
import { account, session, user, verification } from './schema'

const logger = createLogger('better-auth')

// Validate and ensure proper Better Auth secret format
function validateBetterAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET

  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET environment variable is required for Better Auth')
  }

  // Better Auth expects a hex string or a sufficiently long random string
  if (secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters long')
  }

  // If it's not a hex string, that's still OK - Better Auth can handle various formats
  logger.info('Better Auth secret validation passed', {
    secretLength: secret.length,
    isHexFormat: /^[0-9a-fA-F]+$/.test(secret),
  })

  return secret
}

const betterAuthSecret = validateBetterAuthSecret()

// Initialize Resend client for email sending
let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
  logger.info('Resend email service initialized')
} else {
  logger.warn('RESEND_API_KEY not found - email sending will be disabled in production')
}

// Construct proper Better Auth base URL following Vercel best practices
function getBetterAuthBaseUrl(): string {
  logger.debug('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL ? '[SET]' : 'undefined',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ? '[SET]' : 'undefined',
  })

  // Priority 1: Use VERCEL_URL in production (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    const url = `https://${process.env.VERCEL_URL}/api/auth`
    logger.info('Using VERCEL_URL for baseURL:', url)
    return url
  }

  // Priority 2: Use explicit BETTER_AUTH_URL if provided and not localhost in production
  if (process.env.BETTER_AUTH_URL) {
    const url = process.env.BETTER_AUTH_URL

    // Skip localhost URLs in production environment
    if (process.env.NODE_ENV === 'production' && url.includes('localhost')) {
      logger.warn('Skipping localhost BETTER_AUTH_URL in production:', url)
    } else {
      // Use endsWith for more accurate detection of /api/auth path
      const finalUrl = url.endsWith('/api/auth') ? url : `${url}/api/auth`
      logger.info('Using BETTER_AUTH_URL for baseURL:', finalUrl)
      return finalUrl
    }
  }

  // Priority 3: Development fallback
  const fallback = 'http://localhost:3001/api/auth'
  logger.info('Using fallback baseURL:', fallback)
  return fallback
}

// Simplified trusted origins configuration following Better Auth best practices
function getTrustedOrigins(): string[] {
  const origins: string[] = []

  // Development and test origins
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    origins.push('http://localhost:3000')
    origins.push('http://localhost:3001')
  }

  // Production - use VERCEL_URL if available (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }

  // Add main production domains (production only)
  if (process.env.NODE_ENV === 'production') {
    origins.push('https://ultracoach.vercel.app')
    origins.push('https://www.ultracoach.dev') // Production custom domain with www
    origins.push('https://ultracoach.dev') // Production custom domain without www
  }

  // Note: Preview URLs are automatically handled via VERCEL_URL environment variable (lines 93-95)
  // No need to hardcode branch-specific preview URLs as they become stale quickly

  // Allow additional trusted origins from environment variable
  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    const additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
    origins.push(...additionalOrigins)
  }

  logger.info('Trusted origins configured:', origins)
  return origins
}

const apiBaseUrl = getBetterAuthBaseUrl()
const trustedOrigins = getTrustedOrigins()

// Initialize Better Auth with proper error handling
logger.info('Better Auth initialization details:', {
  baseURL: apiBaseUrl,
  hasSecret: !!betterAuthSecret,
  secretLength: betterAuthSecret.length,
  nodeEnv: process.env.NODE_ENV,
  vercelUrl: process.env.VERCEL_URL ? '[SET]' : 'undefined',
  trustedOriginsCount: trustedOrigins.length,
  adapterProvider: 'pg',
  drizzleSchemaCount: 4,
})

let auth: ReturnType<typeof betterAuth>

try {
  auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: user,
        account: account,
        session: session,
        verification: verification,
      },
    }),
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 days in seconds
      freshAge: 60 * 60, // 1 hour
      updateAge: 60 * 60 * 24, // Update session once per day
    },
    baseURL: apiBaseUrl,
    secret: betterAuthSecret,
    trustedOrigins,

    // Production-optimized cookie configuration
    advanced: {
      useSecureCookies: process.env.NODE_ENV === 'production', // Only secure cookies in production, not test
      cookiePrefix: 'better-auth', // Consistent cookie prefix
      crossSubDomainCookies: {
        enabled: false, // Disable for better security
      },
      // generateId removed - Better Auth handles ID generation by default
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Will be enabled once email provider is configured
      minPasswordLength: 8,
      maxPasswordLength: 128,
      forgotPasswordEnabled: true, // Enable password reset functionality
      sendResetPassword: async ({ user, url, token }) => {
        // Only log sensitive information in development
        if (process.env.NODE_ENV === 'development') {
          logger.info('Password reset requested (dev):', {
            email: user.email,
            resetUrl: url,
            tokenPreview: token.substring(0, 8) + '...',
          })
        } else {
          logger.info('Password reset requested', {
            email: user.email,
            // URL and token omitted in production logs for security
          })
        }

        // HTML escape helper to prevent HTML injection
        const escapeHtml = (value: string): string =>
          value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')

        const safeName = escapeHtml(user.name || 'there')

        // Generate HTML email template
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your UltraCoach Password</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 40px 30px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; text-align: center; margin: 20px 0; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        .security-note { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .mountain-icon { font-size: 48px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="mountain-icon">🏔️</div>
            <h1>UltraCoach</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Mountain Training Platform</p>
        </div>

        <div class="content">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Reset Your Password</h2>
            <p>Hi ${safeName},</p>
            <p>We received a request to reset your UltraCoach password. Click the button below to set a new password:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${url}" class="btn">Reset My Password</a>
            </div>
            
            <div class="security-note">
                <strong>🔒 Security Notice:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>This link will expire in <strong>1 hour</strong></li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                </ul>
            </div>
            
            <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${url}" style="color: #3b82f6; word-break: break-all;">${url}</a>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>UltraCoach</strong> - Conquer Your Mountain</p>
            <p>If you have any questions, contact us at support@ultracoach.app</p>
        </div>
    </div>
</body>
</html>`

        // Text version for email clients that don't support HTML
        const textTemplate = `
🏔️ UltraCoach - Password Reset

Hi ${user.name || 'there'},

We received a request to reset your UltraCoach password.

Click this link to reset your password:
${url}

⚠️ SECURITY NOTICE:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- Never share this link with anyone

If you have any questions, contact us at support@ultracoach.app

---
UltraCoach - Conquer Your Mountain
        `

        if (process.env.NODE_ENV === 'development') {
          // In development, log password reset details
          logger.info('Password reset email (development mode)', {
            to: user.email,
            subject: 'Reset Your UltraCoach Password 🏔️',
            resetUrl: url,
            textPreview: textTemplate.substring(0, 200) + '...',
          })
        } else if (resend) {
          // In production, send actual email via Resend
          try {
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'UltraCoach <onboarding@resend.dev>'

            await resend.emails.send({
              from: fromEmail,
              to: user.email,
              subject: 'Reset Your UltraCoach Password 🏔️',
              html: htmlTemplate,
              text: textTemplate,
            })
            logger.info('Password reset email sent successfully via Resend')
          } catch (error) {
            logger.error('Failed to send password reset email via Resend:', error)
            throw new Error('Failed to send password reset email')
          }
        } else {
          logger.error('No email service configured - password reset email not sent')
          throw new Error('Email service not configured')
        }
      },
    },

    user: {
      additionalFields: {
        userType: {
          type: 'string',
          required: false,
          input: true,
          output: true,
        },
        fullName: {
          type: 'string',
          required: false,
          input: true,
          output: true,
        },
      },
    },

    // No hooks for now - will handle role mapping differently
    hooks: {},

    plugins: [
      admin(), // Enable admin API for user management
      customSession(async ({ user, session }) => {
        // Ensure role is properly typed and available
        const typedUser = user as typeof user & {
          userType?: string
          fullName?: string
          role?: string
        }
        // Reduce verbosity and PII in production logs
        const logLevel = process.env.NODE_ENV === 'production' ? 'debug' : 'info'
        const logPayload = {
          userId: user.id,
          originalUserType: typedUser.userType,
          transformedRole: (typedUser.userType as 'runner' | 'coach') || 'runner',
        }

        if (process.env.NODE_ENV !== 'production') {
          // Include more details in development
          Object.assign(logPayload, {
            email: user.email,
            originalRole: typedUser.role,
            fullName: typedUser.fullName,
          })
        }

        logger[logLevel]('Custom session transformation', logPayload)
        return {
          user: {
            ...user,
            role: (typedUser.userType as 'runner' | 'coach') || 'runner', // Map userType to role for app compatibility
            userType: typedUser.userType || 'runner', // Include userType explicitly
            fullName: typedUser.fullName || null,
          },
          session,
        }
      }),
      nextCookies(), // Must be last plugin - handles Next.js cookie integration
    ],
  })
  logger.info('Better Auth initialized successfully')
} catch (error) {
  logger.error('Failed to initialize Better Auth:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    baseURL: apiBaseUrl,
    hasSecret: !!betterAuthSecret,
    secretLength: betterAuthSecret?.length,
    environment: process.env.NODE_ENV,
  })

  // Provide more specific error guidance
  if (error instanceof Error && error.message.includes('hex string expected')) {
    throw new Error(
      `Better Auth hex string error - this usually indicates a session token parsing issue. Check your BETTER_AUTH_SECRET format and database schema. Original error: ${error.message}`
    )
  }

  throw new Error(
    `Better Auth initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  )
}

export { auth }

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user & {
  userType: 'runner' | 'coach'
  fullName?: string | null
}

// Type definitions for the application
declare module 'better-auth' {
  interface UserAdditionalFields {
    role: 'runner' | 'coach'
    full_name?: string
  }
}
