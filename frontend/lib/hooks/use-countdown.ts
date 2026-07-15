'use client'

import { useEffect, useState } from 'react'

/**
 * Countdown to an absolute expiry time — drives the 5-minute seat-hold timer.
 * Returns seconds remaining and an `expired` flag; calls onExpire once at zero.
 */
export function useCountdown(expiresAt: string | Date | null, onExpire?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => remaining(expiresAt))

  useEffect(() => {
    if (!expiresAt) return
    setSecondsLeft(remaining(expiresAt))

    const id = setInterval(() => {
      const left = remaining(expiresAt)
      setSecondsLeft(left)
      if (left <= 0) {
        clearInterval(id)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt])

  return { secondsLeft, expired: secondsLeft <= 0 }
}

function remaining(expiresAt: string | Date | null): number {
  if (!expiresAt) return 0
  const end = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime()
  return Math.max(0, Math.round((end - Date.now()) / 1000))
}
