import { useEffect, useState } from 'react'

/**
 * True for ~150 ms every 3-6 s (random, so it feels alive). Never blinks while disabled or when
 * the user prefers reduced motion.
 */
export function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setClosed(true)
          timer = window.setTimeout(() => {
            setClosed(false)
            schedule()
          }, 150)
        },
        3000 + Math.random() * 3000,
      )
    }
    schedule()
    return () => {
      window.clearTimeout(timer)
      setClosed(false)
    }
  }, [enabled])

  return enabled && closed
}
