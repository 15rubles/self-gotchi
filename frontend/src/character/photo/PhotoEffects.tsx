import { useId, type CSSProperties } from 'react'

// Layer 4 for a photo avatar, in canvas units: soft haze instead of cartoon clouds,
// emoji flies (rendered by the OS emoji font, which looks far closer to a photo than line art).

const emojiShadow = { filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.45))' }

/** Mouth smell: 1 faint green haze, 2 thick haze, 3 haze + flies. */
export function PhotoMouthSmell({ x, y, level }: { x: number; y: number; level: number }) {
  const id = useId().replace(/:/g, '')
  const puffs = [
    { dx: 150, dy: 10, r: 50 },
    { dx: 215, dy: -40, r: 65 },
    { dx: 270, dy: 15, r: 55 },
    { dx: -170, dy: -10, r: 50 },
  ].slice(0, level >= 2 ? 4 : 2)
  return (
    <g>
      <defs>
        <filter id={`${id}-haze`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={level >= 2 ? 22 : 16} />
        </filter>
      </defs>
      {puffs.map((p, i) => (
        <circle
          key={i}
          className="sg-haze"
          style={{ animationDelay: `${i * -0.8}s` } as CSSProperties}
          cx={x + p.dx}
          cy={y + p.dy}
          r={p.r * (level >= 2 ? 1.2 : 0.9)}
          fill={level >= 3 ? '#7f9f2f' : '#a6c94a'}
          opacity={level >= 3 ? 0.7 : level === 2 ? 0.55 : 0.35}
          filter={`url(#${id}-haze)`}
        />
      ))}
      {level >= 3 && <EmojiFlies x={x + 140} y={y - 40} count={3} />}
    </g>
  )
}

export function EmojiFlies({ x, y, count }: { x: number; y: number; count: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} className="sg-fly" style={{ animationDelay: `${i * -0.7}s`, animationDuration: `${1.8 + i * 0.4}s` }}>
          <text x={40 + i * 45} y={i * 18} fontSize={46} textAnchor="middle" dominantBaseline="central" style={emojiShadow}>
            🪰
          </text>
        </g>
      ))}
    </g>
  )
}

/** Hunger: a growl caption by the stomach, shown in sync with the shake. */
export function PhotoBellyGrowl({ x, y }: { x: number; y: number }) {
  return (
    <g className="sg-growl-lines">
      <text
        x={x + 150}
        y={y}
        fontSize={64}
        fontWeight={800}
        fontStyle="italic"
        fill="#ff8a3d"
        stroke="#3b2a20"
        strokeWidth={6}
        paintOrder="stroke"
        textAnchor="middle"
      >
        grrr…
      </text>
    </g>
  )
}

/** Room grime over the photo: the photo is the scene, mess builds up along the bottom and edges. */
export function PhotoRoom({ level }: { level: number }) {
  const id = useId().replace(/:/g, '')
  if (level <= 0) return null
  const item = (emoji: string, x: number, y: number, size: number, rotate = 0) => (
    <text
      key={`${emoji}-${x}`}
      x={x}
      y={y}
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="central"
      transform={`rotate(${rotate} ${x} ${y})`}
      style={emojiShadow}
    >
      {emoji}
    </text>
  )
  return (
    <svg viewBox="0 0 1024 1024" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}-vignette`} cx="50%" cy="45%" r="75%">
          <stop offset="0.55" stopColor="#3a2a12" stopOpacity="0" />
          <stop offset="1" stopColor="#2b1d0a" stopOpacity={level >= 3 ? 0.75 : 0.45} />
        </radialGradient>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={14} />
        </filter>
      </defs>
      {level >= 2 && (
        <g>
          <rect width={1024} height={1024} fill="#8a6a2a" opacity={level >= 3 ? 0.2 : 0.1} style={{ mixBlendMode: 'multiply' }} />
          <rect width={1024} height={1024} fill={`url(#${id}-vignette)`} />
          <g filter={`url(#${id}-blur)`} opacity={level >= 3 ? 0.35 : 0.2}>
            <ellipse cx={140} cy={180} rx={90} ry={60} fill="#5b4320" />
            <ellipse cx={900} cy={620} rx={70} ry={110} fill="#5b4320" />
            {level >= 3 && <ellipse cx={820} cy={140} rx={110} ry={70} fill="#4a3518" />}
          </g>
        </g>
      )}
      {item('🧦', 110, 960, 110, -25)}
      {item('📄', 930, 975, 80, 15)}
      {level >= 2 && item('📦', 250, 965, 120, -8)}
      {level >= 2 && item('🥤', 800, 950, 100, 10)}
      {level >= 2 && item('🍕', 380, 990, 80, 30)}
      {level >= 3 && item('🗑️', 70, 820, 150, -6)}
      {level >= 3 && item('🍌', 640, 985, 80, -30)}
      {level >= 3 && <EmojiFlies x={120} y={700} count={2} />}
    </svg>
  )
}

const iconEmoji = { LUNCHBOX: '🍱', BOOK: '📚', GENERIC: '📝' } as const

/** Thought icon for a photo avatar (drawn in a 100x100 box centered on 0,0). */
export function EmojiIcon({ type }: { type: keyof typeof iconEmoji }) {
  return (
    <text fontSize={72} textAnchor="middle" dominantBaseline="central" style={emojiShadow}>
      {iconEmoji[type]}
    </text>
  )
}
