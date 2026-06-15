import {
  Anchor,
  BarChart3,
  Clapperboard,
  Cpu,
  Dumbbell,
  Eye,
  Gamepad2,
  Gem,
  Globe,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  Plane,
  TrendingUp,
  UtensilsCrossed,
  Vote,
} from 'lucide-react'

// Primary workspace views.
export const workspace = [
  { id: 'dashboard', label: 'Rooms Dashboard', icon: LayoutGrid },
  { id: 'vote', label: 'Vote View', icon: Vote },
  { id: 'studio', label: 'Creator Studio', icon: BarChart3 },
  { id: 'critique', label: 'Critique Room', icon: MessagesSquare },
]

// The 11 elite rooms (channels). Hook Lab is the flagship and sits at the top.
export const rooms = [
  { id: 'hook-lab', label: 'Hook Lab', icon: Anchor, flagship: true },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'tech-finance', label: 'Tech & Finance', icon: Cpu },
  { id: 'lifestyle-beauty', label: 'Lifestyle & Beauty', icon: Gem },
  { id: 'fitness-health', label: 'Fitness & Health', icon: Dumbbell },
  { id: 'entertainment', label: 'Entertainment', icon: Clapperboard },
  { id: 'business-marketing', label: 'Business & Marketing', icon: TrendingUp },
  { id: 'food-cooking', label: 'Food & Cooking', icon: UtensilsCrossed },
  { id: 'travel-adventure', label: 'Travel & Adventure', icon: Plane },
  { id: 'education-science', label: 'Education & Science', icon: GraduationCap },
  { id: 'general', label: 'General / Off-Topic', icon: Globe },
]

export const roomIds = new Set(rooms.map((r) => r.id))

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 pt-1">
      <span
        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/30"
        style={{ boxShadow: '0 0 22px -6px #34e0a1' }}
      >
        <Eye
          className="size-5 text-turquoise"
          style={{ filter: 'drop-shadow(0 0 6px #34e0a1)' }}
        />
      </span>
      <div className="leading-tight">
        <p className="text-base font-bold tracking-tight text-white">
          AudienceLab
        </p>
        <p className="text-[11px] font-medium text-zinc-500">
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
      {/* Neon left-border indicator: glows in on hover, locked on when active */}
      <span
        className={[
          'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 origin-center rounded-full bg-turquoise transition-all duration-200',
          active
            ? 'scale-y-100 opacity-100'
            : 'scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100',
        ].join(' ')}
        style={{ boxShadow: '0 0 10px #34e0a1, 0 0 4px #34e0a1' }}
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
 */
export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="relative z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-black/80 backdrop-blur-xl md:flex">
      {/* Brand header */}
      <div className="shrink-0 px-3 pb-4 pt-4">
        <Brand />
      </div>

      {/* Primary workspace nav */}
      <nav className="shrink-0 px-3">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
          Workspace
        </p>
        <div className="flex flex-col gap-0.5">
          {workspace.map((t) => (
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

      <div className="mx-5 my-3 h-px shrink-0 bg-white/[0.06]" />

      {/* Scrollable rooms / channels */}
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
          Explore Labs
        </p>
        <div className="sidebar-scroll -mr-1 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-0.5 pb-2">
            {rooms.map((room) => (
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
        </div>
      </div>

      {/* Pro upsell card */}
      <div className="shrink-0 p-3">
        <div className="rounded-2xl border border-turquoise/20 bg-gradient-to-br from-turquoise/10 via-periwinkle/5 to-transparent p-4">
          <p className="text-sm font-semibold text-zinc-100">
            Unlock Pro insights
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Test up to 4 hooks at once and get AI rewrite suggestions.
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-lg bg-turquoise px-3 py-2 text-xs font-semibold text-black transition-all hover:brightness-110"
            style={{ boxShadow: '0 0 18px -4px #34e0a188' }}
          >
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  )
}
