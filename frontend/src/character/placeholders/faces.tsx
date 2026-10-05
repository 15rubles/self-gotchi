import type { ReactNode } from 'react'
import { ink, outlined, palette as c } from './palette'

// Head-only images drawn in a 440x440 box centered on (0, 0), the head anchor.
// The mouth sits at (0, 95), which the effects layer relies on for the smell anchor.

const line = { fill: 'none', stroke: ink, strokeWidth: 9, strokeLinecap: 'round' as const }

function Head({ children, skin = c.skin }: { children: ReactNode; skin?: string }) {
  return (
    <g>
      <circle cx={0} cy={-15} r={182} fill={c.hair} {...outlined} />
      <circle cx={-162} cy={30} r={30} fill={skin} {...outlined} />
      <circle cx={162} cy={30} r={30} fill={skin} {...outlined} />
      <ellipse cx={0} cy={25} rx={160} ry={150} fill={skin} {...outlined} />
      <path
        d="M -172 -10 Q -165 -175 0 -180 Q 165 -175 172 -10 Q 130 -95 70 -88 Q 30 -130 -15 -92 Q -80 -125 -172 -10 Z"
        fill={c.hair}
        {...outlined}
      />
      <path d="M -60 -150 Q -10 -168 40 -150" fill="none" stroke={c.hairShine} strokeWidth={14} strokeLinecap="round" />
      {children}
    </g>
  )
}

function Blush({ opacity = 0.55 }: { opacity?: number }) {
  return (
    <g fill={c.blush} opacity={opacity}>
      <ellipse cx={-100} cy={78} rx={24} ry={13} />
      <ellipse cx={100} cy={78} rx={24} ry={13} />
    </g>
  )
}

function DotEyes({ rx = 14, ry = 20 }: { rx?: number; ry?: number }) {
  return (
    <g>
      {[-60, 60].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={30} rx={rx} ry={ry} fill={ink} />
          <circle cx={x + 5} cy={22} r={5} fill={c.white} />
        </g>
      ))}
    </g>
  )
}

function SweatDrop({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M 0 -26 Q 18 0 14 12 Q 8 26 0 26 Q -8 26 -14 12 Q -18 0 0 -26 Z"
      fill={c.sweat}
      stroke={ink}
      strokeWidth={5}
    />
  )
}

export function Neutral() {
  return (
    <Head>
      <DotEyes />
      <Blush />
      <path d="M -24 92 Q 0 110 24 92" {...line} />
    </Head>
  )
}

export function Happy() {
  return (
    <Head>
      <path d="M -84 40 Q -60 6 -36 40" {...line} strokeWidth={10} />
      <path d="M 36 40 Q 60 6 84 40" {...line} strokeWidth={10} />
      <Blush opacity={0.8} />
      <path d="M -42 80 Q 0 140 42 80 Z" fill="#c0504d" stroke={ink} strokeWidth={8} strokeLinejoin="round" />
      <path d="M -18 112 Q 0 100 18 112 Q 0 124 -18 112 Z" fill="#ff8a8a" />
    </Head>
  )
}

export function Worried() {
  return (
    <Head>
      <DotEyes ry={18} />
      <path d="M -92 -2 L -36 -22" {...line} />
      <path d="M 36 -22 L 92 -2" {...line} />
      <Blush opacity={0.3} />
      <path d="M -30 102 Q -15 90 0 102 Q 15 114 30 102" {...line} />
      <SweatDrop x={128} y={-30} />
    </Head>
  )
}

export function VeryWorried() {
  return (
    <Head>
      <path d="M -120 -60 L -120 -20 M -95 -70 L -95 -25 M -70 -75 L -70 -30" stroke="#6b8cff" strokeWidth={8} opacity={0.5} />
      {[-60, 60].map((x) => (
        <g key={x}>
          <circle cx={x} cy={32} r={28} fill={c.white} stroke={ink} strokeWidth={7} />
          <circle cx={x} cy={36} r={12} fill={ink} />
        </g>
      ))}
      <path d="M -96 -8 L -32 -36" {...line} />
      <path d="M 32 -36 L 96 -8" {...line} />
      <path d="M -36 110 Q -18 78 0 96 Q 18 78 36 110 Q 0 126 -36 110 Z" fill="#7a2f2f" stroke={ink} strokeWidth={7} strokeLinejoin="round" />
      <SweatDrop x={132} y={-36} />
      <SweatDrop x={-140} y={-10} size={0.8} />
    </Head>
  )
}

export function Tired() {
  return (
    <Head>
      {[-60, 60].map((x) => (
        <g key={x}>
          <path d={`M ${x - 24} 30 Q ${x} 50 ${x + 24} 30 Z`} fill={ink} />
          <path d={`M ${x - 26} 28 L ${x + 26} 28`} {...line} />
          <path d={`M ${x - 22} 58 Q ${x} 68 ${x + 22} 58`} fill="none" stroke="#a58bb8" strokeWidth={6} strokeLinecap="round" />
        </g>
      ))}
      <path d="M -22 100 L 22 100" {...line} />
    </Head>
  )
}

export function Exhausted() {
  return (
    <Head skin={c.skinShade}>
      {[-60, 60].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={48} rx={34} ry={22} fill="#b39bc7" opacity={0.6} />
          <path d={`M ${x - 24} 32 Q ${x} 44 ${x + 24} 32`} {...line} />
        </g>
      ))}
      <ellipse cx={0} cy={104} rx={20} ry={24} fill="#7a2f2f" stroke={ink} strokeWidth={7} />
      <path d="M 18 120 Q 24 150 16 160" fill="none" stroke={c.sweat} strokeWidth={8} strokeLinecap="round" />
    </Head>
  )
}
