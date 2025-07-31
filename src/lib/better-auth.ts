import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { Resend } from 'resend'

import { createLogger } from './logger'
import {
  better_auth_accounts,
  better_auth_sessions,
  better_auth_users,
  better_auth_verification_tokens,
} from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for Better Auth')
}

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

const logger = createLogger('better-auth')
const betterAuthSecret = validateBetterAuthSecret()

// Initialize Resend client for email sending
let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
  logger.info('Resend email service initialized')
} else {
  logger.warn('RESEND_API_KEY not found - email sending will be disabled in production')
}

// Create a dedicated database connection for Better Auth with production-optimized settings
let betterAuthPool: Pool

function createSSLConfig() {
  if (process.env.NODE_ENV === 'production') {
    // Production SSL configuration for Supabase
    return {
      rejectUnauthorized: false, // Supabase manages certificates - this is safe for managed services
      sslmode: 'require', // Require SSL connection
    }
  }
  // No SSL for local development
  return false
}

function createPoolConfig() {
  const baseConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: createSSLConfig(),
    application_name: 'ultracoach-better-auth',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  }

  if (process.env.NODE_ENV === 'production') {
    // Production-optimized settings for Vercel serverless
    return {
      ...baseConfig,
      max: 3, // Conservative pool size for serverless
      min: 0, // No minimum connections in serverless
      idleTimeoutMillis: 30000, // Shorter timeout for serverless
      connectionTimeoutMillis: 10000, // Faster timeout for production
      acquireTimeoutMillis: 10000, // Timeout for acquiring connections
      createTimeoutMillis: 10000, // Timeout for creating connections
      destroyTimeoutMillis: 5000, // Timeout for destroying connections
      reapIntervalMillis: 1000, // More frequent connection reaping
      createRetryIntervalMillis: 200, // Retry interval for failed connections
      propagateCreateError: false, // Don't propagate creation errors immediately
    }
  } else {
    // Development settings
    return {
      ...baseConfig,
      max: 5,
      min: 1,
      idleTimeoutMillis: 300000, // 5 minutes
      connectionTimeoutMillis: 60000, // 60 seconds
    }
  }
}

try {
  const poolConfig = createPoolConfig()
  betterAuthPool = new Pool(poolConfig)

  logger.info('Better Auth database pool initialized with configuration:', {
    environment: process.env.NODE_ENV,
    hasSSL: !!poolConfig.ssl,
    maxConnections: poolConfig.max,
    minConnections: poolConfig.min,
  })
} catch (error) {
  logger.error('Failed to initialize Better Auth database pool:', error)
  throw new Error(
    `Database pool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  )
}

// Add connection event handlers for monitoring
betterAuthPool.on('connect', () => {
  logger.info('Database connection established')
})

betterAuthPool.on('error', err => {
  logger.error('Database pool error:', err)
  // Don't exit the process, just log the error
})

betterAuthPool.on('remove', () => {
  logger.debug('Client removed from pool')
})

const betterAuthDb = drizzle(betterAuthPool)

// Construct proper Better Auth base URL following Vercel best practices
function getBetterAuthBaseUrl(): string {
  logger.debug('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL ? '[SET]' : 'undefined',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ? '[SET]' : 'undefined',
  })

  // Vercel best practice: Use VERCEL_URL in production (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    const url = `https://${process.env.VERCEL_URL}/api/auth`
    logger.info('Using VERCEL_URL for baseURL:', url)
    return url
  }

  // Alternative: Use explicit BETTER_AUTH_URL if provided (takes precedence)
  if (process.env.BETTER_AUTH_URL) {
    const url = process.env.BETTER_AUTH_URL
    // Use endsWith for more accurate detection of /api/auth path
    const finalUrl = url.endsWith('/api/auth') ? url : `${url}/api/auth`
    logger.info('Using BETTER_AUTH_URL for baseURL:', finalUrl)
    return finalUrl
  }

  // Development fallback
  const fallback = 'http://localhost:3001/api/auth'
  logger.info('Using fallback baseURL:', fallback)
  return fallback
}

// Simplified trusted origins configuration following Better Auth best practices
function getTrustedOrigins(): string[] {
  const origins: string[] = []

  // Development origins
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000')
    origins.push('http://localhost:3001')
  }

  // Production - use VERCEL_URL if available (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }

  // Add main production domain
  origins.push('https://ultracoach.vercel.app')

  // More permissive approach for development/preview deployments
  // Trust all Vercel deployments for this project
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_GIT_COMMIT_REF) {
    // Add specific preview deployment URLs that are commonly used
    const previewUrls = [
      'https://ultracoach-hawqljwys-shane-hehims-projects.vercel.app',
      'https://ultracoach-git-fix-cors-error-shane-hehims-projects.vercel.app',
      'https://ultracoach-git-main-shane-hehims-projects.vercel.app',
      'https://ultracoach-git-develop-shane-hehims-projects.vercel.app',
      'https://ultracoach-git-feature-shane-hehims-projects.vercel.app',
      'https://ultracoach-git-preview-shane-hehims-projects.vercel.app',
      'https://ultracoach-git-staging-shane-hehims-projects.vercel.app',
      'https://ultracoach-git-test-shane-hehims-projects.vercel.app',
    ]
    origins.push(...previewUrls)
  }

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

logger.info('Initializing Better Auth with configuration:', {
  baseURL: apiBaseUrl,
  trustedOriginsCount: trustedOrigins.length,
  environment: process.env.NODE_ENV,
})

let auth: ReturnType<typeof betterAuth>
try {
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

  auth = betterAuth({
    database: drizzleAdapter(betterAuthDb, {
      provider: 'pg',
      schema: {
        user: better_auth_users,
        account: better_auth_accounts,
        session: better_auth_sessions,
        verification: better_auth_verification_tokens,
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
      useSecureCookies: process.env.NODE_ENV === 'production', // Force secure cookies in production
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
        logger.info('Password reset requested:', {
          email: user.email,
          resetUrl: url,
          token: token.substring(0, 8) + '...', // Only log partial token for security
        })

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
            <p>Hi ${user.name || 'there'},</p>
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
          // In development, log to console
          console.log(`
=== PASSWORD RESET EMAIL ===
To: ${user.email}
Subject: Reset Your UltraCoach Password 🏔️

${textTemplate}
============================
          `)
        } else if (resend) {
          // In production, send actual email via Resend
          try {
            await resend.emails.send({
              from: 'UltraCoach <noreply@ultracoach.app>',
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
        role: {
          type: 'string',
          required: true,
          defaultValue: 'runner',
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

    plugins: [
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
  role: 'runner' | 'coach'
  fullName?: string | null
}

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, closing database connections...`)
  betterAuthPool.end(() => {
    logger.info('Database pool connections closed')
    process.exit(0)
  })
}

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Type definitions for the application
declare module 'better-auth' {
  interface UserAdditionalFields {
    role: 'runner' | 'coach'
    full_name?: string
  }
}
