import { useEffect, useSyncExternalStore } from 'react'

export type Theme = 'system' | 'light' | 'dark'

// Per-device preference, like the OS setting it mirrors. index.html applies it before the first
// paint (same key) so a dark page never flashes white.
const KEY = 'sg-theme'
const THEME_COLOR = { light: '#fffbeb', dark: '#000000' }

function read(): Theme {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

// One shared value for every useTheme() caller.
let current: Theme = read()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setTheme(next: Theme) {
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    // storage blocked (private mode): the choice still applies until reload
  }
  current = next
  listeners.forEach((l) => l())
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light)
}

/** The saved theme and a setter; keeps <html class="dark"> in sync, also when the OS switches. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, () => current)

  useEffect(() => {
    apply(theme)
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  return [theme, setTheme]
}
