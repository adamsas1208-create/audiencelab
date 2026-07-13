import { useEffect, useState } from 'react'

// A minimal, dependency-free client-side router. The app has exactly four
// routes (feed, submission detail, new, mine) — not worth pulling in
// react-router for. Mirrors the project's existing convention of matching
// window.location.pathname directly (see the old /p/<handle> check that
// used to live in App.jsx) but adds real pushState navigation so links are
// shareable/bookmarkable and back/forward work.

const LISTENERS = new Set()

function notify() {
  for (const fn of LISTENERS) fn()
}

/** Navigate without a full page reload. Pass `{ replace: true }` to swap
 * the current history entry instead of pushing a new one (e.g. after a
 * redirect-to-login). */
export function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
  notify()
}

// Intercept plain <a href="/..."> clicks so internal links behave like SPA
// navigation without every call site needing an onClick handler.
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', notify)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a')
    if (!a || a.target || a.hasAttribute('download') || a.origin !== window.location.origin) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    // Same-page hash link (e.g. "#feed") — let the browser scroll to the
    // anchor natively instead of routing, otherwise in-page jump links break.
    if (a.hash && a.pathname === window.location.pathname && a.search === window.location.search) {
      return
    }
    e.preventDefault()
    navigate(a.pathname + a.search + a.hash)
  })
}

/** Current pathname; re-renders the component on navigation. */
export function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  useEffect(() => {
    const onNav = () => setPathname(window.location.pathname)
    LISTENERS.add(onNav)
    return () => LISTENERS.delete(onNav)
  }, [])
  return pathname
}
