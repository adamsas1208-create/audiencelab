// AIBrainLoader's cinematic DNA, extracted for everyday use.
//
// Two pieces, composable:
//
//   <AmbientOrb icon={Clapperboard} />   — the breathing neon halo + icon that
//       crowns the fullscreen loader, sized for hero headers ("compact") or
//       the loader itself ("hero").
//
//   <AmbientGlowField />                 — the dual blur-orb backdrop (mint
//       top-left, periwinkle bottom-right). Positioned `absolute`, so it
//       scopes to whatever `relative` container it's placed in (a hero band),
//       unlike the loader's `fixed` full-viewport version.
//
// Both run on theme tokens, so the glow is bottle-green by day and neon mint
// after dark, courtesy of the atmosphere system.

export function AmbientGlowField({ className = '' }) {
  return (
    <div
      className={['pointer-events-none absolute inset-0 overflow-hidden', className].join(' ')}
      aria-hidden="true"
    >
      <div className="absolute -top-24 left-1/4 size-[26rem] -translate-x-1/2 rounded-full bg-turquoise/10 blur-[120px]" />
      <div className="absolute -bottom-24 right-0 size-[22rem] rounded-full bg-periwinkle/10 blur-[110px]" />
    </div>
  )
}

const SIZES = {
  compact: { wrap: 'size-12', icon: 'size-6' },
  hero: { wrap: 'size-20', icon: 'size-9' },
}

export default function AmbientOrb({ icon: Icon, size = 'compact', className = '' }) {
  const s = SIZES[size] ?? SIZES.compact
  return (
    <div
      className={['relative flex shrink-0 items-center justify-center', s.wrap, className].join(' ')}
    >
      <span className="al-brain-orb absolute inset-0 rounded-full bg-turquoise/10" />
      {Icon && (
        <Icon
          className={['relative text-turquoise', s.icon].join(' ')}
          style={{ filter: 'drop-shadow(0 0 12px color-mix(in oklab, var(--al-tq) 80%, transparent))' }}
        />
      )}
    </div>
  )
}
