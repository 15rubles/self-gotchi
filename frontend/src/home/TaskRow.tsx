import type { TaskState } from '../api/types'
import { describeTask, effectEmoji, streakLabel } from '../lib/format'
import { rowBodyClass, type ListColor } from '../ui/listStyles'

export type RowBusy = 'complete' | 'undo'

/** Reminders' priority marks, used for severity: ! / !! / !!! */
const priority = ['', '!', '!!', '!!!']

/**
 * One habit in the iOS Reminders style: a circle on the left, the name with priority marks,
 * a grey details line, and a hairline divider that starts at the text.
 *
 * Like Reminders, the circle toggles: tap an empty one to log the habit, tap a filled (done)
 * one to take the latest log back. Partly done habits (1/3 meals) get a small ↺ to take back
 * the last tap.
 */
export function TaskRow({
  task,
  color,
  timeZone,
  busy,
  onComplete,
  onUndo,
}: {
  task: TaskState
  color: ListColor
  timeZone: string
  busy: RowBusy | null
  onComplete: (task: TaskState) => void
  onUndo: (task: TaskState) => void
}) {
  const done = task.status === 'DONE'
  const off = task.status === 'OFF'
  const canUndo = task.latestCompletionId !== null
  // While saving, show where the tap is going.
  const filled = busy === 'complete' || (done && busy !== 'undo')
  const settled = off || done
  const streak = streakLabel(task)
  const marks = settled ? '' : (priority[task.severity] ?? priority[3])

  const toggle = () => (done ? onUndo(task) : onComplete(task))
  const ringDisabled = busy !== null || off || (done && !canUndo)

  return (
    <li className="group flex items-stretch">
      <button
        type="button"
        onClick={toggle}
        disabled={ringDisabled}
        aria-label={done ? `Mark ${task.name} not done` : `Mark ${task.name} done`}
        aria-pressed={done}
        className="grid w-12 shrink-0 place-items-center disabled:cursor-default"
      >
        <span
          className={`grid size-[22px] place-items-center rounded-full border-[1.5px] transition-colors ${off ? 'border-dashed' : ''}`}
          style={{ borderColor: filled ? color.ring : off ? 'var(--label-3)' : 'var(--ring-empty)' }}
          aria-hidden
        >
          <span
            className="size-[14px] rounded-full transition-transform duration-200"
            style={{ backgroundColor: color.ring, transform: filled ? 'scale(1)' : 'scale(0)' }}
          />
        </span>
      </button>
      <div className={rowBodyClass}>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[17px] leading-snug ${settled ? 'text-label-3' : 'text-label'}`}>
            {marks && (
              <span className="font-semibold" style={{ color: color.text }}>
                {marks}{' '}
              </span>
            )}
            {task.name}
          </p>
          <p
            className="truncate text-[15px] leading-snug"
            style={{ color: task.status === 'MISSED' || task.status === 'DUE_SOON' ? color.text : 'var(--label-2)' }}
          >
            {describeTask(task, timeZone)}
          </p>
        </div>
        {!done && canUndo && task.done > 0 && (
          <button
            type="button"
            onClick={() => onUndo(task)}
            disabled={busy !== null}
            aria-label={`Undo the last ${task.name} log`}
            title="Undo the last log"
            className="grid size-9 shrink-0 place-items-center rounded-full text-lg text-tint hover:bg-fill disabled:text-label-3"
          >
            ↺
          </button>
        )}
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
