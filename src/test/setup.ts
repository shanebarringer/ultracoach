import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Polyfill Node global from window (jsdom provides it on window)
// This fixes "ReferenceError: Node is not defined" error with @testing-library/jest-dom
if (typeof global.Node === 'undefined' && typeof window !== 'undefined' && window.Node) {
  global.Node = window.Node
}

// Note: @testing-library/jest-dom/vitest automatically extends Vitest's expect with jest-dom matchers

// Clean up after each test
afterEach(() => {
  cleanup()
})
