import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

// Import custom ESLint rules
import ultracoachPlugin from './.eslint-local/index.js'

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    plugins: {
      ultracoach: ultracoachPlugin,
    },
    rules: {
      // Enhanced TypeScript rules for better code quality
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      // Removing prefer-nullish-coalescing as it requires type information
      'prefer-const': 'error',
      'react-hooks/exhaustive-deps': 'warn', // Convert to warning instead of error

      // Custom UltraCoach rules
      'ultracoach/require-atom-debug-label': 'warn', // Enforce debug labels on atoms
    },
  },
  {
    // Apply atom debug label rule only to atom files
    files: ['src/lib/atoms/**/*.ts', 'src/lib/atoms/**/*.tsx'],
    rules: {
      'ultracoach/require-atom-debug-label': 'error', // Strict enforcement in atom files
    },
  },
]

export default eslintConfig
