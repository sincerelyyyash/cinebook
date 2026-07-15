/** Date/time formatting helpers. All inputs are ISO strings or Date. */

function toDate(v: string | Date): Date {
  return typeof v === 'string' ? new Date(v) : v
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

/** "14 Jul 2026" */
export function formatDate(v: string | Date): string {
  return dateFmt.format(toDate(v))
}

/** "9:30 PM" */
export function formatTime(v: string | Date): string {
  return timeFmt.format(toDate(v))
}

/** "Tue, 14 Jul · 9:30 PM" */
export function formatDateTime(v: string | Date): string {
  const d = toDate(v)
  return `${dayFmt.format(d)} · ${timeFmt.format(d)}`
}

/** Minutes → "2h 28m" */
export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Seconds remaining → "4:59" (for the seat-hold countdown). */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${rem.toString().padStart(2, '0')}`
}
