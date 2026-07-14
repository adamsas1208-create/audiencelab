import { Eye } from 'lucide-react'
import { motion } from 'motion/react'
import { rooms, workspace } from './nav'
import { springs } from '../../design/tokens/motion'
import { useData } from '../../context/data-context'
import { FREE_LIMITS } from '../../lib/limits'

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 pt-1">
      <span
        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/30"
        style={{ boxShadow: '0 0 22px -6px var(--al-tq)' }}
      >
        <Eye
          className="size-5 text-turquoise"
          style={{ filter: 'drop-shadow(0 0 6px var(--al-tq))' }}
        />
      </span>
      <div className="leading-tight">
        <p className="font-serif text-lg font-semibold italic tracking-tight text-white">
          AudienceLab
        </p>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          AI Audience Insights
        </p>
      </div>
    </div>
  )
}

// One sidebar row with the neon turquoise left-border indicator.
// `size` lets workspace rows breathe a little more than dense room rows.
function SideLink({ icon: Icon, label, active, onClick, size = 'md', flagship }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex w-full items-center gap-3 rounded-lg pr-3 text-sm font-medium transition-all duration-200',
        size === 'md' ? 'py-2.5 pl-4' : 'py-2 pl-4',
        active
          ? 'bg-turquoise/10 text-white'
          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white',
      ].join(' ')}
    >
      {/* Neon left-border indicator — snaps in with a springy overshoot. */}
      <motion.span
        className="absolute left-0 top-1/2 h-5 w-[3px] origin-center rounded-full bg-turquoise"
        initial={false}
        animate={{ scaleY: active ? 1 : 0, opacity: active ? 1 : 0, y: '-50%' }}
        transition={springs.overshoot}
        style={{ boxShadow: '0 0 10px var(--al-tq), 0 0 4px var(--al-tq)' }}
      />
      <Icon
        className={[
          'size-4.5 shrink-0 transition-colors',
          active ? 'text-turquoise' : 'text-zinc-500 group-hover:text-turquoise',
        ].join(' ')}
      />
      <span className="truncate">{label}</span>
      {flagship && (
        <span className="ml-auto rounded-full bg-turquoise/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-turquoise">
          Flagship
        </span>
      )}
    </button>
  )
}

/**
 * Premium fixed full-height sidebar.
 * @param {string} active - currently selected workspace or room id
 * @param {(id: string) => void} onSelect - called when a row is clicked
 * @param {string} [query] - header search text; filters workspace/room rows by label
 */
export default function Sidebar({ active, onSelect, query = '' }) {
  const { toast } = useData()
  const q = query.trim().toLowerCase()
  const matches = (label) => !q || label.toLowerCase().includes(q)
  const filteredWorkspace = workspace.filter((t) => matches(t.label))
  const filteredRooms = rooms.filter((r) => matches(r.label))

  return (
    <aside className="al-surface-blur relative z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 md:flex">
      {/* Brand header */}
      <div className="shrink-0 px-3 pb-4 pt-4">
        <Brand />
      </div>

      {/* Primary workspace nav */}
      {filteredWorkspace.length > 0 && (
        <nav className="shrink-0 px-3">
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            Workspace
          </p>
          <div className="flex flex-col gap-0.5">
            {filteredWorkspace.map((t) => (
              <SideLink
                key={t.id}
                icon={t.icon}
                label={t.label}
                active={active === t.id}
                onClick={() => onSelect(t.id)}
              />
            ))}
          </div>
        </nav>
      )}

      <div className="mx-5 my-3 h-px shrink-0 bg-white/[0.06]" />

      {/* Scrollable rooms / channels */}
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
          Explore Labs
        </p>
        <div className="sidebar-scroll -mr-1 flex-1 overflow-y-auto pr-1">
          {filteredRooms.length > 0 ? (
            <div className="flex flex-col gap-0.5 pb-2">
              {filteredRooms.map((room) => (
                <SideLink
                  key={room.id}
                  icon={room.icon}
                  label={room.label}
                  flagship={room.flagship}
                  size="sm"
                  active={active === room.id}
                  onClick={() => onSelect(room.id)}
                />
              ))}
            </div>
          ) : (
            <p className="px-2 py-3 text-xs text-zinc-600">No matches for “{query}”.</p>
          )}
        </div>
      </div>

      {/* Pro upsell card */}
      <div className="shrink-0 p-3">
        <div className="rounded-2xl border border-turquoise/20 bg-gradient-to-br from-turquoise/10 via-periwinkle/5 to-transparent p-4">
          <p className="text-sm font-semibold text-zinc-100">
            Unlock Pro
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Free plan: up to {FREE_LIMITS.contacts} contacts, {FREE_LIMITS.polls} polls,{' '}
            {FREE_LIMITS.hookTests} hook tests. Upgrade for unlimited.
          </p>
          <button
            type="button"
            onClick={() =>
              toast('Pro plans are coming soon — thanks for your interest!', {
                title: 'Unlock Pro',
              })
            }
            className="mt-3 w-full rounded-lg bg-turquoise px-3 py-2 text-xs font-semibold text-black transition-all hover:brightness-110"
            style={{ boxShadow: '0 0 18px -4px color-mix(in oklab, var(--al-tq) 53%, transparent)' }}
          >
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  )
}
