import { withPostHogConfig } from '@posthog/nextjs-config'
import path from 'path'

import type { NextConfig } from 'next'

// Increase max listeners for development mode to prevent memory leak warnings
// Next.js hot module reloading can create multiple SIGTERM listeners during development
if (process.env.NODE_ENV === 'development') {
  process.setMaxListeners(20)
}

// Define minimal webpack plugin interface inline (no external webpack import needed)
interface WebpackPlugin {
  apply(compiler: any): void
}

type CodeInspectorFactory = (options: { bundler: string }) => WebpackPlugin

// Properly typed plugin factory for code-inspector-plugin
let codeInspectorFactory: CodeInspectorFactory | null = null
try {
  const mod: unknown = require('code-inspector-plugin')
  if (mod && typeof mod === 'object' && 'codeInspectorPlugin' in mod) {
    const factory = (mod as { codeInspectorPlugin: unknown }).codeInspectorPlugin
    if (typeof factory === 'function') {
      // @ts-ignore - Plugin structure verified at runtime, not build time
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
  envId: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID || '251417',
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  sourcemaps: {
    enabled: process.env.NODE_ENV === 'production' && !!process.env.POSTHOG_PERSONAL_API_KEY, // Only when API key is provided
    deleteAfterUpload: true, // Clean up source maps after upload for security
  },
})
