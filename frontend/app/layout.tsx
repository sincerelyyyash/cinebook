import type { Metadata } from 'next'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SWRProvider } from '@/components/providers/swr-provider'
import { ToastProvider } from '@/components/providers/toast-provider'
import './globals.css'

/* ─── Type system — declared once here, swap families in this single place ────
   Three tiers, each a distinct role in the visual hierarchy:
     · display → Fraunces  — editorial serif for headline moments (optical-sized)
     · sans    → Inter     — the interface workhorse (body, controls, labels)
     · mono    → JetBrains — tabular data (money, counts, codes, times)
   The serif↔sans contrast is what makes the hierarchy read instantly. */
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
  variable: '--font-display',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'CineBook',
    template: '%s · CineBook',
  },
  description: 'Book movies through a smart, conversational experience.',
}

const THEME_KEY = 'cinebook-theme'

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: set the theme class before first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(t==='dark'||t==='light')?t:(d?'dark':'light');document.documentElement.classList.add(r);}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider storageKey={THEME_KEY}>
          <SWRProvider>
            <ToastProvider>{children}</ToastProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
