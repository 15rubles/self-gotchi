import type { ReactNode } from 'react'
import { ink, outlined, palette as c } from './palette'

// Head-only images drawn in a 440x440 box centered on (0, 0), the head anchor.
// The mouth sits around (0, 95), which the effects layer relies on for the smell anchor.
// Expressions are deliberately over the top so the mood reads at a glance on a phone.

const line = { fill: 'none', stroke: ink, strokeWidth: 10, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Head({ children, skin = c.skin, className }: { children: ReactNode; skin?: string; className?: string }) {
  return (
    <g className={className}>
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

function Blush({ opacity = 0.55, size = 1 }: { opacity?: number; size?: number }) {
  return (
    <g fill={c.blush} opacity={opacity}>
      <ellipse cx={-102} cy={80} rx={24 * size} ry={13 * size} />
      <ellipse cx={102} cy={80} rx={24 * size} ry={13 * size} />
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

function SweatDrop({ x, y, size = 1, className }: { x: number; y: number; size?: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <g className={className}>
        <path d="M 0 -26 Q 18 0 14 12 Q 8 26 0 26 Q -8 26 -14 12 Q -18 0 0 -26 Z" fill={c.sweat} stroke={ink} strokeWidth={5} />
        <ellipse cx={-5} cy={6} rx={4} ry={7} fill={c.white} opacity={0.8} />
      </g>
    </g>
  )
}

function Sparkle({ x, y, size = 1, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path
        className="sg-twinkle"
        style={{ animationDelay: `${delay}s` }}
        d="M 0 -28 L 7 -7 L 28 0 L 7 7 L 0 28 L -7 7 L -28 0 L -7 -7 Z"
        fill="#ffd54f"
        stroke={ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </g>
  )
}

/** Floating "z"s for tired/exhausted, rising and fading in a loop. */
function Sleepy({ big = false }: { big?: boolean }) {
  const letters = big ? ['z', 'Z', 'Z'] : ['z', 'Z']
  return (
    <g>
      {letters.map((letter, i) => (
        <text
          key={i}
          className="sg-zz"
          style={{ animationDelay: `${i * 0.9}s` }}
          x={150 + i * 28}
          y={-120 - i * 40}
          fontSize={(big ? 46 : 38) + i * 12}
          fontWeight={900}
          fill="#7e8cd8"
          stroke={ink}
          strokeWidth={5}
          paintOrder="stroke"
        >
          {letter}
        </text>
      ))}
    </g>
  )
}

/** Panic lines on the forehead. */
function Gloom({ opacity = 0.6 }: { opacity?: number }) {
  return (
    <g stroke="#6b8cff" strokeWidth={9} strokeLinecap="round" opacity={opacity}>
      <path d="M -110 -75 L -110 -25" />
      <path d="M -80 -85 L -80 -30" />
      <path d="M -50 -90 L -50 -35" />
      <path d="M -20 -92 L -20 -38" />
    </g>
  )
}

export function Neutral() {
  return (
    <Head>
      <DotEyes />
      <Blush />
      <path d="M -24 92 Q 0 110 24 92" {...line} strokeWidth={9} />
    </Head>
  )
}

export function Happy() {
  return (
    <Head>
      {/* squeezed-shut happy eyes */}
      <path d="M -95 42 Q -62 -10 -28 42" {...line} strokeWidth={13} />
      <path d="M 28 42 Q 62 -10 95 42" {...line} strokeWidth={13} />
      <Blush opacity={0.9} size={1.5} />
      {/* huge open grin with teeth and tongue */}
      <path d="M -75 68 Q 0 190 75 68 Z" fill="#b8403d" stroke={ink} strokeWidth={9} strokeLinejoin="round" />
      <path d="M -68 72 L 68 72 L 60 92 L -60 92 Z" fill={c.white} />
      <path d="M -32 140 Q 0 112 32 140 Q 0 160 -32 140 Z" fill="#ff8a8a" />
      <Sparkle x={-185} y={-120} size={1.1} />
      <Sparkle x={190} y={-60} size={0.8} delay={0.5} />
      <Sparkle x={160} y={-170} size={0.6} delay={1} />
    </Head>
  )
}

export function Worried() {
  return (
    <Head>
      <Gloom opacity={0.35} />
      {/* eyes look up anxiously */}
      {[-60, 60].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={32} rx={20} ry={26} fill={c.white} stroke={ink} strokeWidth={7} />
          <circle cx={x} cy={22} r={11} fill={ink} />
        </g>
      ))}
      {/* steep brows */}
      <path d="M -105 -2 Q -72 -18 -32 -48" {...line} strokeWidth={12} />
      <path d="M 32 -48 Q 72 -18 105 -2" {...line} strokeWidth={12} />
      {/* big wobbly mouth */}
      <path d="M -50 112 Q -37 92 -25 112 Q -12 132 0 112 Q 12 92 25 112 Q 37 132 50 112" {...line} />
      <SweatDrop x={140} y={-35} size={1.7} className="sg-sweat-slide" />
    </Head>
  )
}

export function VeryWorried() {
  return (
    <Head skin="#f3dccf" className="sg-tremble">
      <Gloom opacity={0.75} />
      {/* bulging eyes with pinprick pupils */}
      {[-62, 62].map((x) => (
        <g key={x}>
          <circle cx={x} cy={30} r={40} fill={c.white} stroke={ink} strokeWidth={8} />
          <circle cx={x} cy={32} r={7} fill={ink} />
        </g>
      ))}
      {/* brows nearly vertical */}
      <path d="M -112 -14 Q -80 -30 -40 -72" {...line} strokeWidth={13} />
      <path d="M 40 -72 Q 80 -30 112 -14" {...line} strokeWidth={13} />
      {/* clenched, screaming teeth */}
      <rect x={-62} y={82} width={124} height={58} rx={18} fill={c.white} stroke={ink} strokeWidth={8} />
      <path d="M -62 111 L 62 111 M -31 82 L -31 140 M 0 82 L 0 140 M 31 82 L 31 140" stroke={ink} strokeWidth={5} />
      {/* tears and flying sweat */}
      <path d="M -62 70 Q -70 120 -58 170" fill="none" stroke={c.sweat} strokeWidth={12} strokeLinecap="round" opacity={0.9} />
      <path d="M 62 70 Q 70 120 58 170" fill="none" stroke={c.sweat} strokeWidth={12} strokeLinecap="round" opacity={0.9} />
      <SweatDrop x={150} y={-50} size={1.8} className="sg-sweat-fly" />
      <SweatDrop x={-160} y={-30} size={1.5} className="sg-sweat-fly-left" />
      <SweatDrop x={120} y={-140} size={1.2} className="sg-sweat-fly" />
    </Head>
  )
}

export function Tired() {
  return (
    <Head>
      {[-60, 60].map((x) => (
        <g key={x}>
          {/* heavy lids: just a sliver of eye left */}
          <path d={`M ${x - 30} 32 Q ${x} 48 ${x + 30} 32 Z`} fill={ink} />
          <path d={`M ${x - 34} 30 L ${x + 34} 30`} {...line} strokeWidth={11} />
          {/* deep bags */}
          <path d={`M ${x - 30} 58 Q ${x} 74 ${x + 30} 58`} fill="none" stroke="#9a7bb8" strokeWidth={8} strokeLinecap="round" />
          <path d={`M ${x - 22} 74 Q ${x} 86 ${x + 22} 74`} fill="none" stroke="#9a7bb8" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        </g>
      ))}
      {/* giant yawn */}
      <ellipse className="sg-yawn" cx={0} cy={118} rx={32} ry={40} fill="#7a2f2f" stroke={ink} strokeWidth={8} />
      <ellipse cx={0} cy={140} rx={18} ry={11} fill="#ff8a8a" />
      <path d="M 92 40 Q 100 58 92 66" fill="none" stroke={c.sweat} strokeWidth={7} strokeLinecap="round" />
      <Sleepy />
    </Head>
  )
}

/** A spiral for dizzy eyes, centered on (0, 0). */
const spiral = 'M 0 0 Q 6 -6 10 0 Q 14 10 0 14 Q -16 14 -18 0 Q -18 -22 0 -24 Q 26 -24 28 0'

export function Exhausted() {
  return (
    <Head skin="#e3dcc3">
      {/* sickly pallor */}
      <ellipse cx={0} cy={-20} rx={140} ry={60} fill="#b9c8a0" opacity={0.35} />
      {[-62, 62].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={58} rx={42} ry={26} fill="#a48bbd" opacity={0.65} />
          <g transform={`translate(${x} 30)`}>
            <path className="sg-spin" d={spiral} fill="none" stroke={ink} strokeWidth={8} strokeLinecap="round" />
          </g>
        </g>
      ))}
      {/* slack mouth, tongue hanging out, drool */}
      <ellipse cx={0} cy={112} rx={34} ry={30} fill="#7a2f2f" stroke={ink} strokeWidth={8} />
      <path d="M -6 118 Q 20 120 30 150 Q 34 172 14 172 Q -2 170 -4 150 Z" fill="#ff8a8a" stroke={ink} strokeWidth={6} strokeLinejoin="round" />
      <path className="sg-drool" d="M -28 126 Q -34 160 -26 190" fill="none" stroke={c.sweat} strokeWidth={9} strokeLinecap="round" />
      <Sleepy big />
      {/* soul drifting out of the body */}
      <g className="sg-soul">
        <path
          d="M -150 -150 Q -150 -200 -110 -200 Q -70 -200 -70 -150 L -70 -110 Q -80 -120 -90 -110 Q -100 -120 -110 -110 Q -120 -120 -130 -110 Q -140 -120 -150 -110 Z"
          fill="#ffffff"
          stroke={ink}
          strokeWidth={5}
          opacity={0.9}
        />
        <circle cx={-125} cy={-160} r={5} fill={ink} />
        <circle cx={-97} cy={-160} r={5} fill={ink} />
      </g>
    </Head>
  )
}
