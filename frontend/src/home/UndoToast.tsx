import { useEffect } from 'react'

export interface UndoTarget {
  completionId: number
  taskName: string
}

/** Bottom toast after a completion, with a few seconds to undo a mistaken tap. */
export function UndoToast({
  target,
  onUndo,
  onClose,
  timeoutMs = 6000,
}: {
  target: UndoTarget
  onUndo: (target: UndoTarget) => void
  onClose: () => void
  timeoutMs?: number
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [target, onClose, timeoutMs])

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl bg-stone-800 px-4 py-3 text-white shadow-lg"
    >
      <span className="flex-1 truncate">✓ {target.taskName}</span>
      <button
        type="button"
        onClick={() => onUndo(target)}
        className="rounded-lg px-2 py-1 font-semibold text-lime-300 hover:bg-stone-700"
      >
        Undo
      </button>
    </div>
  )
}
