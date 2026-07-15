'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Buildings, CalendarDots, ChartBar, FilmStrip, MonitorPlay, Scroll, SealPercent, SignOut, SquaresFour, Users } from '@phosphor-icons/react/ssr'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/design/cn'
import { Logo } from '@/components/brand/logo'
import { Avatar } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { RoleBadge } from '@/components/ui/badge'
import { logout } from '@/lib/auth/logout'
import { useUser } from '@/lib/auth/session'

interface NavItem {
  href: string
  label: string
  icon: PhosphorIcon
}

/**
 * Nav definitions live here (a client module) so the Phosphor icon *components*
 * never cross the server→client boundary — server layouts select a section by
 * its string key instead of passing function-valued props.
 */
const NAVS: Record<'admin' | 'manager', { title: string; items: NavItem[] }> = {
  admin: {
    title: 'Admin',
    items: [
      { href: '/overview', label: 'Overview', icon: SquaresFour },
      { href: '/users', label: 'Users', icon: Users },
      { href: '/catalog', label: 'Movies', icon: FilmStrip },
      { href: '/theatres', label: 'Theatres', icon: Buildings },
      { href: '/screens', label: 'Screens', icon: MonitorPlay },
      { href: '/scheduling', label: 'Shows', icon: CalendarDots },
      { href: '/promos', label: 'Promos', icon: SealPercent },
      { href: '/reports', label: 'Reports', icon: ChartBar },
      { href: '/activity', label: 'Activity Log', icon: Scroll },
    ],
  },
  manager: {
    title: 'Hall Manager',
    items: [{ href: '/schedule', label: 'Schedule', icon: CalendarDots }],
  },
}

export type ShellSection = keyof typeof NAVS

/**
 * Sidebar shell for operator roles (Hall Manager, Admin). Role-group layouts
 * pass a `section` string; the shell owns the nav so icons stay client-side.
 */
export function DashboardShell({
  section,
  children,
}: {
  section: ShellSection
  children: React.ReactNode
}) {
  const { title, items: nav } = NAVS[section]
  const pathname = usePathname()
  const user = useUser()

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="w-60 shrink-0 flex flex-col border-r border-line bg-canvas">
        <div className="h-14 flex items-center px-4 border-b border-line">
          <Logo />
        </div>

        <div className="px-4 pt-4 pb-2">
          <span className="text-label">{title}</span>
        </div>

        <nav className="flex-1 px-2.5 flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm transition-colors-fast',
                  active ? 'text-ink bg-selected' : 'text-ink-2 hover:text-ink hover:bg-hover',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
                  />
                )}
                <Icon size={16} className="shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-line flex items-center gap-2.5">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <Avatar name={user.name ?? user.phone} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink truncate">{user.name ?? user.phone}</p>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <ThemeToggle />
          <button
            onClick={async () => {
              await logout()
            }}
            aria-label="Log out"
            title="Log out"
            className="interactive h-8 w-8 rounded-md flex items-center justify-center text-ink-2 hover:text-danger-ink border border-line-2"
          >
            <SignOut size={15} />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  )
}

/** Sticky page header used inside dashboard pages. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-6 border-b border-line bg-page/80 backdrop-blur sticky top-0 z-20">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-semibold text-ink truncate">{title}</h1>
        {description && <p className="text-xs text-ink-3 truncate mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
