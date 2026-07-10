// Pure time → atmosphere computation for the Living Editorial system.
//
// Five phases across the day; the first 30 minutes of each phase crossfades
// from the previous palette so the shift is felt, never seen. Testable via
// `?phase=night` (or dawn/day/sunset/twilight) in the URL — the override wins
// completely so every scene can be reviewed at any hour.

import { PALETTES, PHASES, blendPalettes } from '../tokens/palettes.js'

// Phase start times in minutes-since-midnight, in day order.
const SCHEDULE = [
  { phase: 'dawn', start: 5 * 60 },
  { phase: 'day', start: 7 * 60 },
  { phase: 'sunset', start: 17 * 60 },
  { phase: 'twilight', start: 19 * 60 },
  { phase: 'night', start: 21 * 60 }, // wraps past midnight until 05:00
]

const BLEND_MINUTES = 30

function phaseOverride() {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search).get('phase')
  return PHASES.includes(p) ? p : null
}

// Which schedule slot a given minute falls in, plus minutes since it began.
function slotFor(minutes) {
  // night wraps: anything before 05:00 belongs to the previous day's night.
  let idx = SCHEDULE.length - 1
  for (let i = 0; i < SCHEDULE.length; i++) {
    if (minutes >= SCHEDULE[i].start) idx = i
  }
  const slot = SCHEDULE[idx]
  let into = minutes - slot.start
  if (minutes < SCHEDULE[0].start) {
    // 00:00–05:00 → night started yesterday 21:00.
    into = minutes + (24 * 60 - SCHEDULE[SCHEDULE.length - 1].start)
  }
  return { idx, phase: slot.phase, into }
}

export function computeAtmosphere(date = new Date()) {
  const forced = phaseOverride()
  if (forced) {
    return { phase: forced, t: 1, palette: PALETTES[forced] }
  }

  const minutes = date.getHours() * 60 + date.getMinutes()
  const { idx, phase, into } = slotFor(minutes)
  const prevPhase = SCHEDULE[(idx - 1 + SCHEDULE.length) % SCHEDULE.length].phase
  const t = Math.min(1, into / BLEND_MINUTES)

  return {
    phase,
    t,
    palette: blendPalettes(PALETTES[prevPhase], PALETTES[phase], t),
  }
}
