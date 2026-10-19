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

  /** Takes back a habit's latest log (tapping a filled circle, or ↺ on a partly done habit). */
  const onUndoTask = (task: TaskState) => {
    if (task.latestCompletionId === null) return
    if (undoTarget?.completionId === task.latestCompletionId) setUndoTarget(null)
    undo.mutate(task.latestCompletionId)
  }

  if (isPending) {
    return <p className="p-8 text-center text-label-2">Waking your character up…</p>
  }
  if (error || !state) {
    return (
      <div className="p-8 text-center">
        <p className="text-label-2">Couldn't load your character.</p>
        <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-label px-4 py-2 text-app">
          Try again
        </button>
      </div>
    )
  }

  const busyRow = (tasks: TaskState[]) => {
    if (complete.isPending && complete.variables !== undefined) return { taskId: complete.variables, action: 'complete' as const }
    const undoing = undo.isPending ? tasks.find((t) => t.latestCompletionId === undo.variables) : undefined
    return undoing ? { taskId: undoing.id, action: 'undo' as const } : null
  }

  const bestStreak = Math.max(0, ...state.tasks.map((t) => t.streak))
  const mutationError = complete.error ?? undo.error

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between text-sm text-label-2">
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
        <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
          {mutationError.message}
        </p>
      )}

      {state.tasks.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-sep p-6 text-center text-label-2">
          No habits yet.
        </p>
      ) : (
        <TaskList
          tasks={state.tasks}
          timeZone={state.timezone}
          busy={busyRow(state.tasks)}
          onComplete={onComplete}
          onUndo={onUndoTask}
        />
      )}

      {undoTarget && <UndoToast target={undoTarget} onUndo={onUndo} onClose={closeToast} />}
    </div>
  )
}
