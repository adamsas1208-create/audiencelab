import * as Sentry from '@sentry/react'

// Mirrors src/lib/supabaseClient.js's graceful-degradation pattern exactly:
// read a VITE_-prefixed env var, warn (don't throw) if it's missing, and let
// the app boot normally either way. Sentry.ErrorBoundary in main.jsx still
// functions as a plain React error boundary even when init() was never
// called — it just has nowhere to report to.
const dsn = import.meta.env.VITE_SENTRY_DSN

export const isSentryConfigured = Boolean(dsn)

if (!isSentryConfigured) {
  console.warn(
    'Sentry DSN missing — error tracking is disabled. Set VITE_SENTRY_DSN ' +
      '(see https://sentry.io) to enable it.',
  )
} else {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  })
}

export { Sentry }
