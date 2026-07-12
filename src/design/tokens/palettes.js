// The five time-of-day palette keyframes for the "Living Editorial" system.
//
// Every palette redefines the ENTIRE neutral ramp the app is built on
// (Tailwind's zinc scale + white/black + the two brand accents) so the whole
// UI flips between editorial-ivory daylight and deep-navy night without any
// component knowing. The mapping trick:
//
//   zinc-950  = "deepest surface"  → card white by day, deep navy at night
//   zinc-100  = "primary text"     → ink by day, silver-ivory at night
//   white     = "contrast edge"    → borders/hairlines/subtle fills flip side
//   black     = "on-accent + scrim"→ paper-frost by day, true dark at night
//   turquoise = the accent         → deep bottle-green on ivory (legible),
//                                    glowing mint after dark (the classic)
//
// `scene` weights drive the SkyCanvas: dawn glow, sunset sun, stars, moon.
// `sunTint` drives the DOM-level ambient corner glow (AtmosphereProvider) —
// WebGL additive glows are invisible against a light canvas, so daylight
// phases need a real CSS tint to actually read as distinct from each other.
// `shadowTint` colors the card drop-shadow so it warms/cools with the sun
// instead of staying a single flat brown all day.
//
// dawn/day/sunset were widened deliberately (2026-07-08) — the original
// ramps differed by only 1–3% brightness and were indistinguishable in any
// screenshot. Night/twilight already read well and are untouched.

export const PHASES = ['dawn', 'day', 'sunset', 'twilight', 'night']

export const PALETTES = {
  dawn: {
    // Blush-peach cream — warm, pink-leaning.
    colorScheme: 'light',
    paper: '#F6E4D2',
    z50: '#20120A',
    z100: '#2E1B10',
    z200: '#40291C',
    z300: '#5C4030',
    z400: '#855F4A',
    z500: '#A67D5F',
    z600: '#C79E80',
    z700: '#E0BFA0',
    z800: '#EFD8BE',
    z900: '#F5E4D0',
    z950: '#FBEEDE',
    white: '#1F140B',
    black: '#FBEFE1',
    turquoise: '#1B7F52',
    periwinkle: '#6B58A0',
    sunTint: '#FFB37A',
    shadowTint: '#6B4A2E',
    // Vertical sky bands: horizon → mid → high → zenith. Dawn = soft rose
    // rising into a cool lavender sky, sun rising from the bottom-right.
    bands: ['#FFC79E', '#F4A585', '#D688A8', '#7B6DA5'],
    bandsOpacity: 1,   // Light phase — the DOM sky carries it; WebGL is idle.
    sunY: 78,        // % from top (near horizon, rising)
    glassFraction: 48, // Card tint % — light phases keep text legible.
    scene: { dawn: 1, sunset: 0, stars: 0, moon: 0, daylight: 0.35 },
    shadow: 0.85,
  },
  day: {
    // Cool, crisp, almost-white with a whisper of blue-gray — the calmest
    // and most neutral of the three light phases.
    colorScheme: 'light',
    paper: '#EDEFEF',
    z50: '#12131A',
    z100: '#1B1D26',
    z200: '#282B38',
    z300: '#3E4150',
    z400: '#5F6372',
    z500: '#7C8090',
    z600: '#9A9DAC',
    z700: '#BEC1CC',
    z800: '#D8DAE0',
    z900: '#E8E9ED',
    z950: '#F8F9FA',
    white: '#14151C',
    black: '#FAFBFB',
    turquoise: '#0E8562',
    periwinkle: '#3F3FB0',
    sunTint: '#BFD6E8',
    shadowTint: '#3A3E4A',
    // Airy daytime sky — soft sky blue at zenith, warm cream near horizon.
    bands: ['#F5EEE0', '#EAE6DC', '#D8DFE6', '#B8CBDE'],
    bandsOpacity: 1,
    sunY: 22,        // % from top (high sun)
    glassFraction: 44,
    scene: { dawn: 0, sunset: 0, stars: 0, moon: 0, daylight: 1 },
    shadow: 1,
  },
  sunset: {
    // Deep apricot-rose — the most saturated of the light phases.
    colorScheme: 'light',
    paper: '#F6DCC0',
    z50: '#200D08',
    z100: '#2E140D',
    z200: '#431F15',
    z300: '#613021',
    z400: '#8C4830',
    z500: '#B05F3F',
    z600: '#CC7D57',
    z700: '#E0A17E',
    z800: '#EDC0A0',
    z900: '#F4D3B8',
    z950: '#FBE7D2',
    white: '#210D06',
    black: '#FBE4CC',
    turquoise: '#2E6E42',
    periwinkle: '#83527E',
    sunTint: '#FF8F5C',
    shadowTint: '#7A3A22',
    // The showcase phase — Blade Runner 2049 sunset: crimson horizon,
    // burnt orange, warm amber, dusty rose, deep violet zenith.
    bands: ['#B23A2C', '#E86B3F', '#F0A85E', '#8E5F82'],
    bandsOpacity: 1,
    sunY: 68,        // % from top (setting near horizon)
    glassFraction: 55, // Bumped — sunset is the busiest sky, need contrast.
    scene: { dawn: 0, sunset: 1, stars: 0, moon: 0, daylight: 0.25 },
    shadow: 0.75,
  },
  twilight: {
    colorScheme: 'dark',
    paper: '#14121F',
    z50: '#F1EEE4',
    z100: '#E6E2D6',
    z200: '#CBC7BB',
    z300: '#ADA99E',
    z400: '#8A8880',
    z500: '#6D6C66',
    z600: '#55535F',
    z700: '#3C3A4C',
    z800: '#282639',
    z900: '#1B1929',
    z950: '#171522',
    white: '#F2EFE5',
    black: '#060510',
    turquoise: '#34e0a1',
    periwinkle: '#7B78FF',
    sunTint: '#4A3F72',
    shadowTint: '#2A2438',
    // Twilight — deep dusty violet fading to indigo. WebGL stars pop against it.
    bands: ['#3B2B4A', '#2A2140', '#1F1A32', '#151125'],
    bandsOpacity: 0.45, // Semi-transparent — WebGL stars peek through the haze.
    sunY: 92,        // % from top (below horizon, sun gone)
    glassFraction: 42, // Dark surface already, keep translucent for stars.
    scene: { dawn: 0, sunset: 0, stars: 0.4, moon: 0, daylight: 0 },
    shadow: 0.15,
  },
  night: {
    colorScheme: 'dark',
    paper: '#090E1B',
    z50: '#F2EFE6',
    z100: '#E8E4DA',
    z200: '#CDC9BE',
    z300: '#AFACA1',
    z400: '#8B897F',
    z500: '#6E6D65',
    z600: '#565761',
    z700: '#3A3E4E',
    z800: '#232838',
    z900: '#141927',
    z950: '#0D1220',
    white: '#F4F1E8',
    black: '#030509',
    turquoise: '#34e0a1',
    periwinkle: '#6260ff',
    sunTint: '#1B2340',
    shadowTint: '#000000',
    // Deep night — near-black sky, WebGL stars & moon carry the show.
    bands: ['#0F1428', '#0A0F20', '#070B18', '#050810'],
    bandsOpacity: 0,   // Transparent — the deep-navy body + WebGL (stars, moon,
                       // neon horizon) ARE the night sky. Opaque bands here
                       // would hide the whole WebGL show.
    sunY: 95,        // % (sun long gone)
    glassFraction: 42,
    scene: { dawn: 0, sunset: 0, stars: 1, moon: 1, daylight: 0 },
    shadow: 0,
  },
}

// Keys that hold a single hex color (interpolated pairwise).
// bands is an array of hexes → handled separately. sunY / glassFraction /
// bandsOpacity are numbers → also handled separately below. Missing
// 'bandsOpacity' here previously sent every palette's numeric bandsOpacity
// value through lerpHex() → hexToRgb() → hex.slice(1), throwing
// "hex.slice is not a function" and crashing the whole app's root render
// for the entire 30-minute crossfade window after every phase transition
// (145 minutes/day, ~10% of every day) — with no error boundary, this took
// the whole site down to a blank page for any visitor in that window.
const NON_COLOR_KEYS = new Set([
  'colorScheme',
  'scene',
  'shadow',
  'bands',
  'sunY',
  'glassFraction',
  'bandsOpacity',
])
const COLOR_KEYS = Object.keys(PALETTES.day).filter((k) => !NON_COLOR_KEYS.has(k))

export const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

export function lerpHex(a, b, t) {
  if (t <= 0) return a
  if (t >= 1) return b
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t))
}

const lerpNum = (a, b, t) => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * t

// Blend two full palettes (colors + scene weights + shadow strength + bands
// + numeric knobs). colorScheme snaps at 50%.
export function blendPalettes(from, to, t) {
  if (t >= 1) return to
  const out = { scene: {} }
  for (const k of COLOR_KEYS) out[k] = lerpHex(from[k], to[k], t)
  for (const k of Object.keys(to.scene)) {
    out.scene[k] = lerpNum(from.scene[k], to.scene[k], t)
  }
  out.shadow = lerpNum(from.shadow, to.shadow, t)
  out.sunY = lerpNum(from.sunY, to.sunY, t)
  out.glassFraction = lerpNum(from.glassFraction, to.glassFraction, t)
  out.bandsOpacity = lerpNum(from.bandsOpacity ?? 1, to.bandsOpacity ?? 1, t)
  // Bands: element-wise hex interpolation.
  if (Array.isArray(from.bands) && Array.isArray(to.bands)) {
    out.bands = from.bands.map((c, i) => lerpHex(c, to.bands[i] ?? c, t))
  } else {
    out.bands = to.bands
  }
  out.colorScheme = t < 0.5 ? from.colorScheme : to.colorScheme
  return out
}
