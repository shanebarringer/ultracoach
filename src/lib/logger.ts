import { Logger } from 'tslog'

// Create logger instance with configuration
const logger = new Logger({
  name: 'UltraCoach',
  minLevel: process.env.NODE_ENV === 'production' ? 3 : 0, // 3=info, 0=debug
  prettyLogTemplate:
    '{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} {{logLevelName}} [{{name}}] ',
  prettyErrorTemplate: '\n{{errorName}} {{errorMessage}}\nstack: {{errorStack}}',
  prettyLogStyles: {
    logLevelName: {
      '*': ['bold', 'black', 'bgColorWhite'],
      DEBUG: ['bold', 'green'],
      INFO: ['bold', 'blue'],
      WARN: ['bold', 'yellow'],
      ERROR: ['bold', 'red'],
      FATAL: ['bold', 'redBright'],
    },
    name: ['bold', 'white'],
  },
  hideLogPositionForProduction: process.env.NODE_ENV === 'production',
})

// Create context-specific loggers
export const createLogger = (context: string) => {
  return logger.getSubLogger({ name: context })
}

// Export the main logger
export default logger

// Export convenience methods
export const log = logger.info.bind(logger)
export const debug = logger.debug.bind(logger)
export const info = logger.info.bind(logger)
export const warn = logger.warn.bind(logger)
export const error = logger.error.bind(logger)
export const fatal = logger.fatal.bind(logger)
