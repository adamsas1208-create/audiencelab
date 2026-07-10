// SkyStage — the full-viewport cinematic sky.
//
// Four DOM/SVG layers behind the app that together make the sky feel like a
// real atmosphere, not a color tint. Sits between the WebGL SkyCanvas (z-0)
// and the app UI (z-10+); all layers are pointer-events:none and unaware of
// interaction.
//
//   Layer 1 — Bands: a vertical linear-gradient assembled from the palette's
//             `bands` array (horizon → mid → high → zenith). This is what
//             carries the phase's identity: crimson-to-violet at sunset,
//             cool sky-blue by day, deep violet at twilight.
//
//   Layer 2 — Sun: an SVG circle with a soft peach halo (SVG blur filter)
//             positioned by `--al-sun-x` (drifting horizontally over ~90s)
//             and the palette's `sunY` (rising for dawn, high at noon,
//             setting at sunset, hidden at night).
//
//   Layer 3 — Haze: an SVG turbulence overlay at ~5% opacity with
//             mix-blend-mode: overlay to break up the flat gradient and add
//             a whisper of atmospheric depth.
//
//   Layer 4 — Ambient cast: a soft-light gradient at the top of the viewport
//             tinted by `sunTint`, so glass cards near the top pick up a
//             warm highlight edge — the sun "lighting the room."

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtmosphere } from './AtmosphereProvider.jsx'

// The one-shot reduced-motion set on mount is intentional (initial pose sync);
// React Compiler's set-state-in-effect check doesn't model this pattern.
/* eslint-disable react-hooks/set-state-in-effect */

const DRIFT_MS = 90_000

export default function SkyStage() {
  const atmo = useAtmosphere()
  const bands = atmo?.palette.bands
  const sunY = atmo?.palette.sunY ?? 60
  const sunTint = atmo?.palette.sunTint || '#FFB37A'
  // Bands fade to transparent at night so the WebGL sky (stars, moon, neon
  // horizon) shows through — opaque bands would eclipse the whole scene.
  const bandsOpacity = atmo?.palette.bandsOpacity ?? 1
  const sunWeight =
    (atmo?.palette.scene?.dawn ?? 0) +
    (atmo?.palette.scene?.daylight ?? 0) +
    (atmo?.palette.scene?.sunset ?? 0)

  // Slow, quiet horizontal drift. rAF loops 0→1 across DRIFT_MS then wraps.
  // Uses a ref for the loop, writes to state only when the value has moved
  // enough to matter (~1% steps → ~1 write/second, painless).
  // Reduced-motion parks the sun at mid-frame.
  const [driftT, setDriftT] = useState(0)
  const lastRef = useRef(0)
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      lastRef.current = 0.5
      setDriftT(0.5)
      return
    }
    const t0 = performance.now()
    let raf
    const loop = () => {
      const elapsed = (performance.now() - t0) % DRIFT_MS
      const t = elapsed / DRIFT_MS
      if (Math.abs(t - lastRef.current) > 0.01) {
        lastRef.current = t
        setDriftT(t)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Sun x: eases 8% → 92% and back (bounce, so it doesn't teleport at the
  // wrap). Half-cycle across-and-back keeps the drift feeling continuous.
  const bounce = driftT < 0.5 ? driftT * 2 : 2 - driftT * 2
  const sunX = 8 + bounce * 84

  // Compose the vertical band gradient from the 4 palette hexes.
  const bandGradient = useMemo(() => {
    if (!bands || bands.length < 4) return 'transparent'
    // Order from top (zenith) to bottom (horizon) so linear-gradient reads
    // naturally with its default top→bottom direction.
    return `linear-gradient(to bottom, ${bands[3]} 0%, ${bands[2]} 45%, ${bands[1]} 75%, ${bands[0]} 100%)`
  }, [bands])

  return (
    <div
      data-sky-stage
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}
    >
      {/* Layer 1 — sky bands (fade out at night so WebGL shows through) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: bandGradient,
          opacity: bandsOpacity,
          transition: 'background 2s linear, opacity 2s linear',
        }}
      />

      {/* Layer 2 — the sun disc (only when there's actually a sun) */}
      {sunWeight > 0.05 && (
        <svg
          style={{
            position: 'absolute',
            top: `${sunY}%`,
            left: `${sunX}%`,
            width: 260,
            height: 260,
            transform: 'translate(-50%, -50%)',
            opacity: Math.min(1, sunWeight),
            transition: 'top 2s linear, opacity 2s linear',
            filter: 'blur(0.5px)',
          }}
          viewBox="0 0 260 260"
        >
          <defs>
            <radialGradient id="al-sun-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="18%" stopColor={sunTint} stopOpacity="0.85" />
              <stop offset="45%" stopColor={sunTint} stopOpacity="0.35" />
              <stop offset="100%" stopColor={sunTint} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="al-sun-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFEF3" stopOpacity="1" />
              <stop offset="70%" stopColor="#FFF3C8" stopOpacity="0.9" />
              <stop offset="100%" stopColor={sunTint} stopOpacity="0.4" />
            </radialGradient>
          </defs>
          {/* Big soft halo */}
          <circle cx="130" cy="130" r="130" fill="url(#al-sun-halo)" />
          {/* Bright inner disc */}
          <circle cx="130" cy="130" r="40" fill="url(#al-sun-core)" />
        </svg>
      )}

      {/* Layer 3 — atmospheric haze / grain (fades with the bands so it never
          veils the WebGL stars at night) */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.07 * bandsOpacity,
          mixBlendMode: 'overlay',
          transition: 'opacity 2s linear',
        }}
      >
        <defs>
          <filter id="al-haze">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.9 0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#al-haze)" />
      </svg>

      {/* Layer 4 — ambient cast onto the top of the UI (sun through a window).
          Kept subtle; soft-light multiplies gently over glass card tops. */}
      {sunWeight > 0.05 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '18vh',
            background: `linear-gradient(to bottom, ${sunTint}44 0%, transparent 100%)`,
            mixBlendMode: 'soft-light',
            transition: 'background 2s linear',
          }}
        />
      )}
    </div>
  )
}
