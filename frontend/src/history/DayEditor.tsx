import { useState } from 'react'
import { ApiError } from '../api/client'
import { useDayCompletions, useLogCompletion, useUndoCompletion } from '../api/hooks'
import type { HistoryTask } from '../api/types'
import { addDays, formatDate, zonedInstant, zonedTime } from '../lib/dates'
import { effectEmoji } from '../lib/format'
import { Group } from '../ui/ListSection'
import { rowBodyClass } from '../ui/listStyles'
import { Sheet } from '../ui/Sheet'

/**
 * One habit on one logical day: its logs (each can be deleted) and "Add a log" at a chosen time.
 * Times before the day-start hour belong to the night after the date (01:30 with a 04:00 start).
 */
export function DayEditor({
  task,
  date,
  today,
  zone,
  resetHour,
  onClose,
}: {
  task: HistoryTask | null
  date: string
  today: string
  zone: string
  resetHour: number
  onClose: () => void
}) {
  return (
    <Sheet
      open={task !== null}
      onClose={onClose}
      title={task ? `${effectEmoji[task.effectKey]} ${task.name}` : ''}
      subtitle={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
    >
      {task && <DayEditorBody key={`${task.id}-${date}`} task={task} date={date} today={today} zone={zone} resetHour={resetHour} />}
    </Sheet>
  )
}

function DayEditorBody({ task, date, today, zone, resetHour }: { task: HistoryTask; date: string; today: string; zone: string; resetHour: number }) {
  const { data: all, isPending } = useDayCompletions(date)
  const remove = useUndoCompletion()
  const log = useLogCompletion()
  const [time, setTime] = useState(() => (date === today ? zonedTime(new Date(), zone) : '12:00'))

  const logs = all?.filter((c) => c.taskId === task.id) ?? []
  const hour = Number(time.split(':')[0])
  // A wall time before the reset hour is the early morning after `date`.
  const calendarDate = hour < resetHour ? addDays(date, 1) : date
  const add = () => log.mutate({ taskId: task.id, completedAt: zonedInstant(calendarDate, time, zone).toISOString() })

  const error = log.error ?? remove.error
  const message = error instanceof ApiError ? (error.problem.errors?.map((e) => e.message).join('. ') ?? error.message) : error?.message
  const startLabel = `${String(resetHour).padStart(2, '0')}:00`

  return (
    <>
      <Group title="Logged">
        {isPending && <li className="px-4 py-3 text-label-2">Loading…</li>}
        {!isPending && logs.length === 0 && <li className="px-4 py-3 text-[17px] text-label-2">Nothing logged this day.</li>}
        {logs.map((c) => (
          <li key={c.id} className="group flex items-stretch pl-4">
            <div className={rowBodyClass}>
              <span className="flex-1 text-[17px] tabular-nums">{zonedTime(new Date(c.completedAt), zone)}</span>
              <button
                type="button"
                onClick={() => remove.mutate(c.id)}
                disabled={remove.isPending}
                className="rounded-lg px-2 py-1 text-[17px] text-danger hover:bg-fill disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </Group>

      <Group
        title="Add a log"
        footer={
          message ? (
            <span className="text-danger" role="alert">
              {message}
            </span>
          ) : (
            `Times before ${startLabel} count as the night after this day (your day starts at ${startLabel}).`
          )
        }
      >
        <li className="group flex items-stretch pl-4">
          <div className={rowBodyClass}>
            <label htmlFor="log-time" className="flex-1 text-[17px]">
              Time
            </label>
            <input
              id="log-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg bg-fill px-2 py-1 text-[17px] tabular-nums"
            />
            <button
              type="button"
              onClick={add}
              disabled={log.isPending || !time}
              className="rounded-lg px-2 py-1 text-[17px] font-semibold text-tint hover:bg-fill disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </li>
      </Group>
    </>
  )
}
