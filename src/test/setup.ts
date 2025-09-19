import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Note: @testing-library/jest-dom/vitest automatically extends Vitest's expect with jest-dom matchers

// Clean up after each test
afterEach(() => {
  cleanup()
})
