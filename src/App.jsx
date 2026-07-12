import { useState } from 'react'
import { Bell, Search, Settings } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { springs } from './design/tokens/motion'
import { useData } from './context/data-context'
import Sidebar from './components/Sidebar/Sidebar'
import { rooms, roomIds, workspace } from './components/Sidebar/nav'
import AuthMenu from './components/Auth/AuthMenu'
import Dashboard from './components/Dashboard/Dashboard'
import Audience from './components/Audience/Audience'
import VoteView from './components/VoteView'
import CreatorStudio from './components/CreatorStudio'
import VideoLab from './components/VideoLab/VideoLab'
import CritiqueRoom from './components/CritiqueRoom'
import Cortex from './components/Cortex/Cortex'
import PublicProfile from './components/PublicProfile/PublicProfile'

// Lightweight public route: /p/<handle> renders a standalone, chrome-free
// creator page (no sidebar/topbar). Anything else renders the authed app.
function publicProfileHandle() {
  if (typeof window === 'undefined') return null
  const m = window.location.pathname.match(/^\/p\/([^/]+)\/?$/)
  return m ? decodeURIComponent(m[1]) : null
}

export default function App() {
  const handle = publicProfileHandle()
  if (handle) return <PublicProfile handle={handle} />

  return <AppShell />
}

function AppShell() {
  // A single active id drives both the sidebar highlight and the rendered view.
  // It can be a workspace id ('dashboard' | 'vote' | 'studio' | 'critique')
  // or a room id.
  const [active, setActive] = useState('dashboard')
  const [query, setQuery] = useState('')
  const { toast } = useData()

  const isRoom = roomIds.has(active)
  const activeRoom = isRoom ? rooms.find((r) => r.id === active) : null

  // The dashboard is the landing view; selecting a room card (or a sidebar
  // room) drops into that room's Vote View.
  const renderView = () => {
    if (active === 'dashboard') return <Dashboard onEnterRoom={setActive} />
    if (active === 'cortex') return <Cortex />
    if (active === 'audience') return <Audience />
    if (active === 'studio') return <CreatorStudio />
    if (active === 'videolab') return <VideoLab />
    if (active === 'critique') return <CritiqueRoom />
    return <VoteView roomId={activeRoom?.id} roomName={activeRoom?.label} />
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-transparent text-zinc-100">
      {/* Ambient tinted mist — kept faint so the SkyCanvas behind it carries
          the time-of-day atmosphere; these only add depth. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-1/4 size-[34rem] rounded-full bg-turquoise/5 blur-[150px]" />
        <div className="absolute -right-48 top-0 size-[34rem] rounded-full bg-periwinkle/5 blur-[150px]" />
      </div>

      {/* Fixed full-height sidebar */}
      <Sidebar
        active={active}
        onSelect={(id) => {
          setActive(id)
          setQuery('') // jumping to a room/workspace clears an active filter
        }}
        query={query}
      />

      {/* Main column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="al-surface-blur flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-3.5">
          {/* Mobile workspace switcher (sidebar is hidden on small screens) */}
          <div className="flex items-center gap-1 md:hidden">
            {workspace.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActive(t.id)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                    active === t.id ? 'bg-turquoise/10 text-turquoise' : 'text-zinc-400',
                  ].join(' ')}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden xs:inline">{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Search — filters the room/workspace list in the sidebar live */}
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms & workspaces…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:bg-white/[0.07] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                toast('No new notifications yet.', { title: 'Notifications' })
              }
              className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Bell className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setActive('audience')}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Settings className="size-4" />
            </button>
            <div className="ml-1">
              <AuthMenu />
            </div>
          </div>
        </header>

        {/* Content — workspace switches play as a cinematic rack-focus cut:
            the outgoing view blurs and drifts up, the incoming one pulls into
            focus from below. */}
        <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
              transition={springs.soft}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
