import { getAllScreens, listShows, listMovies } from '@/lib/api/catalog'
import { ScheduleConsole } from '@/components/manager/schedule-console'
import type { ShowSummary } from '@/lib/api/dto'

export const metadata = { title: 'Shows' }

/** Admin override scheduling — same rule-validated console, across every screen. */
export default async function AdminSchedulingPage() {
  const screens = await getAllScreens().catch(() => [])
  const from = new Date().toISOString()
  const to = new Date(Date.now() + 31 * 864e5).toISOString()

  const [showLists, moviesPage] = await Promise.all([
    Promise.all(
      screens.map((s) =>
        listShows({ screenId: s.id, pageSize: 100 })
          .then((r) => r.data)
          .catch(() => [] as ShowSummary[]),
      ),
    ),
    listMovies({ pageSize: 100, sort: 'title', order: 'asc' }),
  ])

  const initialShows: Record<string, ShowSummary[]> = {}
  screens.forEach((s, i) => {
    initialShows[s.id] = (showLists[i] ?? []).filter((sh) => sh.startsAt >= from && sh.startsAt <= to)
  })

  return <ScheduleConsole screens={screens} initialShows={initialShows} movies={moviesPage.data} />
}
