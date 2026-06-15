import {
  Activity,
  ArrowUpRight,
  LayoutGrid,
  Radio,
  Sparkles,
  Users,
} from 'lucide-react'
import { rooms as sidebarRooms } from '../Sidebar/Sidebar'
import useRoomsLive from '../../hooks/useRoomsLive'

// Sidebar holds the canonical icon per room id; live DB rows only carry data.
const ICONS = Object.fromEntries(sidebarRooms.map((r) => [r.id, r.icon]))
const iconFor = (id) => ICONS[id] ?? LayoutGrid

/**
 * Deterministic pseudo-random from a string so DEMO stats stay stable across
 * re-renders. Only used as a fallback when the Supabase DB isn't reachable.
 */
function hashString(s) {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

const SAMPLE_HOOKS = [
  'Stop scrolling — this changes everything about your morning.',
  'I tried it for 30 days. Nobody warned me about day 7.',
  'The one thing the algorithm doesn’t want you to know.',
  'You’ve been doing this wrong your entire life. Here’s proof.',
  'This took 10 seconds and saved me 10 hours a week.',
]

// Build the demo (offline) room list from the sidebar + deterministic stats.
function demoRooms() {
  return sidebarRooms.map((r, i) => {
    const h = hashString(r.id)
    return {
      id: r.id,
      label: r.label,
      flagship: r.flagship ?? false,
      active_hooks: 2 + (h % 7),
      votes_today: 800 + ((h * 7) % 9200),
      engagement: 46 + (h % 50),
      top_hook: SAMPLE_HOOKS[i % SAMPLE_HOOKS.length],
      flash: false,
    }
  })
}

function RoomCard({ room, icon: Icon, live, onEnter }) {
  return (
    <button
      type="button"
      onClick={() => onEnter?.(room.id)}
      data-room-id={room.id}
      className={[
        'group relative flex flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/70',
        room.flash
          ? 'border-turquoise/60 bg-turquoise/[0.06]'
          : 'border-white/10 bg-zinc-950/60 hover:border-white/25',
      ].join(' ')}
      style={
        room.flash
          ? { boxShadow: '0 0 0 1px #34e0a155, 0 12px 40px -12px #34e0a166' }
          : undefined
      }
    >
      {/* hover glow: turquoise -> periwinkle */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-turquoise/10 via-transparent to-periwinkle/15" />
      </div>

      {/* Header: icon tile + LIVE / DEMO indicator */}
      <div className="relative flex items-start justify-between">
        <span
          className="inline-flex size-11 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/25 transition-all group-hover:ring-turquoise/50"
          style={{ boxShadow: '0 0 22px -8px #34e0a1' }}
        >
          <Icon
            className="size-5 text-turquoise"
            style={{ filter: 'drop-shadow(0 0 6px #34e0a1)' }}
          />
        </span>

        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
            live
              ? 'border-turquoise/20 bg-turquoise/10 text-turquoise'
              : 'border-white/10 bg-white/5 text-zinc-400',
          ].join(' ')}
        >
          {live ? (
            <>
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-turquoise opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-turquoise" />
              </span>
              Live
            </>
          ) : (
            'Demo'
          )}
        </span>
      </div>

      {/* Title + flagship flag */}
      <div className="relative mt-4 flex items-center gap-2">
        <h3 className="text-base font-semibold text-zinc-50">{room.label}</h3>
        {room.flagship && (
          <span className="rounded-full bg-turquoise/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-turquoise">
            Flagship
          </span>
        )}
      </div>

      {/* Top hook — the live leader for the room */}
      <p className="relative mt-2 line-clamp-2 min-h-10 text-sm leading-snug text-zinc-400">
        {room.top_hook ? `“${room.top_hook}”` : 'No hooks live yet.'}
      </p>

      {/* Stat row */}
      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat icon={Users} value={room.active_hooks ?? 0} label="Hooks" />
        <Stat
          icon={Activity}
          value={(room.votes_today ?? 0).toLocaleString()}
          label="Votes"
        />
        <Stat icon={Radio} value={`${room.engagement ?? 0}%`} label="Active" />
      </div>

      {/* Engagement activity bar */}
      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
          <span>Engagement</span>
          <span className="text-turquoise">{room.engagement ?? 0}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-turquoise to-periwinkle transition-all duration-700"
            style={{
              width: `${room.engagement ?? 0}%`,
              boxShadow: '0 0 12px #34e0a155',
            }}
          />
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative mt-5 flex items-center gap-1.5 text-sm font-medium text-turquoise opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        Enter room
        <ArrowUpRight className="size-4" />
      </div>
    </button>
  )
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2.5">
      <Icon className="mx-auto size-3.5 text-zinc-500" />
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">
        {label}
      </p>
    </div>
  )
}

/**
 * Interactive grid of active voting rooms, wired to live Supabase data via
 * useRoomsLive. Falls back to deterministic demo data when the DB isn't
 * reachable yet (placeholder creds, schema not run, or offline).
 *
 * @param {(id: string) => void} [onEnterRoom] - called when a card is clicked
 */
export default function RoomsGrid({ onEnterRoom }) {
  const { rooms: liveRooms, online, status } = useRoomsLive()

  const live = status === 'live' && liveRooms.length > 0
  const loading = status === 'loading'
  const rooms = live ? liveRooms : demoRooms()

  // Online count: real presence when live, else a stable demo aggregate.
  const onlineCount = live
    ? online
    : rooms.reduce((sum, r) => sum + ((hashString(r.id) % 460) + 40), 0)

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-turquoise/25 bg-turquoise/10 px-2.5 py-1 text-[11px] font-semibold text-turquoise">
            <Sparkles className="size-3" />
            Rooms Dashboard
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
            Active voting rooms
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            Jump into a room to test hooks against a live audience.
            {!live && !loading && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Demo data
              </span>
            )}
          </p>
        </div>

        {/* Aggregate live counter */}
        <div className="flex items-center gap-2 rounded-full border border-turquoise/20 bg-turquoise/10 px-3.5 py-2 text-sm font-semibold text-turquoise">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-turquoise opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-turquoise" />
          </span>
          {onlineCount.toLocaleString()} {live ? 'online now' : 'creators online'}
        </div>
      </div>

      {/* Grid */}
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            icon={iconFor(room.id)}
            live={live}
            onEnter={onEnterRoom}
          />
        ))}
      </div>
    </div>
  )
}
