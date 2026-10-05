import { useState } from 'react'
import { Link } from 'react-router'
import { useTasks } from '../api/hooks'
import { effectEmoji } from '../lib/format'
import { TYPE_INFO, describeSchedule } from './taskForm'

export function TasksPage() {
  const [showArchived, setShowArchived] = useState(false)
  const { data: tasks, isPending, error, refetch } = useTasks(showArchived)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Habits</h2>
        <Link
          to="/tasks/new"
          className="rounded-xl border-2 border-stone-800 bg-lime-300 px-3 py-1.5 font-bold shadow-[0_3px_0_#292524] active:translate-y-0.5 active:shadow-none"
        >
          + New habit
        </Link>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-stone-800" />
        Show archived
      </label>

      {isPending && <p className="text-stone-500">Loading…</p>}
      {error && (
        <p className="text-stone-600">
          Couldn't load habits.{' '}
          <button type="button" onClick={() => refetch()} className="underline">
            Try again
          </button>
        </p>
      )}
      {tasks && tasks.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center text-stone-500">
          No habits yet. Add your first one.
        </p>
      )}
      <ul className="space-y-2">
        {tasks?.map((task) => (
          <li key={task.id}>
            <Link
              to={`/tasks/${task.id}`}
              className={`flex items-center gap-3 rounded-2xl border-2 border-stone-300 bg-white px-3 py-2.5 hover:border-stone-800 ${task.active ? '' : 'opacity-60'}`}
            >
              <span className="text-2xl" aria-hidden>
                {effectEmoji[task.effectKey]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{task.name}</span>
                  {!task.active && <span className="rounded-full bg-stone-200 px-1.5 text-xs">archived</span>}
                </span>
                <span className="block truncate text-sm text-stone-500">
                  {TYPE_INFO[task.type].title} · {describeSchedule(task.schedule)}
                </span>
              </span>
              <span aria-hidden className="text-stone-400">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
