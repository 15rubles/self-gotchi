import { useEffect, useRef, useState } from 'react'

export interface Presence<T> {
  item: T
  leaving: boolean
}

/**
 * Keeps items that disappeared from `items` around for `durationMs` with `leaving: true`,
 * so they can play a fade-out instead of vanishing (e.g. the smell after brushing).
 */
export function useFadeOut<T>(items: T[], keyOf: (item: T) => string, durationMs = 700): Presence<T>[] {
  const [leaving, setLeaving] = useState<Map<string, T>>(new Map())
  const previous = useRef<T[]>(items)

  useEffect(() => {
    const current = new Set(items.map(keyOf))
    const gone = previous.current.filter((item) => !current.has(keyOf(item)))
    previous.current = items
    if (gone.length === 0) return
    setLeaving((map) => {
      const next = new Map(map)
      gone.forEach((item) => next.set(keyOf(item), item))
      return next
    })
    // Not cleared on re-run: each batch of removals gets its own timer.
    window.setTimeout(() => {
      setLeaving((map) => {
        const next = new Map(map)
        gone.forEach((item) => next.delete(keyOf(item)))
        return next
      })
    }, durationMs)
  }, [items, keyOf, durationMs])

  const present = new Set(items.map(keyOf))
  return [
    ...items.map((item) => ({ item, leaving: false })),
    ...[...leaving.entries()].filter(([key]) => !present.has(key)).map(([, item]) => ({ item, leaving: true })),
  ]
}
