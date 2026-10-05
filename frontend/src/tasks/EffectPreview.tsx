import { useDeferredValue, useState } from 'react'
import { useMe, useStateAt } from '../api/hooks'
import type { EffectKey } from '../api/types'
import { CharacterStage } from '../character/CharacterStage'
import { effectInfo, previewCharacter } from '../lib/effects'
import { describeTask, formatDay, formatTime } from '../lib/format'

const STEP_MINUTES = 30
const STEPS = 48 * 2 // the next 48 hours

const thumb = '!rounded-xl !border-2 !shadow-none'

/** The three things that happen to you when this habit slips, drawn from the effect alone. */
export function SeverityLadder({ effectKey }: { effectKey: EffectKey }) {
  const info = effectInfo(effectKey)
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((severity) => (
        <figure key={severity}>
          <CharacterStage state={previewCharacter(effectKey, severity)} className={thumb} />
          <figcaption className="mt-1 text-center text-xs leading-tight text-stone-600">
            <span className="font-semibold">{severity}.</span> {info.levels[severity - 1]}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/**
 * Live preview from the real engine: drag through the next 48 hours and see the whole
 * character and this task's status at that moment (GET /state?at=).
 */
export function TimePreview({ taskId, dirty }: { taskId: number; dirty: boolean }) {
  const { data: me } = useMe()
  const [step, setStep] = useState(0)
  const deferredStep = useDeferredValue(step)
  // Fixed when the preview opens, rounded to the step so scrubbing reuses cached responses.
  const [start] = useState(roundedNow)
  const at = new Date(start + deferredStep * STEP_MINUTES * 60_000).toISOString()
  const { data: preview, isFetching, error } = useStateAt(at)
  const tz = me?.timezone ?? preview?.timezone ?? 'UTC'
  const task = preview?.tasks.find((t) => t.id === taskId)
  const label = new Date(start + step * STEP_MINUTES * 60_000).toISOString()

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="flex justify-between text-sm">
          <span className="font-semibold">
            {step === 0 ? 'Now-ish' : `${formatDay(label, tz)} ${formatTime(label, tz)}`}
          </span>
          <span className="text-stone-500">{isFetching ? 'updating…' : 'drag to look ahead'}</span>
        </span>
        <input
          type="range"
          min={0}
          max={STEPS}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          className="mt-1 w-full accent-stone-800"
          aria-label="Preview time"
        />
      </label>
      {error && <p className="text-sm text-red-700">Couldn't load the preview.</p>}
      {preview && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3">
          <CharacterStage state={preview.character} className={thumb} />
          <div className="text-sm">
            {task ? (
              <>
                <p className="font-semibold">
                  {statusText[task.status]} · severity {task.severity}
                </p>
                <p className="text-stone-600">{describeTask(task, tz)}</p>
              </>
            ) : (
              <p className="text-stone-600">This habit isn't active at that time.</p>
            )}
            <p className="mt-2 text-xs text-stone-500">The character shows all your habits together.</p>
          </div>
        </div>
      )}
      {dirty && (
        <p className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-900">
          The preview uses the saved version. Save to see your changes here.
        </p>
      )}
    </div>
  )
}

function roundedNow(): number {
  const step = STEP_MINUTES * 60_000
  return Math.ceil(Date.now() / step) * step
}

const statusText = {
  UPCOMING: 'Upcoming',
  DUE_SOON: 'Due soon',
  DONE: 'Done',
  MISSED: 'Missed',
  OFF: 'Not scheduled',
} as const
