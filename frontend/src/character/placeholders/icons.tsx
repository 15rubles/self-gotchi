import { ink, outlined } from './palette'

// Thought icons drawn in a 100x100 box centered on (0, 0).

export function Lunchbox() {
  return (
    <g>
      <path d="M -22 -26 Q -22 -40 0 -40 Q 22 -40 22 -26" fill="none" stroke={ink} strokeWidth={7} />
      <rect x={-40} y={-26} width={80} height={60} rx={10} fill="#ff8a65" {...outlined} strokeWidth={7} />
      <path d="M -40 -6 L 40 -6" stroke={ink} strokeWidth={6} />
      <rect x={-8} y={-12} width={16} height={12} rx={3} fill="#ffe082" stroke={ink} strokeWidth={4} />
    </g>
  )
}

export function Book() {
  return (
    <g>
      <path d="M -40 -30 Q -20 -40 0 -30 L 0 34 Q -20 24 -40 34 Z" fill="#81c784" {...outlined} strokeWidth={7} />
      <path d="M 40 -30 Q 20 -40 0 -30 L 0 34 Q 20 24 40 34 Z" fill="#66bb6a" {...outlined} strokeWidth={7} />
      <path d="M -30 -12 L -10 -16 M -30 4 L -10 0 M 10 -16 L 30 -12 M 10 0 L 30 4" stroke={ink} strokeWidth={4} strokeLinecap="round" />
    </g>
  )
}

export function Generic() {
  return (
    <g>
      <rect x={-32} y={-38} width={64} height={76} rx={8} fill="#fff59d" {...outlined} strokeWidth={7} />
      <path d="M 0 -22 L 0 8" stroke={ink} strokeWidth={10} strokeLinecap="round" />
      <circle cx={0} cy={24} r={6} fill={ink} />
    </g>
  )
}
