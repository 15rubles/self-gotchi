import { ink, outlined, palette as c } from './palette'
import { Flies } from './effects'

// Shared room background on the 1024x1024 canvas, 4 cleanliness levels (0 clean .. 3 filthy).
// Each level adds clutter on top of the previous one.

function Base({ level }: { level: number }) {
  return (
    <g>
      <rect x={0} y={0} width={1024} height={700} fill={c.wall} />
      <path d="M 0 140 L 1024 140" stroke={c.wallShade} strokeWidth={8} />
      <rect x={0} y={700} width={1024} height={324} fill={c.floor} />
      {[780, 870, 960].map((y) => (
        <path key={y} d={`M 0 ${y} L 1024 ${y}`} stroke={c.floorShade} strokeWidth={5} />
      ))}
      <rect x={0} y={682} width={1024} height={22} fill={c.wallShade} stroke={ink} strokeWidth={6} />
      {/* window */}
      <rect x={80} y={180} width={230} height={200} rx={10} fill={c.window} {...outlined} />
      <path d="M 195 180 L 195 380 M 80 280 L 310 280" stroke={ink} strokeWidth={8} />
      {level >= 2 && <rect x={84} y={184} width={222} height={192} fill="#8a7a5a" opacity={0.25 + level * 0.1} />}
      {/* poster */}
      <rect x={760} y={190} width={150} height={190} rx={6} fill="#ffe08a" {...outlined} transform={level >= 3 ? 'rotate(8 835 285)' : undefined} />
      <path d="M 835 240 L 870 320 L 800 320 Z" fill="#ff9f6e" stroke={ink} strokeWidth={6} transform={level >= 3 ? 'rotate(8 835 285)' : undefined} />
      {/* plant */}
      <rect x={880} y={600} width={80} height={90} rx={10} fill={c.pot} {...outlined} />
      <g fill={level >= 2 ? '#a4a35a' : c.plant} {...outlined} strokeWidth={7}>
        <ellipse cx={900} cy={575} rx={24} ry={40} transform={level >= 2 ? 'rotate(-40 900 600)' : 'rotate(-20 900 600)'} />
        <ellipse cx={940} cy={570} rx={24} ry={42} transform={level >= 2 ? 'rotate(45 940 600)' : 'rotate(20 940 600)'} />
        <ellipse cx={920} cy={555} rx={22} ry={44} transform={level >= 2 ? 'rotate(70 920 600)' : undefined} />
      </g>
    </g>
  )
}

function Sock({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${rotate})`}
      d="M 0 0 L 0 -50 L 26 -50 L 26 -8 Q 26 14 50 14 L 50 30 Q 0 34 0 0 Z"
      fill="#f4f4f4"
      {...outlined}
      strokeWidth={6}
    />
  )
}

function Paper({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M -20 0 L -10 -20 L 12 -18 L 22 2 L 8 18 L -14 16 Z"
      fill="#fafafa"
      {...outlined}
      strokeWidth={5}
    />
  )
}

function PizzaBox({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-6)`}>
      <rect x={0} y={0} width={150} height={40} fill="#d9b48a" {...outlined} strokeWidth={7} />
      <path d="M 10 0 L 140 -60 L 150 0" fill="#e8c9a0" {...outlined} strokeWidth={7} />
      <circle cx={70} cy={20} r={8} fill="#d65a3a" />
    </g>
  )
}

function Mug({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={0} width={44} height={50} rx={6} fill="#8fb3ff" {...outlined} strokeWidth={6} />
      <path d="M 44 12 Q 64 25 44 38" fill="none" stroke={ink} strokeWidth={6} />
      <ellipse cx={22} cy={4} rx={16} ry={4} fill="#5d3b1e" />
    </g>
  )
}

function TrashBag({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M -70 0 Q -80 -90 -10 -110 L 10 -110 Q 80 -90 70 0 Z" fill="#4b4b55" {...outlined} />
      <path d="M -14 -110 L 0 -135 L 14 -110" fill="none" stroke={ink} strokeWidth={8} />
      <path d="M -30 -60 Q -20 -80 0 -78" fill="none" stroke="#6d6d78" strokeWidth={8} strokeLinecap="round" />
    </g>
  )
}

function Stain({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#8a6a3a" opacity={0.35} />
}

export function Room({ level }: { level: number }) {
  const l = Math.max(0, Math.min(3, level))
  return (
    <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full" aria-hidden>
      <Base level={l} />
      {l >= 1 && (
        <g>
          <Sock x={160} y={920} rotate={-20} />
          <Paper x={820} y={930} />
        </g>
      )}
      {l >= 2 && (
        <g>
          <PizzaBox x={60} y={800} />
          <Mug x={760} y={820} />
          <Paper x={260} y={985} />
          <Paper x={700} y={975} />
          <Sock x={880} y={980} rotate={30} />
          <Stain x={600} y={960} rx={70} ry={18} />
        </g>
      )}
      {l >= 3 && (
        <g>
          <TrashBag x={120} y={760} scale={1.1} />
          <TrashBag x={930} y={800} />
          <Stain x={400} y={300} rx={60} ry={80} />
          <Stain x={250} y={900} rx={90} ry={20} />
          <Paper x={340} y={760} />
          <Flies x={120} y={600} count={3} />
          <rect x={0} y={0} width={1024} height={1024} fill="#5b4320" opacity={0.12} />
        </g>
      )}
    </svg>
  )
}
