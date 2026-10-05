import type { TaskState } from '../api/types'
import { describeTask, effectEmoji, streakLabel } from '../lib/format'

const severityStyle = [
  'border-stone-300',
  'border-amber-400',
  'border-orange-500',
  'border-red-600',
]

/** Tasks that can't usefully be completed (again) today. */
function isSettled(task: TaskState): boolean {
  return task.status === 'OFF' || (task.status === 'DONE' && task.type !== 'QUOTA')
}

export function TaskRow({
  task,
  timeZone,
  busy,
  onComplete,
}: {
  task: TaskState
  timeZone: string
  busy: boolean
  onComplete: (task: TaskState) => void
}) {
  const settled = isSettled(task)
  const streak = streakLabel(task)
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border-2 border-l-8 bg-white px-3 py-2.5 ${severityStyle[task.severity] ?? severityStyle[3]} ${settled ? 'opacity-60' : ''}`}
    >
      <span className="text-2xl" aria-hidden>
        {effectEmoji[task.effectKey]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{task.name}</span>
          {streak && (
            <span className="shrink-0 rounded-full bg-orange-100 px-1.5 text-xs font-semibold text-orange-700" title="Current streak">
              🔥 {streak}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-stone-500">{describeTask(task, timeZone)}</p>
      </div>
      <button
        type="button"
        onClick={() => onComplete(task)}
        disabled={busy || settled}
        aria-label={`Mark ${task.name} done`}
        className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-stone-800 bg-lime-300 text-xl font-bold shadow-[0_3px_0_#292524] transition active:translate-y-0.5 active:shadow-none disabled:bg-stone-200 disabled:shadow-none"
      >
        {busy ? '…' : '✓'}
      </button>
    </li>
  )
}
