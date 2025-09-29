import path from 'path'

import type { NextConfig } from 'next'

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
  // Required for jotai-devtools UI CSS to be transpiled correctly
  transpilePackages: ['jotai-devtools'],

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

export default nextConfig
