'use client'

import { createContext, useContext, useCallback, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  storageKey = 'cinebook-theme',
}: {
  children: React.ReactNode
  storageKey?: string
}) {
  // The anti-FOUC script in <head> has already set the class; read it back.
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark'
    setThemeState(current)
  }, [])

  const setTheme = useCallback(
    (next: Theme) => {
      const root = document.documentElement
      root.classList.remove('dark', 'light')
      root.classList.add(next)
      try {
        localStorage.setItem(storageKey, next)
      } catch {
        /* ignore private-mode storage errors */
      }
      setThemeState(next)
    },
    [storageKey],
  )

  const toggle = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme, setTheme],
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
