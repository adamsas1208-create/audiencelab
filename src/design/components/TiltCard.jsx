// TiltCard — true 3D perspective tilt toward the pointer, with a specular
// sheen that sweeps across the surface. The Apple-product-page feel, tuned to
// stay quiet enough for the Living Editorial aesthetic.
//
// Mechanics: the outer div provides perspective; an inner frame spring-lerps
// rotateX/rotateY (max ~7°) toward the pointer's position within the card via
// a per-card rAF loop that runs ONLY while hovered (refs only — zero React
// state per frame). A radial-gradient highlight tracks the pointer through two
// CSS custom properties and fades in on hover.
//
// Composes safely with the existing motion.div stagger/hover wrappers (they
// animate y on a separate element; this animates rotation on its own frame).
// Under prefers-reduced-motion or coarse pointers it renders children plain.

import { useEffect, useRef, useState } from 'react'

// Fine pointer + full motion — computed once; tilt is inert otherwise.
const canTilt = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function TiltCard({
  max = 7,
  sheen = true,
  radiusClassName = 'rounded-2xl',
  className = '',
  children,
}) {
  const frameRef = useRef(null)
  const state = useRef({
    rx: 0, ry: 0, // current rotation
    tx: 0, ty: 0, // target rotation
    rect: null,
    raf: 0,
    hovering: false,
  })
  const [enabled] = useState(canTilt)

  useEffect(() => {
    const s = state.current
    return () => cancelAnimationFrame(s.raf)
  }, [])

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  const tick = () => {
    const s = state.current
    const el = frameRef.current
    if (!el) return
    s.rx += (s.tx - s.rx) * 0.14
    s.ry += (s.ty - s.ry) * 0.14
    el.style.transform = `rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg)`
    const settled =
      !s.hovering && Math.abs(s.rx) < 0.02 && Math.abs(s.ry) < 0.02
    if (settled) {
      el.style.transform = ''
      s.raf = 0
      return
    }
    s.raf = requestAnimationFrame(tick)
  }

  const onEnter = (e) => {
    const s = state.current
    s.hovering = true
    s.rect = e.currentTarget.getBoundingClientRect()
    if (!s.raf) s.raf = requestAnimationFrame(tick)
  }

  const onMove = (e) => {
    const s = state.current
    if (!s.rect || !s.rect.width || !s.rect.height) return
    const px = (e.clientX - s.rect.left) / s.rect.width // 0..1
    const py = (e.clientY - s.rect.top) / s.rect.height
    s.ty = (px - 0.5) * 2 * max
    s.tx = -(py - 0.5) * 2 * max
    const el = frameRef.current
    if (el) {
      el.style.setProperty('--al-sheen-x', `${(px * 100).toFixed(1)}%`)
      el.style.setProperty('--al-sheen-y', `${(py * 100).toFixed(1)}%`)
    }
  }

  const onLeave = () => {
    const s = state.current
    s.hovering = false
    s.tx = 0
    s.ty = 0
    if (!s.raf) s.raf = requestAnimationFrame(tick)
  }

  return (
    <div
      data-tilt
      className={className}
      style={{ perspective: '900px' }}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div
        ref={frameRef}
        className="group/tilt relative h-full w-full will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
        {sheen && (
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100',
              radiusClassName,
            ].join(' ')}
            style={{
              background:
                'radial-gradient(340px circle at var(--al-sheen-x, 50%) var(--al-sheen-y, 50%), rgba(255,255,255,0.10), rgba(255,255,255,0.035) 40%, transparent 70%)',
            }}
          />
        )}
      </div>
    </div>
  )
}
