import path from 'path'

import type { NextConfig } from 'next'

// Increase max listeners for development mode to prevent memory leak warnings
// Next.js hot module reloading can create multiple SIGTERM listeners during development
if (process.env.NODE_ENV === 'development') {
  process.setMaxListeners(20)
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
    // Conditionally include 'unsafe-eval' only in development and test (needed for HMR and testing)
    // In production, remove it to strengthen XSS protection
    const isNonProduction =
      process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    const scriptSrc = isNonProduction
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline'"

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
              scriptSrc, // Conditionally includes 'unsafe-eval' in dev/test, excluded in production
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://api.strava.com https://*.supabase.co blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.strava.com https://*.supabase.co wss://*.supabase.co",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
