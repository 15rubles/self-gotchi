import type { TaskState, TaskStatus } from '../api/types'
import { TaskRow } from './TaskRow'

/** Display order: due soon first, then whatever needs attention. */
const groups: { status: TaskStatus; title: string }[] = [
  { status: 'DUE_SOON', title: 'Due soon' },
  { status: 'MISSED', title: 'Needs attention' },
  { status: 'UPCOMING', title: 'Later' },
  { status: 'DONE', title: 'Done' },
  { status: 'OFF', title: 'Not today' },
]

function byDeadline(a: TaskState, b: TaskState): number {
  const da = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER
  const db = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER
  return b.severity - a.severity || da - db || a.sortOrder - b.sortOrder
}

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
    <div className="space-y-5">
      {groups.map(({ status, title }) => {
        const inGroup = tasks.filter((t) => t.status === status).sort(byDeadline)
        if (inGroup.length === 0) return null
        return (
          <section key={status} aria-labelledby={`group-${status}`}>
            <h2 id={`group-${status}`} className="mb-2 text-xs font-bold tracking-wider text-stone-500 uppercase">
              {title}
            </h2>
            <ul className="space-y-2">
              {inGroup.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
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
