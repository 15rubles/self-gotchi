import { useCallback, useState } from 'react'
import { useCharacterState, useCompleteTask, useUndoCompletion } from '../api/hooks'
import type { TaskState } from '../api/types'
import { CharacterStage } from '../character/CharacterStage'
import { formatDay, formatTime } from '../lib/format'
import { TaskList } from './TaskList'
import { UndoToast, type UndoTarget } from './UndoToast'

export function HomePage() {
  const { data: state, error, isPending, refetch } = useCharacterState()
  const complete = useCompleteTask()
  const undo = useUndoCompletion()
  const [celebrateKey, setCelebrateKey] = useState(0)
  const [undoTarget, setUndoTarget] = useState<UndoTarget | null>(null)
  const closeToast = useCallback(() => setUndoTarget(null), [])

  const onComplete = (task: TaskState) => {
    complete.mutate(task.id, {
      onSuccess: (response) => {
        setCelebrateKey((k) => k + 1)
        setUndoTarget({ completionId: response.completion.id, taskName: task.name })
      },
    })
  }

  const onUndo = (target: UndoTarget) => {
    setUndoTarget(null)
    undo.mutate(target.completionId)
  }

  if (isPending) {
    return <p className="p-8 text-center text-stone-500">Waking your character up…</p>
  }
  if (error || !state) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-600">Couldn't load your character.</p>
        <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-stone-800 px-4 py-2 text-white">
          Try again
        </button>
      </div>
    )
  }

  const bestStreak = Math.max(0, ...state.tasks.map((t) => t.streak))
  const mutationError = complete.error ?? undo.error

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between text-sm text-stone-500">
        <span>
          {formatDay(state.at, state.timezone)} · {formatTime(state.at, state.timezone)}
        </span>
        {bestStreak >= 2 && (
          <span className="font-semibold text-orange-700" title="Longest active streak">
            🔥 {bestStreak} streak
          </span>
        )}
      </div>

      <CharacterStage state={state.character} celebrateKey={celebrateKey} />

      {mutationError && (
        <p role="alert" className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800">
          {mutationError.message}
        </p>
      )}

      {state.tasks.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center text-stone-500">
          No habits yet.
        </p>
      ) : (
        <TaskList
          tasks={state.tasks}
          timeZone={state.timezone}
          busyTaskId={complete.isPending ? (complete.variables ?? null) : null}
          onComplete={onComplete}
        />
      )}

      {undoTarget && <UndoToast target={undoTarget} onUndo={onUndo} onClose={closeToast} />}
    </div>
  )
}
