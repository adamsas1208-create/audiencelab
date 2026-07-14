import { ArrowLeft } from 'lucide-react'
import Glass from '../../design/components/Glass'

// Chrome-free standalone shell for legal pages — mirrors PublicProfile.jsx's
// pattern (ambient glow over the living sky, centered column, footer) so a
// /terms or /privacy visit feels like part of the same app, not a bolted-on
// static page.
export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-turquoise/10 blur-[150px]" />
        <div className="absolute bottom-0 right-0 size-[28rem] rounded-full bg-periwinkle/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:py-14">
        <a
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="size-3.5" /> Back to AudienceLab
        </a>

        <h1 className="al-display mt-6 text-3xl text-zinc-50 sm:text-4xl">{title}</h1>
        <p className="mt-1 text-xs text-zinc-500">Last updated {updated}</p>

        <Glass className="al-legal-content mt-6 rounded-2xl p-6 text-sm leading-relaxed text-zinc-300 sm:p-8">
          {children}
        </Glass>

        <footer className="mt-10 text-center text-xs text-zinc-600">
          Powered by <span className="font-semibold text-turquoise">AudienceLab</span>
        </footer>
      </div>
    </div>
  )
}
