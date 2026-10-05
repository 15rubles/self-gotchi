import { useEffect, useState } from 'react'

/**
 * Full-frame image that cross-fades when `src` changes, so switching between generated
 * frames (e.g. neutral -> tired) looks like the person changing, not a cut.
 */
export function CrossfadeImage({ src, durationMs = 700 }: { src: string; durationMs?: number }) {
  const [shown, setShown] = useState(src)
  const [previous, setPrevious] = useState<string | null>(null)

  if (src !== shown) {
    // Adjust state during render (React's recommended pattern for derived state).
    setPrevious(shown)
    setShown(src)
  }

  useEffect(() => {
    if (!previous) return
    const timer = window.setTimeout(() => setPrevious(null), durationMs)
    return () => window.clearTimeout(timer)
  }, [previous, durationMs])

  const img = 'absolute inset-0 h-full w-full select-none object-cover'
  return (
    <>
      {previous && <img src={previous} alt="" draggable={false} className={img} />}
      <img
        key={shown}
        src={shown}
        alt=""
        draggable={false}
        className={`${img} ${previous ? 'sg-crossfade' : ''}`}
        style={{ animationDuration: `${durationMs}ms` }}
      />
    </>
  )
}
