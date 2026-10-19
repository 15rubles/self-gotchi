import { art } from '../art'

/** Shared room background on the 1024x1024 canvas, 4 cleanliness levels (0 clean .. 3 filthy). */
export function Room({ level }: { level: number }) {
  const l = Math.max(0, Math.min(3, level))
  return (
    <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full" aria-hidden>
      <image href={art.rooms[l]} x={0} y={0} width={1024} height={1024} preserveAspectRatio="xMidYMid slice" />
    </svg>
  )
}
