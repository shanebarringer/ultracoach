import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Note: @testing-library/jest-dom/vitest automatically extends Vitest's expect with jest-dom matchers
// Note: Node global polyfill is loaded from src/test/polyfills.ts (must run before imports)

// Clean up after each test
afterEach(() => {
  cleanup()
})
