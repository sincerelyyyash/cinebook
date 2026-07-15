'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FilmStrip, Sparkle, Ticket } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/design/cn'
import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { UserMenu } from '@/components/shell/user-menu'
import { ChatDrawer } from '@/components/chat/chat-drawer'

const nav = [
  { href: '/movies', label: 'Movies', icon: FilmStrip },
  { href: '/bookings', label: 'My Bookings', icon: Ticket },
]

/** Top-bar shell for the customer storefront, with a persistent AI chat launcher. */
export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [chatOpen, setChatOpen] = useState(false)
  const onChatPage = pathname === '/chat'

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <header className="h-14 shrink-0 sticky top-0 z-30 flex items-center gap-6 px-4 sm:px-6 border-b border-line bg-page/80 backdrop-blur">
        <Link href="/movies">
          <Logo />
        </Link>

        <nav className="flex items-center gap-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-2 h-8 px-3 rounded-md text-sm transition-colors-fast',
                  active ? 'text-ink bg-selected' : 'text-ink-2 hover:text-ink hover:bg-hover',
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!onChatPage && (
            <button
              onClick={() => setChatOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 h-8 px-3 rounded-md text-sm font-medium transition-colors-fast',
                'bg-accent-bg text-accent border border-line-2 hover:border-accent',
              )}
            >
              <Sparkle size={15} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          )}
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 min-w-0">{children}</main>
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
