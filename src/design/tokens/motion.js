// Central spring vocabulary for the "Living Editorial" motion discipline.
// Every animated surface in the app picks one of these four — no ad-hoc
// durations/easings, so all motion feels like it comes from the same material.

export const springs = {
  // Instant UI feedback: toggles, small buttons, focus indicators.
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  // Content entering: cards, rows, panels revealing after an analysis.
  soft: { type: 'spring', stiffness: 200, damping: 25 },
  // Large surfaces and hero blocks: slow, weighty, expensive-feeling.
  gentle: { type: 'spring', stiffness: 120, damping: 22 },
  // Playful press-downs and emphasis pops — slight bounce past the target.
  overshoot: { type: 'spring', stiffness: 500, damping: 18 },
}

// Staggered child reveal used by keyframe grids / blueprint cards / rows.
export const rise = {
  hidden: { opacity: 0, y: 16 },
  shown: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...springs.soft, delay: i * 0.07 },
  }),
}
