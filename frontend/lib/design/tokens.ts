/**
 * Design tokens as JS constants — mirrors the @theme block in app/globals.css.
 * Use ONLY where CSS variables can't reach: Recharts series colors, the canvas
 * seat-map renderer, Framer Motion color animations. For styling, use the
 * Tailwind utilities generated from globals.css — do not duplicate here.
 *
 * These are the DARK-theme values. For theme-reactive JS (rare), read the CSS
 * variable off the document instead: getComputedStyle(document.documentElement).
 */

export const color = {
  canvas:   '#0a0a0b',
  page:     '#0d0d0f',
  surface:  '#141416',
  raised:   '#1b1b1e',
  overlay:  '#232326',
  field:    '#161618',
  hover:    '#1d1d20',
  selected: '#242427',

  ink:    '#eaeaec',
  ink2:   '#9a9aa0',
  ink3:   '#646469',
  inkDim: '#3b3b40',

  line:       '#1a1a1d',
  line2:      '#262629',
  lineStrong: '#343438',

  accent:    '#cfd0d4',
  accent2:   '#e4e5e8',
  accentInk: '#0b0b0d',
  accentBg:  '#1c1c20',

  positiveBg:  '#121914',
  positiveInk: '#5f9d72',
  warningBg:   '#1c1810',
  warningInk:  '#b6925f',
  dangerBg:    '#201113',
  dangerInk:   '#c8676b',
  infoBg:      '#0f1418',
  infoInk:     '#6a8faf',
} as const

/** Seat-map category colors — keep in sync with the --color-seat-* tokens. */
export const seatColor = {
  front:    '#6f8fb0',
  standard: '#8c8f96',
  premium:  '#9b88b3',
  recliner: '#b8926a',
  held:     '#b6925f',
  booked:   '#343438',
  selected: '#cfd0d4',
} as const

/** Chart palette (categorical) — silver accent + muted seat ramp for cohesion. */
export const chartSeries = [
  '#cfd0d4',
  '#6f8fb0',
  '#9b88b3',
  '#5f9d72',
  '#c8676b',
  '#8c8f96',
] as const

export const shadow = {
  xs:  '0 1px 2px rgba(0,0,0,0.4)',
  sm:  '0 1px 2px rgba(0,0,0,0.45), 0 2px 6px -1px rgba(0,0,0,0.5)',
  md:  '0 1px 2px rgba(0,0,0,0.45), 0 4px 12px -4px rgba(0,0,0,0.65)',
  lg:  '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px -8px rgba(0,0,0,0.75)',
} as const

export const radius = {
  xs: '2px', sm: '4px', md: '6px', lg: '10px', xl: '14px', '2xl': '20px', full: '9999px',
} as const

export type ColorToken = keyof typeof color
