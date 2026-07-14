import { AlertTriangle, RotateCw } from 'lucide-react'
import Glass from '../design/components/Glass'

// Rendered by Sentry.ErrorBoundary (main.jsx) when a render error escapes
// every component-level try/catch. This is the last line of defense against
// a full white-screen outage — the exact failure mode that took the whole
// app down for ~10% of every day before the bandsOpacity crash was found and
// fixed. Works whether or not a Sentry DSN is configured.
export default function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-5 text-zinc-100">
      <Glass className="flex max-w-sm flex-col items-center gap-3 rounded-2xl p-6 text-center">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-400/25">
          <AlertTriangle className="size-5" />
        </span>
        <p className="text-sm font-semibold text-zinc-100">Something went wrong</p>
        <p className="text-xs leading-relaxed text-zinc-500">
          AudienceLab hit an unexpected error. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110"
          style={{ boxShadow: '0 0 18px -4px color-mix(in oklab, var(--al-tq) 53%, transparent)' }}
        >
          <RotateCw className="size-4" /> Reload
        </button>
      </Glass>
    </div>
  )
}
