import type { TaskState, TaskStatus } from '../api/types'
import { TaskRow } from './TaskRow'

/**
 * iOS Reminders-style colors: `ring` is the circle (system colors), `text` a darker shade of the
 * same hue so section titles stay readable on white (≥ 4.5:1).
 */
export interface GroupColor {
  ring: string
  text: string
}

/** Display order: due soon first, then whatever needs attention. */
const groups: { status: TaskStatus; title: string; color: GroupColor }[] = [
  { status: 'DUE_SOON', title: 'Due soon', color: { ring: '#ff9500', text: '#c93400' } },
  { status: 'MISSED', title: 'Needs attention', color: { ring: '#ff3b30', text: '#d70015' } },
  { status: 'UPCOMING', title: 'Later', color: { ring: '#007aff', text: '#0063cc' } },
  { status: 'DONE', title: 'Done', color: { ring: '#8e8e93', text: '#6c6c70' } },
  { status: 'OFF', title: 'Not today', color: { ring: '#c7c7cc', text: '#6c6c70' } },
]

function byDeadline(a: TaskState, b: TaskState): number {
  const da = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER
  const db = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER
  return b.severity - a.severity || da - db || a.sortOrder - b.sortOrder
}

/** Today's habits as Reminders-style lists: a colored title per group, rows on a white card. */
export function TaskList({
  tasks,
  timeZone,
  busyTaskId,
  onComplete,
}: {
  tasks: TaskState[]
  timeZone: string
  busyTaskId: number | null
  onComplete: (task: TaskState) => void
}) {
  return (
    <div className="space-y-6">
      {groups.map(({ status, title, color }) => {
        const inGroup = tasks.filter((t) => t.status === status).sort(byDeadline)
        if (inGroup.length === 0) return null
        return (
          <section key={status} aria-labelledby={`group-${status}`}>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <h2 id={`group-${status}`} className="text-xl font-bold" style={{ color: color.text }}>
                {title}
              </h2>
              <span className="text-lg font-semibold text-stone-400" aria-label={`${inGroup.length} habits`}>
                {inGroup.length}
              </span>
            </div>
            <ul className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              {inGroup.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  color={color}
                  timeZone={timeZone}
                  busy={busyTaskId === task.id}
                  onComplete={onComplete}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
