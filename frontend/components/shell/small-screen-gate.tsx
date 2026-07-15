import { Monitor, DeviceMobile } from '@phosphor-icons/react/ssr'
import { Logo } from '@/components/brand/logo'

/**
 * Small-screen gate. The dashboard is built for large displays — dense schedules
 * and tables, the interactive seat-layout builder, and multi-column analytics all
 * need room to breathe. Below the `lg` breakpoint (1024px) we cover the app with a
 * friendly "open on a bigger screen" screen instead of shipping a broken layout.
 *
 * Pure CSS (`lg:hidden`) → SSR-safe, no hydration flash, no JS. It renders as a
 * fixed cover over the app; at ≥1024px it is `display:none`, so desktop viewports
 * never see it and pay no layout cost. Sits above modals/toasts via a high z-index.
 */
export function SmallScreenGate() {
  return (
    <div className="lg:hidden fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-9 bg-canvas px-6 text-center">
      <Logo />

      <div className="flex max-w-sm flex-col items-center gap-6">
        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-line-2 bg-surface text-ink elevated-sm">
          <Monitor size={28} />
          <span className="absolute -bottom-2 -right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-line-2 bg-raised text-ink-3">
            <DeviceMobile size={14} />
          </span>
        </span>

        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-2xl font-semibold text-ink">Best on a bigger screen</h1>
          <p className="text-sm leading-relaxed text-ink-2">
            CineBook is built for wide displays. The schedules, seat-layout builder,
            and analytics need room to breathe. Open it on a desktop, or a tablet in
            landscape, at 1024px or wider for the full experience.
          </p>
        </div>

        <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-dim">
          <span className="h-1 w-1 rounded-full bg-ink-dim" />
          Minimum width 1024px
          <span className="h-1 w-1 rounded-full bg-ink-dim" />
        </div>
      </div>
    </div>
  )
}
