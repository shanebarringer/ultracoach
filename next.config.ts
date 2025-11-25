import path from 'path'

import type { NextConfig } from 'next'

// Increase max listeners for development mode to prevent memory leak warnings
// Next.js hot module reloading can create multiple SIGTERM listeners during development
if (process.env.NODE_ENV === 'development') {
  process.setMaxListeners(20)
}

// Build-time validation for PostHog configuration (production only)
// Note: Source maps are now uploaded via PostHog CLI in package.json scripts
// Note: console.warn is acceptable here as this runs at BUILD TIME, not runtime
// The project uses tslog for runtime logging, but console methods are standard for build-time warnings
if (process.env.NODE_ENV === 'production') {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID) {
    console.warn(
      '⚠️  PostHog: NEXT_PUBLIC_POSTHOG_PROJECT_ID is not set - analytics will be disabled'
    )
  }
  if (!process.env.NEXT_PUBLIC_POSTHOG_HOST) {
    console.warn(
      '⚠️  PostHog: NEXT_PUBLIC_POSTHOG_HOST is not set - using default (https://us.i.posthog.com)'
    )
  }
}

// Type-safe code-inspector-plugin configuration
type CodeInspectorFactory = (options: {
  bundler: 'webpack' | 'turbopack'
}) => ReturnType<typeof import('code-inspector-plugin').codeInspectorPlugin>

// Properly typed plugin factory for code-inspector-plugin
let codeInspectorFactory: CodeInspectorFactory | null = null
try {
  const mod: unknown = require('code-inspector-plugin')
  if (mod && typeof mod === 'object' && 'codeInspectorPlugin' in mod) {
    const factory = (mod as { codeInspectorPlugin: unknown }).codeInspectorPlugin
    if (typeof factory === 'function') {
      codeInspectorFactory = factory as CodeInspectorFactory
    }
  }
} catch (e) {
  // code-inspector-plugin not available (production build where dev dependencies are skipped)
}

const nextConfig: NextConfig = {
  // Enable source maps for production only when PostHog CLI env vars are set
  // This prevents unnecessary build overhead and improves security when PostHog is disabled
  productionBrowserSourceMaps: !!(
    process.env.POSTHOG_CLI_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY
  ),

  webpack: (config, { dev, isServer }) => {
    // Detect CI/test environment more reliably than NODE_ENV check
    // Playwright tests run with NODE_ENV=development but should not load code inspector
    const isTestEnvironment =
      process.env.CI === 'true' ||
      process.env.PLAYWRIGHT_TEST_BASE_URL !== undefined ||
      process.env.E2E_BASE_URL !== undefined

    // Add the code-inspector-plugin (disabled in test environment to prevent React bundle mismatch)
    if (dev && !isServer && !isTestEnvironment && codeInspectorFactory) {
      config.plugins.push(codeInspectorFactory({ bundler: 'webpack' }))
    }

    // Server-side source maps for better error tracking
    if (isServer) {
      config.devtool = 'source-map'
    }

    // Ignore pg-native module since it's not available in browser environments
    // Add explicit path alias resolution for Vercel compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      'pg-native': false,
      '@': path.resolve(__dirname, 'src'),
    }
    return config
  },
  // Turbopack configuration (Next.js 15.2+)
  // Performance optimizations for faster builds and better developer experience
  // Detect CI/test environment to disable code inspector
  ...(() => {
    const isTestEnvironment =
      process.env.CI === 'true' ||
      process.env.PLAYWRIGHT_TEST_BASE_URL !== undefined ||
      process.env.E2E_BASE_URL !== undefined

    return !isTestEnvironment && process.env.NODE_ENV !== 'production' && codeInspectorFactory
      ? {
          turbopack: {
            // Optimize module resolution by specifying extensions explicitly
            // This helps Turbopack resolve modules faster by reducing filesystem lookups
            resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],

            // Code inspector plugin integration for development debugging
            rules: codeInspectorFactory({ bundler: 'turbopack' }),
          },
        }
      : {}
  })(),
  // Production optimizations (swcMinify is enabled by default in Next.js 15)
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Security headers (excluding CSP which is handled in middleware with nonce-based protection)
  // See src/middleware.ts for nonce-based Content Security Policy implementation
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production'

    // Build security headers array
    // Note: Content-Security-Policy is now set in middleware with per-request nonce generation
    // This provides stronger security than 'unsafe-inline' by using nonce-based script approval
    const securityHeaders = [
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
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)',
      },
    ]

    // Only add HSTS with preload in production to avoid long-lived HSTS on staging/test domains
    if (isProduction) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // PostHog reverse proxy rewrites
  // Routes PostHog requests through /api/telemetry to bypass ad-blockers (including uBlock Origin)
  // Using /api/telemetry instead of /ingest because /ingest is on EasyPrivacy blocklists
  // The path matches our API route pattern making it look like first-party traffic
  async rewrites() {
    return [
      {
        source: '/api/telemetry/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/api/telemetry/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
}

// Export the config directly
// Source maps are uploaded separately via PostHog CLI (see package.json scripts)
// This approach avoids Next.js 15.3+ compatibility issues with withPostHogConfig wrapper
export default nextConfig
