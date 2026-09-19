import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
const THEME_KEY = 'water-sort:theme:v1'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const cycleTheme = () => setTheme((current) => current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system')
  return { theme, cycleTheme }
}
