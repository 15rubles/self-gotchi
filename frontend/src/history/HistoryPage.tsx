import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCharacterState, useHistory } from '../api/hooks'
import type { DayResult, HistoryTask } from '../api/types'
import { addMonths, formatDate, monthEnd, monthStart } from '../lib/dates'
import { effectEmoji } from '../lib/format'
import { Card, ListSection, PageTitle, Switch } from '../ui/ListSection'
import { LIST_COLORS, rowBodyClass } from '../ui/listStyles'
import { MonthCalendar, type CalendarCell } from './MonthCalendar'
import { LEGEND_ORDER, RESULT_STYLE, SUMMARY_LEGEND, SUMMARY_STYLE, summarize, type DaySummary } from './results'

/**
 * A month calendar of all habits together (done / due per day), or of one habit picked from
 * the menu (`?task=<id>`). Tap a day for each habit's result that day. Same iOS list look as
 * Home and Habits.
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

  const inMonth = (date: string | null | undefined) => Boolean(date && month && date.startsWith(month.slice(0, 7)))
  // Today when it's in the shown month, otherwise nothing until a day is tapped.
  const selected = inMonth(pickedDay) ? pickedDay : inMonth(today) ? today! : null

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
    return {
      ...SUMMARY_STYLE[summary.level],
      mark: summary.due > 0 ? `${summary.done}/${summary.due}` : '',
      description: summary.due > 0 ? `${summary.done} of ${summary.due} habits done` : 'nothing due',
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="History" />

      <Card as="ul">
        <li className="group flex items-center">
          <label htmlFor="history-task" className="py-2.5 pl-4 text-[17px]">
            Show
          </label>
          <div className={`${rowBodyClass} justify-end pl-3`}>
            <select
              id="history-task"
              value={task ? String(task.id) : ''}
              onChange={(e) => setParams(e.target.value ? { task: e.target.value } : {}, { replace: true })}
              className="max-w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent text-right text-[17px] text-label-2 focus:outline-none"
            >
              <option value="">All habits</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {effectEmoji[t.effectKey]} {t.name}
                  {t.active ? '' : ' (archived)'}
                </option>
              ))}
            </select>
            <span className="shrink-0 text-sm text-label-3" aria-hidden>
              ⌃⌄
            </span>
          </div>
        </li>
      </Card>

      {task && task.type !== 'FRESHNESS' && <Streaks task={task} />}

      <Card className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => go(-1)} disabled={!month} className="rounded-lg px-3 py-1 text-2xl leading-none text-tint hover:bg-fill" aria-label="Previous month">
            ‹
          </button>
          <h3 className="text-[17px] font-semibold">{month ? formatDate(month, { month: 'long', year: 'numeric' }) : ''}</h3>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={!month || !today || month >= monthStart(today)}
            className="rounded-lg px-3 py-1 text-2xl leading-none text-tint hover:bg-fill disabled:text-label-3 disabled:hover:bg-transparent"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {(isPending || !today) && !error && <p className="py-8 text-center text-label-2">Loading…</p>}
        {error && (
          <p className="py-8 text-center text-label-2">
            Couldn't load history.{' '}
            <button type="button" onClick={() => refetch()} className="text-tint">
              Try again
            </button>
          </p>
        )}
        {data && month && today && <MonthCalendar month={month} today={today} selected={selected} onSelect={setPickedDay} cell={cell} />}

        <Legend single={Boolean(task)} />
      </Card>

      {data && selected && (task ? <TaskDay task={task} date={selected} /> : <AllDay tasks={tasks} date={selected} summary={summaries.get(selected)} />)}
      {data && tasks.length === 0 && <Card className="p-6 text-center text-label-2">No habits yet.</Card>}

      <Switch checked={showArchived} onChange={setShowArchived} label="Show archived" />
    </div>
  )
}

function Streaks({ task }: { task: HistoryTask }) {
  const unit = task.type === 'QUOTA' ? (task.currentStreak === 1 ? 'week' : 'weeks') : task.currentStreak === 1 ? 'day' : 'days'
  const bestUnit = task.type === 'QUOTA' ? (task.bestStreak === 1 ? 'week' : 'weeks') : task.bestStreak === 1 ? 'day' : 'days'
  return (
    <Card className="grid grid-cols-2 divide-x divide-sep">
      <Stat icon="🔥" label="Current streak" value={task.currentStreak} unit={unit} />
      <Stat icon="🏆" label="Best streak" value={task.bestStreak} unit={bestUnit} />
    </Card>
  )
}

function Stat({ icon, label, value, unit }: { icon: string; label: string; value: number; unit: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[13px] text-label-2">
        <span aria-hidden>{icon} </span>
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums">
        {value} <span className="text-[15px] font-normal text-label-2">{unit}</span>
      </p>
    </div>
  )
}

/** Every habit's result on one day, as a list; habits with nothing due that day come last, muted. */
function AllDay({ tasks, date, summary }: { tasks: HistoryTask[]; date: string; summary?: DaySummary }) {
  const rows = tasks.map((task) => ({ task, day: task.days.find((d) => d.date === date) }))
  const counts = (r: (typeof rows)[number]) => Boolean(r.day && r.day.result !== 'OFF' && r.day.result !== 'NONE')
  const ordered = [...rows.filter(counts), ...rows.filter((r) => !counts(r))]
  const hasCount = summary && summary.due > 0
  return (
    <ListSection
      id="history-day"
      title={formatDate(date)}
      color={LIST_COLORS.blue}
      count={hasCount ? `${summary.done}/${summary.due}` : ''}
      countLabel={hasCount ? `${summary.done} of ${summary.due} done` : 'nothing due'}
    >
      {ordered.map((r) => (
        <ResultRow key={r.task.id} task={r.task} result={r.day?.result ?? 'NONE'} completions={r.day?.completions ?? 0} muted={!counts(r)} />
      ))}
    </ListSection>
  )
}

function TaskDay({ task, date }: { task: HistoryTask; date: string }) {
  const day = task.days.find((d) => d.date === date)
  return (
    <ListSection id="history-day" title={formatDate(date)} color={LIST_COLORS.blue} count="" countLabel="">
      <ResultRow task={task} result={day?.result ?? 'NONE'} completions={day?.completions ?? 0} muted={false} />
    </ListSection>
  )
}

/** A habit and how it went: tinted emoji, name, grey result line, colored result badge. */
function ResultRow({ task, result, completions, muted }: { task: HistoryTask; result: DayResult; completions: number; muted: boolean }) {
  const s = RESULT_STYLE[result]
  const times = completions > 1 ? ` · logged ${completions}×` : ''
  return (
    <li className="group flex items-stretch">
      <span className="grid w-14 shrink-0 place-items-center" aria-hidden>
        <span className={`grid size-[30px] place-items-center rounded-full bg-fill text-base ${muted ? 'opacity-50' : ''}`}>{effectEmoji[task.effectKey]}</span>
      </span>
      <div className={rowBodyClass}>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[17px] leading-snug ${muted ? 'text-label-3' : 'text-label'}`}>{task.name}</p>
          <p className="truncate text-[15px] leading-snug text-label-2">
            {s.label}
            {times}
          </p>
        </div>
        {s.mark && !muted && (
          <span
            className={`grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold ${s.dashed ? 'border-2 border-dashed border-label-3' : ''}`}
            style={{ backgroundColor: s.fill, color: s.ink }}
            aria-hidden
          >
            {s.mark}
          </span>
        )}
      </div>
    </li>
  )
}

function Legend({ single }: { single: boolean }) {
  const items = single
    ? LEGEND_ORDER.map((r) => ({ key: r, ...RESULT_STYLE[r] }))
    : SUMMARY_LEGEND.map((l) => ({ key: l, ...SUMMARY_STYLE[l], mark: '' }))
  return (
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-sep pt-3 text-xs text-label-2" aria-label="Legend">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1">
          <span
            className={`inline-flex h-4 min-w-4 items-center justify-center rounded px-0.5 text-[10px] font-bold ${item.dashed ? 'border border-dashed border-label-3' : ''}`}
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
