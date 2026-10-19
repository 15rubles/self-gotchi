import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCharacterState, useHistory } from '../api/hooks'
import type { HistoryTask } from '../api/types'
import { addMonths, formatDate, monthEnd, monthStart } from '../lib/dates'
import { effectEmoji } from '../lib/format'
import { MonthCalendar, type CalendarCell } from './MonthCalendar'
import { LEGEND_ORDER, RESULT_STYLE, SUMMARY_LEGEND, SUMMARY_STYLE, summarize, type DaySummary } from './results'

/**
 * A month calendar of all habits together (done / due per day), or of one habit picked from
 * the dropdown (`?task=<id>`). Tap a day for each habit's result that day.
 */
export function HistoryPage() {
  const { data: state } = useCharacterState()
  const today = state?.logicalDate
  const [params, setParams] = useSearchParams()
  const [pickedMonth, setPickedMonth] = useState<string | null>(null)
  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const month = pickedMonth ?? (today ? monthStart(today) : undefined)
  const end = month && today ? (monthEnd(month) < today ? monthEnd(month) : today) : undefined
  const { data, isPending, error, refetch } = useHistory(month, end)

  const taskId = Number(params.get('task')) || null
  const tasks = useMemo(() => data?.tasks.filter((t) => showArchived || t.active || t.id === taskId) ?? [], [data, showArchived, taskId])
  const task = taskId ? tasks.find((t) => t.id === taskId) : undefined
  const summaries = useMemo(() => summarize(tasks), [tasks])

  // Today when it's in the shown month, otherwise nothing until a day is tapped.
  const selected = pickedDay && month && pickedDay.startsWith(month.slice(0, 7)) ? pickedDay : today && month && today.startsWith(month.slice(0, 7)) ? today : null

  const pickTask = (id: string) => {
    setParams(id ? { task: id } : {}, { replace: true })
  }
  const go = (months: number) => {
    if (!month) return
    setPickedMonth(addMonths(month, months))
    setPickedDay(null)
  }

  const cell = (date: string): CalendarCell | null => {
    if (task) {
      const day = task.days.find((d) => d.date === date)
      if (!day) return null
      const style = RESULT_STYLE[day.result]
      return { ...style, description: style.label + (day.completions > 1 ? `, ${day.completions} times` : '') }
    }
    const summary = summaries.get(date)
    if (!summary) return null
    const style = SUMMARY_STYLE[summary.level]
    return {
      ...style,
      mark: summary.due > 0 ? `${summary.done}/${summary.due}` : '',
      description: summary.due > 0 ? `${summary.done} of ${summary.due} habits done` : 'nothing due',
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-bold">History</h2>
        <label className="sr-only" htmlFor="history-task">
          Show
        </label>
        <select
          id="history-task"
          value={task ? String(task.id) : ''}
          onChange={(e) => pickTask(e.target.value)}
          className="rounded-xl border-2 border-stone-300 bg-white px-2 py-1.5 text-sm font-semibold"
        >
          <option value="">All habits</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {effectEmoji[t.effectKey]} {t.name}
              {t.active ? '' : ' (archived)'}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-stone-800" />
        Show archived habits
      </label>

      {task && <Streaks task={task} />}

      <section className="rounded-2xl border-2 border-stone-300 bg-white p-3">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => go(-1)} disabled={!month} className="rounded-lg px-3 py-1 text-lg font-bold hover:bg-stone-100" aria-label="Previous month">
            ‹
          </button>
          <h3 className="font-semibold">{month ? formatDate(month, { month: 'long', year: 'numeric' }) : ''}</h3>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={!month || !today || month >= monthStart(today)}
            className="rounded-lg px-3 py-1 text-lg font-bold hover:bg-stone-100 disabled:text-stone-300 disabled:hover:bg-transparent"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {(isPending || !today) && !error && <p className="py-8 text-center text-stone-500">Loading…</p>}
        {error && (
          <p className="py-8 text-center text-stone-600">
            Couldn't load history.{' '}
            <button type="button" onClick={() => refetch()} className="underline">
              Try again
            </button>
          </p>
        )}
        {data && month && today && (
          <MonthCalendar month={month} today={today} selected={selected} onSelect={setPickedDay} cell={cell} />
        )}
      </section>

      <Legend single={Boolean(task)} />

      {data && selected && (task ? <TaskDay task={task} date={selected} /> : <AllDay tasks={tasks} date={selected} summary={summaries.get(selected)} />)}
      {data && tasks.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center text-stone-500">No habits yet.</p>
      )}
    </div>
  )
}

function Streaks({ task }: { task: HistoryTask }) {
  if (task.type === 'FRESHNESS') return null
  const unit = task.type === 'QUOTA' ? 'weeks' : 'days'
  return (
    <div className="flex gap-6 text-sm">
      <span title="Current streak">
        🔥 Current <span className="font-semibold">{task.currentStreak}</span> <span className="text-stone-500">{unit}</span>
      </span>
      <span title="Best streak">
        🏆 Best <span className="font-semibold">{task.bestStreak}</span> <span className="text-stone-500">{unit}</span>
      </span>
    </div>
  )
}

/** Every habit's result on one day. Habits with nothing due that day are listed last, muted. */
function AllDay({ tasks, date, summary }: { tasks: HistoryTask[]; date: string; summary?: DaySummary }) {
  const rows = tasks.map((task) => ({ task, day: task.days.find((d) => d.date === date) }))
  const counted = rows.filter((r) => r.day && r.day.result !== 'OFF' && r.day.result !== 'NONE')
  const rest = rows.filter((r) => !counted.includes(r))
  return (
    <section className="rounded-2xl border-2 border-stone-300 bg-white p-3" aria-live="polite">
      <h3 className="mb-2 font-semibold">
        {formatDate(date)}
        {summary && summary.due > 0 && (
          <span className="font-normal text-stone-500">
            {' '}
            · {summary.done} of {summary.due} done
          </span>
        )}
      </h3>
      <ul className="space-y-1.5">
        {[...counted, ...rest].map(({ task, day }) => {
          const style = RESULT_STYLE[day?.result ?? 'NONE']
          const muted = !counted.some((r) => r.task === task)
          return (
            <li key={task.id} className={`flex items-center gap-2 ${muted ? 'text-stone-400' : ''}`}>
              <span aria-hidden>{effectEmoji[task.effectKey]}</span>
              <span className="min-w-0 flex-1 truncate">{task.name}</span>
              {day && day.completions > 1 && <span className="text-xs tabular-nums text-stone-500">{day.completions}×</span>}
              <ResultChip result={day?.result ?? 'NONE'} label={style.label} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function TaskDay({ task, date }: { task: HistoryTask; date: string }) {
  const day = task.days.find((d) => d.date === date)
  const result = day?.result ?? 'NONE'
  return (
    <section className="rounded-2xl border-2 border-stone-300 bg-white p-3" aria-live="polite">
      <h3 className="mb-2 font-semibold">{formatDate(date)}</h3>
      <div className="flex items-center gap-2">
        <ResultChip result={result} label={RESULT_STYLE[result].label} />
        {day && day.completions > 0 && (
          <span className="text-sm text-stone-600">
            logged {day.completions} {day.completions === 1 ? 'time' : 'times'}
          </span>
        )}
      </div>
    </section>
  )
}

function ResultChip({ result, label }: { result: keyof typeof RESULT_STYLE; label: string }) {
  const s = RESULT_STYLE[result]
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${s.dashed ? 'border border-dashed border-stone-400' : ''}`}
      style={{ backgroundColor: s.fill, color: s.ink }}
    >
      {s.mark && <span aria-hidden>{s.mark} </span>}
      {label}
    </span>
  )
}

function Legend({ single }: { single: boolean }) {
  const items = single
    ? LEGEND_ORDER.map((r) => ({ key: r, ...RESULT_STYLE[r] }))
    : SUMMARY_LEGEND.map((l) => ({ key: l, ...SUMMARY_STYLE[l], mark: '' }))
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600" aria-label="Legend">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1">
          <span
            className={`inline-flex h-4 min-w-4 items-center justify-center rounded px-0.5 text-[10px] font-bold ${item.dashed ? 'border border-dashed border-stone-400' : ''}`}
            style={{ backgroundColor: item.fill, color: item.ink }}
            aria-hidden
          >
            {item.mark === 'late' ? '' : item.mark}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  )
}
