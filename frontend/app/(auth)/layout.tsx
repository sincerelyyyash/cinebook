import { Logo } from '@/components/brand/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <Logo />
        <div className="w-full surface rounded-2xl border border-line-2 p-6">{children}</div>
        <p className="text-xs text-ink-3 text-center">
          Book movies through a smart, conversational experience.
        </p>
      </div>
    </div>
  )
}
