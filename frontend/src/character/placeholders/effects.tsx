import type { CSSProperties } from 'react'
import { ink, palette as c } from './palette'

// Shared animated effect sprites. Coordinates are canvas units; callers pass the anchor.

/** Mouth smell: 1 faint wisps, 2 green cloud, 3 cloud + flies. */
export function MouthSmell({ x, y, level }: { x: number; y: number; level: number }) {
  const wisp = (dx: number, delay: number, opacity: number) => (
    <path
      key={`${dx}-${delay}`}
      className="sg-smell-wisp"
      style={{ animationDelay: `${delay}s` } as CSSProperties}
      d={`M ${x + dx} ${y} q 18 -20 0 -40 q -18 -20 0 -40 q 18 -20 0 -40`}
      fill="none"
      stroke={c.smell}
      strokeWidth={10}
      strokeLinecap="round"
      opacity={opacity}
    />
  )
  return (
    <g>
      {wisp(150, 0, 0.6)}
      {wisp(195, 1.1, 0.6)}
      {level >= 2 && (
        <g className="sg-smell-cloud" opacity={level >= 3 ? 0.85 : 0.7}>
          {[
            [x + 190, y + 10, 34],
            [x + 235, y - 12, 42],
            [x + 280, y + 12, 34],
            [x + 232, y + 36, 32],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={level >= 3 ? c.smellDark : c.smell} stroke={ink} strokeWidth={5} />
          ))}
        </g>
      )}
      {level >= 2 && wisp(-170, 0.6, 0.7)}
      {level >= 3 && <Flies x={x + 235} y={y - 30} count={3} />}
    </g>
  )
}

/** Small flies orbiting a point. */
export function Flies({ x, y, count }: { x: number; y: number; count: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} className="sg-fly" style={{ animationDelay: `${i * -0.7}s`, animationDuration: `${1.8 + i * 0.4}s` }}>
          <g transform={`translate(${30 + i * 18} 0)`}>
            <ellipse cx={-6} cy={-8} rx={9} ry={6} fill="#ffffff" opacity={0.85} stroke={ink} strokeWidth={2} />
            <ellipse cx={6} cy={-8} rx={9} ry={6} fill="#ffffff" opacity={0.85} stroke={ink} strokeWidth={2} />
            <circle cx={0} cy={0} r={8} fill="#222" />
          </g>
        </g>
      ))}
    </g>
  )
}

/** Growl lines either side of the belly, shown in sync with the body shake. */
export function BellyGrowl({ x, y }: { x: number; y: number }) {
  const zigzag = (side: -1 | 1) => (
    <path
      d={`M ${x + side * 55} ${y - 35} l ${side * 30} 18 l ${-side * 20} 18 l ${side * 30} 18 l ${-side * 20} 18`}
      fill="none"
      stroke="#e8743b"
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
  return (
    <g className="sg-growl-lines">
      {zigzag(-1)}
      {zigzag(1)}
    </g>
  )
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
        return (
          <path
            key={i}
            className="sg-sparkle"
            style={style}
            d="M 0 -26 L 7 -7 L 26 0 L 7 7 L 0 26 L -7 7 L -26 0 L -7 -7 Z"
            fill={i % 2 ? '#ffd54f' : '#ff9ec7'}
            stroke={ink}
            strokeWidth={3}
          />
        )
      })}
    </g>
  )
}
