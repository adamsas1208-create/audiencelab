import { Eye, Plus, Sparkles } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { usePathname } from '../lib/router'
import AuthMenu from './Auth/AuthMenu'

const LINKS = [
  { href: '/', label: 'Feed' },
  { href: '/mine', label: 'My Submissions' },
]

function NavLink({ href, label, active }) {
  return (
    <a
      href={href}
      className={[
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-turquoise/10 text-turquoise' : 'text-zinc-400 hover:text-zinc-100',
      ].join(' ')}
    >
      {label}
    </a>
  )
}

/** Slim top bar — replaces the old sidebar/workspace/rooms structure entirely. */
export default function TopNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <header className="al-surface-blur sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3.5">
      <div className="flex items-center gap-6">
        <a href="/" className="flex items-center gap-2">
          <span
            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/30"
            style={{ boxShadow: '0 0 18px -6px var(--al-tq)' }}
          >
            <Eye
              className="size-4 text-turquoise"
              style={{ filter: 'drop-shadow(0 0 6px var(--al-tq))' }}
            />
          </span>
          <span className="font-serif text-lg font-semibold italic tracking-tight text-white">
            Which One?
          </span>
        </a>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} active={pathname === l.href} />
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-turquoise px-3.5 py-2 text-sm font-semibold text-black transition-all hover:brightness-110"
          style={{ boxShadow: '0 0 18px -4px color-mix(in oklab, var(--al-tq) 53%, transparent)' }}
        >
          <Plus className="size-4" />
          <span className="hidden xs:inline">Post an idea</span>
        </a>
        {user && (
          <span className="hidden items-center gap-1 rounded-full border border-turquoise/20 bg-turquoise/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-turquoise/80 md:inline-flex">
            <Sparkles className="size-3" /> Signed in
          </span>
        )}
        <AuthMenu />
      </div>
    </header>
  )
}
