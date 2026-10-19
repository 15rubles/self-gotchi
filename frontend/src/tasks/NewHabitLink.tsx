import { Link } from 'react-router'

/** iOS-style "+ New habit" link to the habit editor (Habits tab and Home). */
export function NewHabitLink({ className = '' }: { className?: string }) {
  return (
    <Link to="/tasks/new" className={`flex items-center gap-1 text-[17px] font-semibold text-tint hover:opacity-70 ${className}`}>
      <span className="grid size-6 place-items-center rounded-full bg-tint text-base leading-none text-white" aria-hidden>
        +
      </span>
      New habit
    </Link>
  )
}
