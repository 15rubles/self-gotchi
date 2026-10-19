import type { ReactNode } from 'react'
import { inlineControl, rowBodyClass } from './listStyles'
import { MinusIcon, PlusIcon } from './Icons'

/** iOS Settings-style rounded-square icon at the start of a row. */
export function RowIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <span className="grid size-[29px] shrink-0 place-items-center rounded-[7px] text-base" style={{ backgroundColor: color }} aria-hidden>
      {emoji}
    </span>
  )
}

/**
 * One form row on a card: optional icon, label on the left, control on the right, and the
 * field's error under it. `htmlFor` ties the label to the control.
 */
export function FormRow({
  icon,
  label,
  htmlFor,
  error,
  errorId,
  children,
}: {
  icon?: ReactNode
  label: ReactNode
  htmlFor?: string
  error?: string
  errorId?: string
  children?: ReactNode
}) {
  return (
    <li className="group flex items-stretch pl-4">
      {icon && <span className="flex items-center pr-3">{icon}</span>}
      <div className={`${rowBodyClass} flex-wrap`}>
        <label htmlFor={htmlFor} className="min-w-0 flex-1 text-[17px]">
          {label}
        </label>
        {children}
        {error && (
          <p id={errorId} className="w-full text-[13px] font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </li>
  )
}


export function InlineTime({ id, value, error, onChange }: { id: string; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`${inlineControl} ${error ? 'outline-2 outline-danger' : ''}`}
    />
  )
}

/** iOS stepper: − value + (keyboard users can also type into the number). */
export function Stepper({
  id,
  value,
  min,
  max,
  step = 1,
  unit,
  error,
  onChange,
}: {
  id: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  error?: string
  onChange: (value: number) => void
}) {
  const current = Number.isNaN(value) ? min : value
  const button = 'grid h-8 w-10 place-items-center text-label disabled:text-label-3'
  return (
    <span className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-12 bg-transparent text-right text-[17px] text-label-2 tabular-nums focus:text-label focus:outline-none"
      />
      {unit && <span className="text-[17px] text-label-2">{unit}</span>}
      <span className="flex divide-x divide-sep overflow-hidden rounded-lg bg-fill">
        <button type="button" className={button} onClick={() => onChange(Math.max(min, current - step))} disabled={current <= min} aria-label="Decrease">
          <MinusIcon size={16} />
        </button>
        <button type="button" className={button} onClick={() => onChange(Math.min(max, current + step))} disabled={current >= max} aria-label="Increase">
          <PlusIcon size={16} />
        </button>
      </span>
    </span>
  )
}
