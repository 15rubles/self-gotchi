import type { CSSProperties } from 'react'
import { art } from '../art'

// Shared animated effect sprites (generated art, animated with CSS). Coordinates are canvas
// units; callers pass the anchor.

/** Mouth smell beside the mouth: 1 faint wisps, 2 green cloud, 3 dark cloud + flies. */
export function MouthSmell({ x, y, level }: { x: number; y: number; level: number }) {
  const l = Math.max(1, Math.min(3, level))
  if (l === 1) {
    return <image className="sg-smell-wisp" href={art.smell[0]} x={x + 150} y={y - 170} width={150} height={150} />
  }
  const size = l === 3 ? 250 : 210
  return (
    <g>
      <image className="sg-smell-cloud" href={art.smell[l - 1]} x={x + 175} y={y - size / 2 - 10} width={size} height={size} />
      {l >= 3 && <Flies x={x + 290} y={y - 70} count={3} />}
    </g>
  )
}

/** Small flies orbiting a point. */
export function Flies({ x, y, count }: { x: number; y: number; count: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} className="sg-fly" style={{ animationDelay: `${i * -0.7}s`, animationDuration: `${1.8 + i * 0.4}s` }}>
          <image href={art.fly} x={30 + i * 18 - 16} y={-16} width={32} height={32} />
        </g>
      ))}
    </g>
  )
}

/** A grumbling-stomach badge beside the belly, shown in sync with the body shake. */
export function BellyGrowl({ x, y }: { x: number; y: number }) {
  return <image className="sg-growl-lines" href={art.growl} x={x + 150} y={y - 95} width={165} height={165} />
}

/** Sparkle burst for a completion, centered on the character. */
export function Sparkles({ x, y }: { x: number; y: number }) {
  const rays = 8
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: rays }, (_, i) => {
        const angle = (i / rays) * Math.PI * 2
        const style = {
          '--dx': `${Math.cos(angle) * 260}px`,
          '--dy': `${Math.sin(angle) * 260}px`,
          animationDelay: `${(i % 3) * 40}ms`,
        } as CSSProperties
        return <image key={i} className="sg-sparkle" style={style} href={art.sparkle} x={-28} y={-28} width={56} height={56} />
      })}
    </g>
  )
}
