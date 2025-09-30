import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Note: @testing-library/jest-dom is NOT imported because we don't use its custom matchers
// (toBeInTheDocument, toBeVisible, etc.). This also avoids the "Node is not defined" error
// that occurs when jest-dom tries to access DOM Node constants in certain CI environments.

// Clean up after each test
afterEach(() => {
  cleanup()
})
