import { AnimatePresence, motion } from 'motion/react'
import { springs } from './design/tokens/motion'
import { usePathname } from './lib/router'
import TopNav from './components/TopNav'
import Feed from './pages/Feed'
import SubmissionDetail from './pages/SubmissionDetail'
import NewSubmission from './pages/NewSubmission'
import MySubmissions from './pages/MySubmissions'

function matchSubmissionId(pathname) {
  const m = pathname.match(/^\/s\/([^/]+)\/?$/)
  return m ? decodeURIComponent(m[1]) : null
}

function renderRoute(pathname) {
  const submissionId = matchSubmissionId(pathname)
  if (submissionId) return <SubmissionDetail id={submissionId} />
  if (pathname === '/new') return <NewSubmission />
  if (pathname === '/mine') return <MySubmissions />
  return <Feed />
}

export default function App() {
  const pathname = usePathname()

  return (
    <div className="relative flex min-h-screen flex-col bg-transparent text-zinc-100">
      {/* Ambient tinted mist — kept faint so the SkyCanvas behind it carries
          the time-of-day atmosphere; these only add depth. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-1/4 size-[34rem] rounded-full bg-turquoise/5 blur-[150px]" />
        <div className="absolute -right-48 top-0 size-[34rem] rounded-full bg-periwinkle/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav />

        {/* Route switches play as a cinematic rack-focus cut: the outgoing
            view blurs and drifts up, the incoming one pulls into focus. */}
        <main className="flex-1 px-5 py-8 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
              transition={springs.soft}
            >
              {renderRoute(pathname)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
