import type { TaskState, TaskStatus } from '../api/types'
import { ListSection } from '../ui/ListSection'
import { LIST_COLORS, type ListColor } from '../ui/listStyles'
import { TaskRow, type RowBusy } from './TaskRow'

/** Display order: due soon first, then whatever needs attention. */
const groups: { status: TaskStatus; title: string; color: ListColor }[] = [
  { status: 'DUE_SOON', title: 'Due soon', color: LIST_COLORS.orange },
  { status: 'MISSED', title: 'Needs attention', color: LIST_COLORS.red },
  { status: 'UPCOMING', title: 'Later', color: LIST_COLORS.blue },
  { status: 'DONE', title: 'Done', color: LIST_COLORS.gray },
  { status: 'OFF', title: 'Not today', color: LIST_COLORS.lightGray },
]

function byDeadline(a: TaskState, b: TaskState): number {
  const da = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER
  const db = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER
  return b.severity - a.severity || da - db || a.sortOrder - b.sortOrder
}

/** Today's habits as Reminders-style lists, one per status group. */
export function TaskList({
  tasks,
  timeZone,
  busy,
  onComplete,
  onUndo,
}: {
  tasks: TaskState[]
  timeZone: string
  /** The habit being saved right now, and which way. */
  busy: { taskId: number; action: RowBusy } | null
  onComplete: (task: TaskState) => void
  onUndo: (task: TaskState) => void
}) {
  return (
    <div className="space-y-6">
      {groups.map(({ status, title, color }) => {
        const inGroup = tasks.filter((t) => t.status === status).sort(byDeadline)
        if (inGroup.length === 0) return null
        return (
          <ListSection key={status} id={`group-${status}`} title={title} color={color} count={inGroup.length}>
            {inGroup.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                color={color}
                timeZone={timeZone}
                busy={busy?.taskId === task.id ? busy.action : null}
                onComplete={onComplete}
                onUndo={onUndo}
              />
            ))}
          </ListSection>
        )
      })}
    </div>
  )
}
