import { addDays, daysBetween, formatDate, monthEnd, weekdayIndex } from '../lib/dates'

export interface CalendarCell {
  fill: string
  ink: string
  /** Second line under the date, e.g. "4/6" or "✓". */
  mark: string
  dashed?: boolean
  /** Spoken after the date, e.g. "4 of 6 habits done". */
  description: string
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/**
 * One month as a Monday-first grid. Days after `today` are shown but can't be picked; `cell`
 * returns null for a day without data (drawn blank).
 */
export function MonthCalendar({
  month,
  today,
  selected,
  onSelect,
  cell,
}: {
  /** First day of the month, "2026-10-01". */
  month: string
  today: string
  selected: string | null
  onSelect: (date: string) => void
  cell: (date: string) => CalendarCell | null
}) {
  const lead = weekdayIndex(month)
  const count = daysBetween(month, monthEnd(month)) + 1
  const dates = Array.from({ length: count }, (_, i) => addDays(month, i))

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-stone-500" aria-hidden>
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div role="grid" aria-label={formatDate(month, { month: 'long', year: 'numeric' })} className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} aria-hidden />
        ))}
        {dates.map((date) => {
          const future = date > today
          const c = future ? null : cell(date)
          const isSelected = date === selected
          const day = Number(date.slice(8))
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              disabled={future}
              aria-selected={isSelected}
              aria-label={`${formatDate(date)}${c ? `, ${c.description}` : future ? ', upcoming' : ''}`}
              onClick={() => onSelect(date)}
              className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-lg text-sm leading-tight transition ${
                c?.dashed ? 'border-2 border-dashed border-stone-400' : ''
              } ${isSelected ? 'ring-2 ring-stone-900 ring-offset-2 ring-offset-amber-50' : ''} ${
                future ? 'cursor-default text-stone-300' : 'cursor-pointer hover:brightness-95'
              } ${date === today ? 'font-bold' : ''}`}
              style={c ? { backgroundColor: c.fill, color: c.ink } : { backgroundColor: future ? 'transparent' : '#f5f5f4' }}
            >
              <span>{day}</span>
              {c?.mark && <span className="text-[11px] font-semibold tabular-nums">{c.mark}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
