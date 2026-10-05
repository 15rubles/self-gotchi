import { useState } from 'react'
import { useCharacterState, useHistory } from '../api/hooks'
import type { HistoryTask } from '../api/types'
import { addDays, formatDate, mondayOf } from '../lib/dates'
import { effectEmoji } from '../lib/format'
import { Cell, Heatmap } from './Heatmap'
import { LEGEND_ORDER, RESULT_STYLE } from './results'

const RANGES = [4, 12, 26]

export function HistoryPage() {
  const { data: state } = useCharacterState()
  const [weeks, setWeeks] = useState(12)
  const [showArchived, setShowArchived] = useState(false)
  const [asTable, setAsTable] = useState(false)
  const to = state?.logicalDate
  // Start on a Monday so every column is a full week.
  const from = to ? addDays(mondayOf(to), -(weeks - 1) * 7) : undefined
  const { data, isPending, error, refetch } = useHistory(from, to)

  const tasks = data?.tasks.filter((t) => showArchived || t.active) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-bold">History</h2>
        <div role="radiogroup" aria-label="Range" className="flex gap-1 rounded-xl bg-stone-200 p-1">
          {RANGES.map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={weeks === w}
              onClick={() => setWeeks(w)}
              className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${weeks === w ? 'bg-white shadow' : 'text-stone-600'}`}
            >
              {w} wk
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-stone-800" />
          Show archived
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={asTable} onChange={(e) => setAsTable(e.target.checked)} className="accent-stone-800" />
          Show as table
        </label>
      </div>

      <Legend />

      {(isPending || !to) && !error && <p className="text-stone-500">Loading…</p>}
      {error && (
        <p className="text-stone-600">
          Couldn't load history.{' '}
          <button type="button" onClick={() => refetch()} className="underline">
            Try again
          </button>
        </p>
      )}
      {data && tasks.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center text-stone-500">No habits yet.</p>
      )}

      <div className="space-y-3">
        {data &&
          tasks.map((task) => (
            <TaskHistoryCard key={task.id} task={task} from={data.from} emoji={effectEmoji[task.effectKey]} asTable={asTable} />
          ))}
      </div>
    </div>
  )
}

function TaskHistoryCard({ task, from, emoji, asTable }: { task: HistoryTask; from: string; emoji: string; asTable: boolean }) {
  const unit = task.type === 'QUOTA' ? 'wk' : 'd'
  const hasStreaks = task.type !== 'FRESHNESS'
  return (
    <section className={`rounded-2xl border-2 border-stone-300 bg-white p-3 ${task.active ? '' : 'opacity-70'}`} aria-labelledby={`h-${task.id}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h3 id={`h-${task.id}`} className="min-w-0 flex-1 truncate font-semibold">
          {task.name}
          {!task.active && <span className="ml-2 rounded-full bg-stone-200 px-1.5 text-xs font-normal">archived</span>}
        </h3>
        {hasStreaks && (
          <div className="flex shrink-0 gap-3 text-sm">
            <span title="Current streak">
              🔥 <span className="font-semibold">{task.currentStreak}</span>
              <span className="text-stone-500"> {unit}</span>
            </span>
            <span title="Best streak">
              🏆 <span className="font-semibold">{task.bestStreak}</span>
              <span className="text-stone-500"> {unit}</span>
            </span>
          </div>
        )}
      </div>
      {asTable ? (
        <DayTable task={task} />
      ) : (
        <Heatmap days={task.days} from={from} label={`${task.name}: daily results. Use "Show as table" for a readable list.`} />
      )}
    </section>
  )
}

function DayTable({ task }: { task: HistoryTask }) {
  const rows = [...task.days].reverse().filter((d) => d.result !== 'NONE')
  if (rows.length === 0) return <p className="text-sm text-stone-500">Nothing recorded in this range.</p>
  return (
    <div className="max-h-64 overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-white text-xs text-stone-500">
          <tr>
            <th className="py-1 font-semibold">Day</th>
            <th className="py-1 font-semibold">Result</th>
            <th className="py-1 text-right font-semibold">Times</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((day) => (
            <tr key={day.date} className="border-t border-stone-100">
              <td className="py-1">{formatDate(day.date)}</td>
              <td className="py-1">{RESULT_STYLE[day.result].label}</td>
              <td className="py-1 text-right tabular-nums">{day.completions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600" aria-label="Legend">
      {LEGEND_ORDER.map((result) => (
        <li key={result} className="flex items-center gap-1">
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
            <Cell result={result} x={0} y={0} />
          </svg>
          {RESULT_STYLE[result].label}
        </li>
      ))}
    </ul>
  )
}
