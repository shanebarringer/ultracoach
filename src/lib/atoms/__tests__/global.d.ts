/* eslint-disable @typescript-eslint/no-explicit-any */
// Global type declarations for tests
declare global {
  // Allow any types in tests for flexibility
  interface TestHelpers {
    [key: string]: any
  }
}

export {}
