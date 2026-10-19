import { useState } from 'react'
import { Link } from 'react-router'
import { useTasks } from '../api/hooks'
import type { TaskDefinition } from '../api/types'
import { effectEmoji } from '../lib/format'
import { ListSection, Switch } from '../ui/ListSection'
import { LIST_COLORS, rowBodyClass, type ListColor } from '../ui/listStyles'
import { TYPE_INFO, describeSchedule } from './taskForm'

/** Habit definitions in the same Reminders style as the home screen: physical, mental, archived. */
export function TasksPage() {
  const [showArchived, setShowArchived] = useState(false)
  const { data: tasks, isPending, error, refetch } = useTasks(showArchived)

  const sections: { id: string; title: string; color: ListColor; items: TaskDefinition[] }[] = [
    { id: 'physical', title: 'Physical', color: LIST_COLORS.green, items: tasks?.filter((t) => t.active && t.category === 'PHYSICAL') ?? [] },
    { id: 'mental', title: 'Mental', color: LIST_COLORS.purple, items: tasks?.filter((t) => t.active && t.category === 'MENTAL') ?? [] },
    { id: 'archived', title: 'Archived', color: LIST_COLORS.gray, items: tasks?.filter((t) => !t.active) ?? [] },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-3xl font-bold">Habits</h2>
        <Link to="/tasks/new" className="flex items-center gap-1 text-[17px] font-semibold text-[#007aff] hover:opacity-70">
          <span className="grid size-6 place-items-center rounded-full bg-[#007aff] text-base leading-none text-white" aria-hidden>
            +
          </span>
          New habit
        </Link>
      </div>

      {isPending && <p className="px-1 text-stone-500">Loading…</p>}
      {error && (
        <p className="px-1 text-stone-600">
          Couldn't load habits.{' '}
          <button type="button" onClick={() => refetch()} className="text-[#007aff]">
            Try again
          </button>
        </p>
      )}
      {tasks && tasks.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-stone-500 shadow-sm ring-1 ring-black/5">No habits yet. Add your first one.</p>
      )}

      {sections.map(({ id, title, color, items }) =>
        items.length === 0 ? null : (
          <ListSection key={id} id={`habits-${id}`} title={title} color={color} count={items.length}>
            {items.map((task) => (
              <HabitRow key={task.id} task={task} color={color} />
            ))}
          </ListSection>
        ),
      )}

      <Switch checked={showArchived} onChange={setShowArchived} label="Show archived" />
    </div>
  )
}

function HabitRow({ task, color }: { task: TaskDefinition; color: ListColor }) {
  return (
    <li className="group">
      <Link to={`/tasks/${task.id}`} className="flex items-stretch hover:bg-stone-50 active:bg-stone-100">
        <span className="grid w-14 shrink-0 place-items-center" aria-hidden>
          <span className="grid size-[30px] place-items-center rounded-full text-base" style={{ backgroundColor: `${color.ring}26` }}>
            {effectEmoji[task.effectKey]}
          </span>
        </span>
        <span className={rowBodyClass}>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[17px] leading-snug ${task.active ? 'text-stone-900' : 'text-stone-400'}`}>{task.name}</span>
            <span className="block truncate text-[15px] leading-snug text-[#8e8e93]">
              {TYPE_INFO[task.type].title} · {describeSchedule(task.schedule)}
            </span>
          </span>
          <span className="shrink-0 text-xl text-[#c7c7cc]" aria-hidden>
            ›
          </span>
        </span>
      </Link>
    </li>
  )
}
