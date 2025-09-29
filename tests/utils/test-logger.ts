export type TestLogger = {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

// Try to use tslog when available; fall back to console to avoid ESM import issues in CI
export async function getTestLogger(name?: string): Promise<TestLogger> {
  try {
    // Dynamic import allows loading ESM from CJS context safely
    const mod = await import('tslog')
    const { Logger } = mod as unknown as { Logger: new (opts?: { name?: string }) => TestLogger }
    return new Logger({ name })
  } catch {
    const prefix = name ? `[${name}]` : ''
    return {
      info: (...args: unknown[]) => console.log(prefix, ...args),
      warn: (...args: unknown[]) => console.warn(prefix, ...args),
      error: (...args: unknown[]) => console.error(prefix, ...args),
      debug: (...args: unknown[]) => console.debug(prefix, ...args),
    }
  }
}
