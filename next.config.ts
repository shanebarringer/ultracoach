import type { NextConfig } from 'next'

// Conditional import for code-inspector-plugin to handle production builds
let codeInspectorPlugin: any = null
try {
  codeInspectorPlugin = require('code-inspector-plugin').codeInspectorPlugin
} catch (e) {
  // code-inspector-plugin not available (production build where dev dependencies are skipped)
}

const nextConfig: NextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Add the code-inspector-plugin (disabled in test environment to prevent hydration issues)
    if (dev && !isServer && process.env.NODE_ENV !== 'test' && codeInspectorPlugin) {
      config.plugins.push(codeInspectorPlugin({ bundler: 'webpack' }))
    }

    // Ignore pg-native module since it's not available in browser environments
    config.resolve.alias = {
      ...config.resolve.alias,
      'pg-native': false,
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
