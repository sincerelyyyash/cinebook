/**
 * Money is stored and transported as integer paise (see backend PLAN §4).
 * Format at the UI edge only; never do arithmetic on the formatted string.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** paise → "₹1,234" (or "₹1,234.50" when there are non-zero paise). */
export function formatMoney(paise: number): string {
  const rupees = paise / 100
  return Number.isInteger(rupees) ? inr.format(rupees) : inrWithPaise.format(rupees)
}

/** paise → plain number of rupees (for chart values). */
export function toRupees(paise: number): number {
  return paise / 100
}
