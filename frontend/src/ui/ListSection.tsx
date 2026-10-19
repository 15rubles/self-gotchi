import type { ReactNode } from 'react'
import type { ListColor } from './listStyles'

/** An iOS Reminders-style list: a colored title with a count over a white rounded card of rows. */
export function ListSection({ id, title, color, count, children }: { id: string; title: string; color: ListColor; count: number; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <h2 id={id} className="text-xl font-bold" style={{ color: color.text }}>
          {title}
        </h2>
        <span className="text-lg font-semibold text-stone-400" aria-label={`${count} habits`}>
          {count}
        </span>
      </div>
      <ul className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">{children}</ul>
    </section>
  )
}

/** iOS switch. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-[17px] shadow-sm ring-1 ring-black/5">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? 'bg-[#34c759]' : 'bg-stone-200'}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </label>
  )
}
