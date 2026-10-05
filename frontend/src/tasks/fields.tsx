import type { ReactNode } from 'react'
import { inputClass } from './fieldStyles'

/** Label + control + error message, wired for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export function TimeInput({
  id,
  value,
  error,
  onChange,
}: {
  id: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      required
    />
  )
}

export function NumberInput({
  id,
  value,
  min,
  max,
  error,
  onChange,
}: {
  id: string
  value: number
  min: number
  max: number
  error?: string
  onChange: (value: number) => void
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={Number.isNaN(value) ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
      className={inputClass}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
    />
  )
}

/** Segmented single-choice control. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-stone-200 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold ${value === option.value ? 'bg-white shadow' : 'text-stone-600'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
