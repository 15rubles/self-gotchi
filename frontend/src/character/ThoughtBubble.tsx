import type { Icon } from '../api/types'
import { iconComponents } from './placeholders/registry'
import { ink } from './placeholders/palette'

const SLOT = 110

/** Layer 5: thought bubble above the head with up to 3 icons and a "+N" overflow badge. */
export function ThoughtBubble({
  icons,
  overflow,
  anchor,
  head,
}: {
  icons: Icon[]
  overflow: number
  anchor: { x: number; y: number }
  head: { x: number; y: number; scale: number }
}) {
  if (icons.length === 0) return null
  const slots = icons.length + (overflow > 0 ? 1 : 0)
  const width = 50 + slots * SLOT
  const height = 150
  const left = Math.min(anchor.x - width / 2, 1024 - width - 12)
  const centerY = anchor.y

  return (
    <g className="sg-fade-in">
      {/* trail of small bubbles from the head */}
      <circle cx={head.x + 150 * head.scale} cy={head.y - 140 * head.scale} r={14} fill="#fff" stroke={ink} strokeWidth={6} />
      <circle cx={head.x + 185 * head.scale} cy={head.y - 175 * head.scale} r={22} fill="#fff" stroke={ink} strokeWidth={6} />
      <rect x={left} y={centerY - height / 2} width={width} height={height} rx={70} fill="#fff" stroke={ink} strokeWidth={8} />
      {icons.map((icon, i) => {
        const Art = iconComponents[icon.key]
        const cx = left + 25 + SLOT / 2 + i * SLOT
        const scale = icon.severity >= 2 ? 1 : 0.8
        return (
          <g key={icon.taskId} transform={`translate(${cx} ${centerY}) scale(${scale})`}>
            <g className={icon.severity >= 3 ? 'sg-icon-pulse' : undefined}>
              <Art />
            </g>
          </g>
        )
      })}
      {overflow > 0 && (
        <g transform={`translate(${left + 25 + SLOT / 2 + icons.length * SLOT} ${centerY})`}>
          <circle r={36} fill="#ffcc80" stroke={ink} strokeWidth={6} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={34} fontWeight={800} fill={ink}>
            +{overflow}
          </text>
        </g>
      )}
    </g>
  )
}
