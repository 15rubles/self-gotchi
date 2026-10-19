import type { TaskState } from '../api/types'
import { describeTask, effectEmoji, streakLabel } from '../lib/format'
import type { GroupColor } from './TaskList'

/** Tasks that can't usefully be completed (again) today. */
function isSettled(task: TaskState): boolean {
  return task.status === 'OFF' || (task.status === 'DONE' && task.type !== 'QUOTA')
}

/** Reminders' priority marks, used for severity: ! / !! / !!! */
const priority = ['', '!', '!!', '!!!']

/**
 * One habit in the iOS Reminders style: a circle to tap on the left, the name with priority
 * marks, a grey details line, and a hairline divider that starts at the text.
 */
export function TaskRow({
  task,
  color,
  timeZone,
  busy,
  onComplete,
}: {
  task: TaskState
  color: GroupColor
  timeZone: string
  busy: boolean
  onComplete: (task: TaskState) => void
}) {
  const settled = isSettled(task)
  const filled = busy || task.status === 'DONE'
  const off = task.status === 'OFF'
  const streak = streakLabel(task)
  const marks = task.status === 'DONE' || off ? '' : (priority[task.severity] ?? priority[3])
  const label =
    task.status === 'DONE' && task.type === 'QUOTA' ? `Log another ${task.name} session` : `Mark ${task.name} done`

  return (
    <li className="group flex items-stretch">
      <button
        type="button"
        onClick={() => onComplete(task)}
        disabled={busy || settled}
        aria-label={label}
        className="grid w-12 shrink-0 place-items-center disabled:cursor-default"
      >
        <span
          className={`grid size-[22px] place-items-center rounded-full border-[1.5px] transition-colors ${off ? 'border-dashed' : ''}`}
          style={{ borderColor: filled ? color.ring : off ? '#c7c7cc' : '#b4b4b9' }}
          aria-hidden
        >
          <span
            className="size-[14px] rounded-full transition-transform duration-200"
            style={{ backgroundColor: color.ring, transform: filled ? 'scale(1)' : 'scale(0)' }}
          />
        </span>
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2 border-b border-stone-200 py-2.5 pr-3 group-last:border-b-0">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[17px] leading-snug ${settled ? 'text-stone-400' : 'text-stone-900'}`}>
            {marks && (
              <span className="font-semibold" style={{ color: color.text }}>
                {marks}{' '}
              </span>
            )}
            {task.name}
          </p>
          <p
            className="truncate text-[15px] leading-snug"
            style={{ color: task.status === 'MISSED' || task.status === 'DUE_SOON' ? color.text : '#8e8e93' }}
          >
            {describeTask(task, timeZone)}
          </p>
        </div>
        {streak && (
          <span className="shrink-0 text-sm font-semibold text-orange-700" title="Current streak">
            🔥 {streak}
          </span>
        )}
        <span className={`shrink-0 text-lg ${settled ? 'opacity-50' : ''}`} aria-hidden>
          {effectEmoji[task.effectKey]}
        </span>
      </div>
    </li>
  )
}
