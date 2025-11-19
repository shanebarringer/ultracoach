import { withPostHogConfig } from '@posthog/nextjs-config'
import path from 'path'

import type { NextConfig } from 'next'

// Increase max listeners for development mode to prevent memory leak warnings
// Next.js hot module reloading can create multiple SIGTERM listeners during development
if (process.env.NODE_ENV === 'development') {
  process.setMaxListeners(20)
}

// Build-time validation for PostHog configuration (production only)
if (process.env.NODE_ENV === 'production') {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID) {
    console.warn(
      '⚠️  PostHog: NEXT_PUBLIC_POSTHOG_PROJECT_ID is not set - analytics will be disabled'
    )
  }
  if (!process.env.POSTHOG_PERSONAL_API_KEY) {
    console.warn(
      '⚠️  PostHog: POSTHOG_PERSONAL_API_KEY is not set - source map upload will be disabled'
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
  webpack: (config, { dev, isServer }) => {
    // Add the code-inspector-plugin (disabled in test environment to prevent hydration issues)
    if (dev && !isServer && process.env.NODE_ENV !== 'test' && codeInspectorFactory) {
      config.plugins.push(codeInspectorFactory({ bundler: 'webpack' }))
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
  ...(process.env.NODE_ENV !== 'test' &&
  process.env.NODE_ENV !== 'production' &&
  codeInspectorFactory
    ? {
        turbopack: {
          // Optimize module resolution by specifying extensions explicitly
          // This helps Turbopack resolve modules faster by reducing filesystem lookups
          resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],

          // Code inspector plugin integration for development debugging
          rules: codeInspectorFactory({ bundler: 'turbopack' }),
        },
      }
    : {}),
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

  // Headers for security
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
        ],
      },
    ]
  },
}

// Wrap with PostHog config for automatic source map upload
export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY || '',
  envId: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID || '', // No fallback - must be explicitly set
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  sourcemaps: {
    enabled:
      process.env.NODE_ENV === 'production' &&
      !!process.env.POSTHOG_PERSONAL_API_KEY &&
      !!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID, // Require both API key and project ID
    deleteAfterUpload: true, // Clean up source maps after upload for security
  },
})
