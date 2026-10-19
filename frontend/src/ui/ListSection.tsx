import type { ReactNode } from 'react'
import type { ListColor } from './listStyles'

/** Large iOS-style page title, with an optional action on the right. */
export function PageTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-3xl font-bold">{title}</h2>
      {action}
    </div>
  )
}

/** The rounded card every list and panel sits on. */
export function Card({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'ul' }) {
  return <Tag className={`overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${className}`}>{children}</Tag>
}

/**
 * An iOS Reminders-style list: a colored title with a count over a card of rows.
 * @param count a number of habits, or any short text (e.g. "2/6") with `countLabel` for screen readers
 */
export function ListSection({
  id,
  title,
  color,
  count,
  countLabel,
  children,
}: {
  id: string
  title: string
  color: ListColor
  count: number | string
  countLabel?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <h2 id={id} className="text-xl font-bold" style={{ color: color.text }}>
          {title}
        </h2>
        <span className="text-lg font-semibold text-label-3" aria-label={countLabel ?? `${count} habits`}>
          {count}
        </span>
      </div>
      <Card as="ul">{children}</Card>
    </section>
  )
}

/** iOS switch on its own card row. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-card px-4 py-2.5 text-[17px] shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? 'bg-[#34c759]' : 'bg-fill-2'}`}
      >
        {/* the knob stays white in dark mode too, as on iOS */}
        <span className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  )
}

/** iOS Settings-style group: small grey header, a card of rows, optional footnote. */
export function Group({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-1.5 px-4 text-[13px] text-label-2 uppercase">{title}</h2>}
      <Card as="ul">{children}</Card>
      {footer && <p className="mt-1.5 px-4 text-[13px] text-label-2">{footer}</p>}
    </section>
  )
}
