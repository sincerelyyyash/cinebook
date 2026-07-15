'use client'

import { SWRConfig } from 'swr'
import { apiFetch } from '@/lib/api/client'

/**
 * Global SWR config. The default fetcher routes through the typed apiFetch
 * wrapper (auth + typed-error handling), so most hooks can just pass a path key.
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (path: string) => apiFetch(path),
        revalidateOnFocus: true,
        shouldRetryOnError: false,
        dedupingInterval: 2000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
