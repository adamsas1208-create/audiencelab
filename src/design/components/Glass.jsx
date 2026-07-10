// The Glass surface — the workhorse of Living Editorial v2.
//
// Every card in the app used to be a near-opaque `bg-zinc-950/60` slab that
// completely hid the living sky behind it. Glass replaces that idiom with a
// genuinely translucent, backdrop-blurred surface: the SkyCanvas's stars,
// sunset wash and moon glow READ THROUGH the card while text stays legible,
// because the tint is built from the atmosphere's own `--al-z950` deep-surface
// token (near-white paper by day, deep navy at night).
//
// The actual surface values live in index.css (.al-glass / -thin / -thick) so
// this component and the mechanically-migrated `al-glass` class users share a
// single source of truth.
//
// Usage:
//   <Glass className="rounded-2xl p-5">…</Glass>
//   <Glass as="button" intensity="thin" glow="tq" onClick={…}>…</Glass>

const INTENSITY_CLASS = {
  thin: 'al-glass-thin',
  regular: 'al-glass',
  thick: 'al-glass-thick',
}

const GLOW = {
  tq: '0 0 40px -18px var(--al-tq)',
  peri: '0 0 40px -18px var(--al-peri)',
}

export default function Glass({
  as: Tag = 'div',
  intensity = 'regular',
  glow,
  border = true,
  className = '',
  style,
  children,
  ...rest
}) {
  return (
    <Tag
      className={[
        INTENSITY_CLASS[intensity] ?? INTENSITY_CLASS.regular,
        border ? 'border border-white/10' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        glow && GLOW[glow] ? { boxShadow: GLOW[glow], ...style } : style
      }
      {...rest}
    >
      {children}
    </Tag>
  )
}
