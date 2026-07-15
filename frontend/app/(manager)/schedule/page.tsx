import { getSessionUser } from '@/lib/auth/server'
import { getManagedScreens, getAllScreens, listShows, listMovies } from '@/lib/api/catalog'
import { ScheduleConsole } from '@/components/manager/schedule-console'
import type { ShowSummary } from '@/lib/api/dto'

export const metadata = { title: 'Schedule' }

/**
 * Hall Manager schedule. Resolves the manager's assigned screens (admins see
 * every screen), loads each screen's upcoming shows, and hands off to the
 * client console for create/edit/delete against the rule-validated API.
 */
export default async function SchedulePage() {
  const user = await getSessionUser()

  // Managers see their own screens; admins (override powers) see all.
  const screens = !user
    ? []
    : user.role === 'ADMIN'
      ? await getAllScreens().catch(() => [])
      : await getManagedScreens(user.id).catch(() => [])

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

  return (
    <ScheduleConsole screens={screens} initialShows={initialShows} movies={moviesPage.data} />
  )
}
