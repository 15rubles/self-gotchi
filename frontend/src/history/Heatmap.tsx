import { useState } from 'react'
import type { DayResult, HistoryDay } from '../api/types'
import { daysBetween, formatDate, weekdayIndex } from '../lib/dates'
import { RESULT_STYLE } from './results'

const CELL = 14
const GAP = 3 // ≥ 2px surface gap between fills
const PITCH = CELL + GAP
const LEFT = 18 // weekday labels
const TOP = 16 // month labels

/** One day square; shape cues keep results distinguishable without color. */
export function Cell({ result, x, y, size = CELL }: { result: DayResult; x: number; y: number; size?: number }) {
  const s = RESULT_STYLE[result]
  const r = 3
  switch (result) {
    case 'MISSED':
      return (
        <g>
          <rect x={x} y={y} width={size} height={size} rx={r} fill={s.fill} />
          <path d={`M ${x + 3.5} ${y + size - 3.5} L ${x + size - 3.5} ${y + 3.5}`} stroke={s.ink} strokeWidth={2} strokeLinecap="round" />
        </g>
      )
    case 'LATE':
      return (
        <g>
          <rect x={x} y={y} width={size} height={size} rx={r} fill={s.fill} />
          <circle cx={x + size / 2} cy={y + size / 2} r={size * 0.16} fill={s.ink} />
        </g>
      )
    case 'PARTIAL':
      return (
        <g>
          <rect x={x} y={y} width={size} height={size} rx={r} fill={RESULT_STYLE.NONE.fill} />
          <path d={`M ${x} ${y + size / 2} H ${x + size} V ${y + size - r} Q ${x + size} ${y + size} ${x + size - r} ${y + size} H ${x + r} Q ${x} ${y + size} ${x} ${y + size - r} Z`} fill={s.fill} />
        </g>
      )
    case 'PENDING':
      return <rect x={x + 1} y={y + 1} width={size - 2} height={size - 2} rx={r} fill={s.fill} stroke={s.ink} strokeWidth={1.5} strokeDasharray="3 2" />
    default:
      return <rect x={x} y={y} width={size} height={size} rx={r} fill={s.fill} />
  }
}

/**
 * Calendar heatmap: one column per week (Monday on top), one square per logical day.
 * Hover or tap a square for the date and result.
 *
 * @param from the Monday the grid starts on (the first day in `days`)
 */
export function Heatmap({ days, from, label }: { days: HistoryDay[]; from: string; label: string }) {
  const [active, setActive] = useState<number | null>(null)
  const weeks = Math.ceil(days.length / 7)
  const width = LEFT + weeks * PITCH
  const height = TOP + 7 * PITCH

  const position = (i: number) => {
    const offset = daysBetween(from, days[i].date)
    return { x: LEFT + Math.floor(offset / 7) * PITCH, y: TOP + weekdayIndex(days[i].date) * PITCH }
  }

  const months = days
    .map((day, i) => ({ day, i }))
    .filter(({ day, i }) => i === 0 || day.date.endsWith('-01'))
    .map(({ day, i }) => ({ x: position(i).x, text: formatDate(day.date, { month: 'short' }) }))
    // drop a label crowding the previous one
    .filter((m, i, all) => i === 0 || m.x - all[i - 1].x >= PITCH * 3)

  const tip = active === null ? null : days[active]
  const tipPos = active === null ? null : position(active)

  return (
    <div className="relative" onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={label}>
        {months.map((m) => (
          <text key={`${m.x}-${m.text}`} x={m.x} y={10} fontSize={10} fill="#78716c">
            {m.text}
          </text>
        ))}
        {['M', '', 'W', '', 'F', '', 'S'].map((d, row) =>
          d ? (
            <text key={row} x={0} y={TOP + row * PITCH + CELL - 3} fontSize={10} fill="#78716c">
              {d}
            </text>
          ) : null,
        )}
        {days.map((day, i) => {
          const { x, y } = position(i)
          return (
            <g
              key={day.date}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
              className="cursor-pointer"
            >
              {/* hit target bigger than the mark */}
              <rect x={x - GAP / 2} y={y - GAP / 2} width={PITCH} height={PITCH} fill="transparent" />
              <Cell result={day.result} x={x} y={y} />
              {active === i && <rect x={x - 1.5} y={y - 1.5} width={CELL + 3} height={CELL + 3} rx={4} fill="none" stroke="#1c1917" strokeWidth={1.5} />}
            </g>
          )
        })}
      </svg>
      {tip && tipPos && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-stone-800 px-2 py-1 text-xs whitespace-nowrap text-white shadow"
          style={{ left: `${((tipPos.x + CELL / 2) / width) * 100}%`, top: `${(tipPos.y / height) * 100}%`, marginTop: -6 }}
        >
          <span className="font-semibold">{formatDate(tip.date)}</span> · {RESULT_STYLE[tip.result].label}
          {tip.completions > 0 && ` · ${tip.completions}×`}
        </div>
      )}
    </div>
  )
}
