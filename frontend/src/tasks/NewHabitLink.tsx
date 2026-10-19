import { Link } from 'react-router'
import { PlusIcon } from '../ui/Icons'

/**
 * iOS-style "+ New habit" link to the habit editor (Habits tab and Home).
 * @param returnTo where Cancel / Add go afterwards (the editor's default is the Habits tab)
 */
export function NewHabitLink({ className = '', returnTo }: { className?: string; returnTo?: string }) {
  return (
    <Link to="/tasks/new" state={returnTo ? { returnTo } : undefined} className={`flex items-center gap-1 text-[17px] font-semibold text-tint hover:opacity-70 ${className}`}>
      <span className="grid size-6 place-items-center rounded-full bg-tint text-white" aria-hidden>
        <PlusIcon size={14} strokeWidth={3} />
      </span>
      New habit
    </Link>
  )
}
