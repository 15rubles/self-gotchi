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
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-fill-2 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold ${value === option.value ? 'bg-card shadow' : 'text-label-2'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
