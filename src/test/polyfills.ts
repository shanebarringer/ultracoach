/**
 * Test Environment Polyfills
 *
 * This file provides polyfills for the test environment and MUST be loaded
 * BEFORE any other test setup files in vitest.config.ts setupFiles array.
 *
 * CRITICAL: This file must have NO imports to ensure the polyfills run
 * immediately when the file is loaded, before any test library imports.
 */

// Polyfill Node global from window (jsdom provides it on window)
// This fixes "ReferenceError: Node is not defined" error with @testing-library/jest-dom
// which uses Node.ELEMENT_NODE, Node.DOCUMENT_NODE, etc. constants
if (typeof global.Node === 'undefined' && typeof window !== 'undefined' && window.Node) {
  global.Node = window.Node
}
