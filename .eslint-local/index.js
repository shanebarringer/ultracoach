/**
 * Custom ESLint plugin for UltraCoach
 *
 * Provides project-specific linting rules including Jotai atom conventions
 *
 * @module eslint-plugin-ultracoach
 */

const requireAtomDebugLabel = require('./rules/require-atom-debug-label')

module.exports = {
  rules: {
    'require-atom-debug-label': requireAtomDebugLabel,
  },
  configs: {
    recommended: {
      plugins: ['ultracoach'],
      rules: {
        'ultracoach/require-atom-debug-label': 'warn', // Start with warning
      },
    },
  },
}
