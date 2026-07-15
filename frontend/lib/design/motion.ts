import type { Variants, Transition } from 'framer-motion'

/** Shared Framer Motion easings/durations — mirror the CSS motion tokens. */
export const ease = [0.22, 0.61, 0.36, 1] as const
export const easeSpring: Transition = { type: 'spring', stiffness: 500, damping: 28 }

export const duration = {
  fast: 0.13,
  base: 0.18,
  slow: 0.28,
} as const

/** Container that staggers its children in on mount. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
}

/** Child item — fade + rise. Pair with staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease } },
}

/** Fade + rise entry, standalone. */
export const enter: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease } },
}

/** Scale-in for popovers / dropdowns. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: duration.fast, ease } },
  exit: { opacity: 0, scale: 0.96, y: -2, transition: { duration: duration.fast, ease } },
}

/** Slide-in from the right for drawers. */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: duration.slow, ease } },
  exit: { opacity: 0, x: 24, transition: { duration: duration.base, ease } },
}
