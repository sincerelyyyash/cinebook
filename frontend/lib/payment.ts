/** Simulated-gateway test cards — mirror backend src/services/payment-gateway.ts. */
export const TEST_CARDS = [
  { label: 'Always succeeds', number: '4111 1111 1111 1111', kind: 'success' as const },
  { label: 'Always declined', number: '4000 0000 0000 0002', kind: 'fail' as const },
  { label: 'Insufficient funds', number: '4000 0000 0000 9995', kind: 'fail' as const },
  { label: 'Random failure', number: '4000 0000 0000 0119', kind: 'random' as const },
  { label: 'Gateway error', number: '4000 0000 0000 0000', kind: 'error' as const },
]

export function formatCardNumber(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}
