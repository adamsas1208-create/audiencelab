// The Aurora Cursor — a decaying comet trail of additive glow that follows the
// pointer across the whole app. Color is read live from `--al-tq`, so the
// trail is bottle-green by day and neon mint after dark, exactly like every
// other brand glow in the Living Editorial system.
//
// Behavior notes:
//  - Fixed full-viewport canvas ABOVE the UI (z-60), pointer-events: none.
//  - Ring buffer of recent pointer samples; each renders as a soft radial dot
//    that fades and shrinks over ~350ms. Additive blending = light, not paint.
//  - Hovering anything interactive (button/a/[data-tilt]) tightens and
//    brightens the trail; pointerdown fires a burst pulse.
//  - Not mounted at all for touch devices or prefers-reduced-motion, and the
//    loop pauses when the tab is hidden (same discipline as SkyCanvas).

import { useEffect, useRef } from 'react'

const TRAIL_LIFE_MS = 350
const MAX_POINTS = 32

function hexToRgb(hex) {
  const h = hex.trim().replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export default function CursorAurora() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let w = 0
    let h = 0
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Trail state — mutated imperatively, never touches React.
    const points = [] // { x, y, t, hot, burst }
    let hot = false // pointer is over an interactive element
    let burst = 0 // pointerdown pulse, decays each frame
    let lastHotCheck = 0
    let tint = [52, 224, 161]
    let lastTintRead = 0

    const onMove = (e) => {
      // Throttled interactive-element check (~every 80ms, not per event).
      const now = performance.now()
      if (now - lastHotCheck > 80) {
        lastHotCheck = now
        hot = !!(e.target && e.target.closest?.('button, a, [data-tilt]'))
      }
      points.push({ x: e.clientX, y: e.clientY, t: now, hot, burst })
      if (points.length > MAX_POINTS) points.shift()
    }
    const onDown = () => {
      burst = 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })

    let raf
    let running = true
    const frame = (now) => {
      if (!running) return
      // Re-read the atmosphere accent about once a second (it drifts across
      // phase crossfades).
      if (now - lastTintRead > 1000) {
        lastTintRead = now
        const v = getComputedStyle(document.documentElement)
          .getPropertyValue('--al-tq')
          .trim()
        if (v.startsWith('#')) tint = hexToRgb(v)
      }
      burst = Math.max(0, burst - 0.06)

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      const [r, g, b] = tint
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i]
        const age = (now - p.t) / TRAIL_LIFE_MS
        if (age >= 1) {
          points.splice(i, 1)
          continue
        }
        const fade = (1 - age) * (1 - age)
        const tighten = p.hot ? 0.6 : 1
        const radius = (10 * tighten + 26 * p.burst) * (1 - age * 0.7)
        const alpha = fade * (p.hot ? 0.34 : 0.2) + p.burst * 0.25 * fade
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // Pause completely in hidden tabs; resume with a clean slate.
    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
        points.length = 0
        ctx.clearRect(0, 0, w, h)
      } else if (!running) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        pointerEvents: 'none',
      }}
    />
  )
}
