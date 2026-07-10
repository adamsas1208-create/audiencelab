// The heart of the Living Editorial system. Recomputes the time-of-day
// atmosphere every 30 seconds and pumps it into :root as CSS custom
// properties. Tailwind's theme tokens (see index.css @theme) point at these
// variables, so the ENTIRE app — every zinc surface, hairline, accent — flips
// between ivory editorial daylight and deep-navy night without any component
// opting in. SkyCanvas reads the same context to paint the sky itself.

import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { computeAtmosphere } from './useTimeOfDay.js'
import { hexToRgb } from '../tokens/palettes.js'

const AtmosphereContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useAtmosphere() {
  return useContext(AtmosphereContext)
}

const VAR_MAP = {
  paper: '--al-paper',
  z50: '--al-z50',
  z100: '--al-z100',
  z200: '--al-z200',
  z300: '--al-z300',
  z400: '--al-z400',
  z500: '--al-z500',
  z600: '--al-z600',
  z700: '--al-z700',
  z800: '--al-z800',
  z900: '--al-z900',
  z950: '--al-z950',
  white: '--al-white',
  black: '--al-black',
  turquoise: '--al-tq',
  periwinkle: '--al-peri',
}

export default function AtmosphereProvider({ children }) {
  const [atmo, setAtmo] = useState(() => computeAtmosphere())

  // Re-evaluate twice a minute — 60 imperceptible steps across each 30-minute
  // crossfade window.
  useEffect(() => {
    const id = setInterval(() => setAtmo(computeAtmosphere()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Write the palette into :root before paint so there's never a flash of the
  // wrong time of day. The page background is ALSO set directly on <body> —
  // it's the single most important surface and this keeps it correct even if
  // a stylesheet/cascade quirk interferes with var resolution on body.
  useLayoutEffect(() => {
    const root = document.documentElement
    for (const [key, cssVar] of Object.entries(VAR_MAP)) {
      root.style.setProperty(cssVar, atmo.palette[key])
    }
    root.style.colorScheme = atmo.palette.colorScheme
    document.body.style.backgroundColor = atmo.palette.paper

    // Paper-on-a-desk depth for light phases: glass cards get a soft drop
    // shadow, tinted per phase (coral at dawn, terracotta at sunset, neutral
    // gray at midday) whose strength follows `shadow` (night uses glow for
    // depth instead, so the shadow fades to nothing after dark).
    const s = atmo.palette.shadow ?? 0
    const [sr, sg, sb] = hexToRgb(atmo.palette.shadowTint || '#3E3422')
    root.style.setProperty(
      '--al-card-shadow',
      s > 0.01
        ? `0 18px 44px -22px rgba(${sr}, ${sg}, ${sb}, ${(0.22 * s).toFixed(3)}), 0 2px 10px -5px rgba(${sr}, ${sg}, ${sb}, ${(0.1 * s).toFixed(3)})`
        : 'none',
    )

    // Glass card tint % — bumped for busier skies (sunset horizons are
    // crimson-hot; body text needs a denser card fill to stay readable).
    // Consumed by .al-glass in index.css.
    const gf = atmo.palette.glassFraction ?? 42
    root.style.setProperty('--al-glass-tint', `${gf}%`)
  }, [atmo])

  return (
    <AtmosphereContext.Provider value={atmo}>
      {children}
    </AtmosphereContext.Provider>
  )
}
