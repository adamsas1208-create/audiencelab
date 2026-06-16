import { useState } from 'react'
import { Bell, Search, Settings } from 'lucide-react'
import Sidebar, { rooms, roomIds, workspace } from './components/Sidebar/Sidebar'
import AuthMenu from './components/Auth/AuthMenu'
import Dashboard from './components/Dashboard/Dashboard'
import VoteView from './components/VoteView'
import CreatorStudio from './components/CreatorStudio'
import CritiqueRoom from './components/CritiqueRoom'

export default function App() {
  // A single active id drives both the sidebar highlight and the rendered view.
  // It can be a workspace id ('dashboard' | 'vote' | 'studio' | 'critique')
  // or a room id.
  const [active, setActive] = useState('dashboard')

  const isRoom = roomIds.has(active)
  const activeRoom = isRoom ? rooms.find((r) => r.id === active) : null

  // The dashboard is the landing view; selecting a room card (or a sidebar
  // room) drops into that room's Vote View.
  const renderView = () => {
    if (active === 'dashboard') return <Dashboard onEnterRoom={setActive} />
    if (active === 'studio') return <CreatorStudio />
    if (active === 'critique') return <CritiqueRoom />
    return <VoteView roomId={activeRoom?.id} roomName={activeRoom?.label} />
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-black text-zinc-100">
      {/* Ambient glowing gradient overlays — turquoise from the left,
          periwinkle from the right — for depth. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-1/4 size-[34rem] rounded-full bg-turquoise/20 blur-[140px]" />
        <div className="absolute -right-48 top-0 size-[34rem] rounded-full bg-periwinkle/25 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 size-[28rem] rounded-full bg-periwinkle/10 blur-[150px]" />
      </div>

      {/* Fixed full-height sidebar */}
      <Sidebar active={active} onSelect={setActive} />

      {/* Main column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-black/60 px-5 py-3.5 backdrop-blur-xl">
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

          {/* Search */}
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search hooks, rooms, creators…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:bg-white/[0.07] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Bell className="size-4" />
              <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-turquoise" />
            </button>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Settings className="size-4" />
            </button>
            <div className="ml-1">
              <AuthMenu />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          {renderView()}
        </main>
      </div>
    </div>
  )
}
