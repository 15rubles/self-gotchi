import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useArchiveTask, useSaveTask, useTask } from '../api/hooks'
import { DAY_CODES, type Category, type DayCode, type TaskDefinition, type TaskType } from '../api/types'
import { EFFECTS } from '../lib/effects'
import { effectEmoji } from '../lib/format'
import { SeverityLadder, TimePreview } from './EffectPreview'
import { inputClass } from './fieldStyles'
import { Field, NumberInput, Segmented, TimeInput } from './fields'
import { TYPE_INFO, emptyForm, formFromTask, inputFromForm, validate, type FieldErrors, type TaskForm } from './taskForm'

export function TaskEditorPage() {
  const { id } = useParams()
  const taskId = id === undefined ? undefined : Number(id)
  const { data: task, isPending, error } = useTask(taskId)

  if (taskId !== undefined && isPending) return <p className="p-8 text-center text-label-2">Loading…</p>
  if (taskId !== undefined && (error || !task)) {
    return (
      <p className="p-8 text-center text-label-2">
        Habit not found. <Link to="/tasks" className="underline">Back to habits</Link>
      </p>
    )
  }
  // Remount when switching tasks so the form starts from that task's values.
  return <Editor key={task?.id ?? 'new'} task={task} />
}

function Editor({ task }: { task?: TaskDefinition }) {
  const navigate = useNavigate()
  const save = useSaveTask()
  const archive = useArchiveTask()
  const initial = task ? formFromTask(task) : emptyForm
  const [form, setForm] = useState<TaskForm>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showErrors, setShowErrors] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  const update = (patch: Partial<TaskForm>) => {
    const next = { ...form, ...patch }
    setForm(next)
    if (showErrors) setErrors(validate(next))
  }

  const setCategory = (category: Category) => {
    const keep = EFFECTS.find((e) => e.key === form.effectKey)?.category === category
    update({ category, effectKey: keep ? form.effectKey : EFFECTS.find((e) => e.category === category)!.key })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate(form)
    setShowErrors(true)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    save.mutate(
      { id: task?.id, input: inputFromForm(form) },
      {
        onSuccess: (saved) => navigate(task ? '/tasks' : `/tasks/${saved.id}`, { replace: !task }),
        onError: (e) => {
          if (e instanceof ApiError && e.problem.errors) {
            setErrors(Object.fromEntries(e.problem.errors.map((fe) => [fe.field, fe.message])))
          }
        },
      },
    )
  }

  const onArchive = () => {
    if (!task || !window.confirm(`Archive "${task.name}"? It disappears from today and the character; its history stays.`)) return
    archive.mutate(task.id, { onSuccess: () => navigate('/tasks') })
  }

  const err = (field: string) => errors[field]
  const scheduleError = err('schedule') ?? err('schedule.slots') ?? err('schedule.thresholdsDays')
  const archived = task !== undefined && !task.active

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/tasks" className="text-sm text-label-2 hover:text-label">
          ← Habits
        </Link>
        <h2 className="ml-auto text-lg font-bold">{task ? 'Edit habit' : 'New habit'}</h2>
      </div>

      {archived && (
        <p className="rounded-xl bg-fill-2 px-3 py-2 text-sm">This habit is archived and can't be edited.</p>
      )}

      <fieldset disabled={archived} className="space-y-5">
        <Field id="name" label="Name" error={err('name')}>
          <input
            id="name"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Brush teeth"
            maxLength={100}
            className={inputClass}
            aria-invalid={Boolean(err('name'))}
            aria-describedby={err('name') ? 'name-error' : undefined}
          />
        </Field>

        <div className="space-y-2">
          <span className="block text-sm font-semibold">Affects your</span>
          <Segmented<Category>
            label="Category"
            value={form.category}
            onChange={setCategory}
            options={[
              { value: 'PHYSICAL', label: 'Body & room' },
              { value: 'MENTAL', label: 'Mind' },
            ]}
          />
          <div role="radiogroup" aria-label="Effect" className="grid grid-cols-2 gap-2">
            {EFFECTS.filter((e) => e.category === form.category).map((effect) => (
              <button
                key={effect.key}
                type="button"
                role="radio"
                aria-checked={form.effectKey === effect.key}
                onClick={() => update({ effectKey: effect.key })}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm ${form.effectKey === effect.key ? 'border-label bg-card font-semibold' : 'border-sep bg-card/60'}`}
              >
                <span className="text-xl" aria-hidden>
                  {effectEmoji[effect.key]}
                </span>
                {effect.label}
              </button>
            ))}
          </div>
          {err('effectKey') && <p className="text-xs font-semibold text-danger">{err('effectKey')}</p>}
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-semibold">How often</span>
          <div role="radiogroup" aria-label="Habit type" className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_INFO) as TaskType[]).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={form.type === type}
                onClick={() => update({ type })}
                className={`rounded-xl border-2 px-3 py-2 text-left ${form.type === type ? 'border-label bg-card' : 'border-sep bg-card/60'}`}
              >
                <span className="block text-sm font-semibold">{TYPE_INFO[type].title}</span>
                <span className="block text-xs text-label-2">{TYPE_INFO[type].blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="space-y-4 rounded-2xl border-2 border-sep bg-card/60 p-4" aria-label="Schedule">
          {scheduleError && <p className="text-sm font-semibold text-danger">{scheduleError}</p>}
          <ScheduleFields form={form} update={update} err={err} />
        </section>
      </fieldset>

      <section className="space-y-3">
        <h3 className="font-bold">What happens when it slips</h3>
        <SeverityLadder effectKey={form.effectKey} />
      </section>

      <section className="space-y-3">
        <h3 className="font-bold">Live preview</h3>
        {task && task.active ? (
          <TimePreview taskId={task.id} dirty={dirty} />
        ) : (
          <p className="text-sm text-label-2">Save the habit to preview how you'll look at any time in the next two days.</p>
        )}
      </section>

      {save.error && !(save.error instanceof ApiError && save.error.problem.errors) && (
        <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
          {save.error.message}
        </p>
      )}

      {!archived && (
        <div className="sticky bottom-3 flex gap-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="flex-1 rounded-xl border-2 border-label bg-lime-300 py-3 font-bold text-stone-950 shadow-[0_3px_0_#292524] active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : task ? 'Save changes' : 'Create habit'}
          </button>
          {task && (
            <button
              type="button"
              onClick={onArchive}
              disabled={archive.isPending}
              className="rounded-xl border-2 border-sep bg-card px-4 font-semibold text-label-2 hover:border-danger hover:text-danger"
            >
              Archive
            </button>
          )}
        </div>
      )}
    </form>
  )
}

function ScheduleFields({
  form,
  update,
  err,
}: {
  form: TaskForm
  update: (patch: Partial<TaskForm>) => void
  err: (field: string) => string | undefined
}) {
  switch (form.type) {
    case 'CHECK': {
      const check = form.check
      const toggleDay = (day: DayCode) =>
        update({ check: { ...check, days: check.days.includes(day) ? check.days.filter((d) => d !== day) : [...check.days, day] } })
      return (
        <>
          <Field id="deadline" label="Done by" error={err('schedule.deadline')}>
            <TimeInput id="deadline" value={check.deadline} error={err('schedule.deadline')} onChange={(deadline) => update({ check: { ...check, deadline } })} />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-semibold">On which days</span>
            <div className="flex gap-1" role="group" aria-label="Days">
              {DAY_CODES.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={check.days.includes(day)}
                  onClick={() => toggleDay(day)}
                  className={`flex-1 rounded-lg border-2 py-1.5 text-xs font-bold ${check.days.includes(day) ? 'border-label bg-label text-app' : 'border-sep bg-card text-label-2'}`}
                >
                  {day.slice(0, 2)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-label-2">{check.days.length === 0 ? 'None selected = every day' : `${check.days.length} day(s) a week`}</p>
          </div>
          <Field id="dueSoon" label="Warn me before the deadline (minutes)" error={err('schedule.dueSoonMinutes')}>
            <NumberInput id="dueSoon" value={check.dueSoonMinutes} min={0} max={720} error={err('schedule.dueSoonMinutes')} onChange={(dueSoonMinutes) => update({ check: { ...check, dueSoonMinutes } })} />
          </Field>
        </>
      )
    }
    case 'METER': {
      const meter = form.meter
      const setMeter = (patch: Partial<TaskForm['meter']>) => update({ meter: { ...meter, ...patch } })
      return (
        <>
          <Segmented
            label="Meter style"
            value={form.meterMode}
            onChange={(meterMode) => update({ meterMode })}
            options={[
              { value: 'slots', label: 'Specific times' },
              { value: 'count', label: 'N times, spaced out' },
            ]}
          />
          {form.meterMode === 'slots' ? (
            <div className="space-y-2">
              {meter.slots.map((slot, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field id={`slot-${i}`} label={`Time ${i + 1}: done by`} error={err(`schedule.slots[${i}].by`)}>
                      <TimeInput
                        id={`slot-${i}`}
                        value={slot}
                        error={err(`schedule.slots[${i}].by`)}
                        onChange={(by) => setMeter({ slots: meter.slots.map((s, j) => (j === i ? by : s)) })}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMeter({ slots: meter.slots.filter((_, j) => j !== i) })}
                    disabled={meter.slots.length <= 1}
                    aria-label={`Remove time ${i + 1}`}
                    className="mb-0.5 rounded-xl border-2 border-sep bg-card px-3 py-2 text-label-2 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMeter({ slots: [...meter.slots, meter.slots.at(-1) ?? '12:00'] })}
                disabled={meter.slots.length >= 12}
                className="text-sm font-semibold text-label underline disabled:opacity-40"
              >
                + Add a time
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field id="count" label="Times a day" error={err('schedule.count')}>
                <NumberInput id="count" value={meter.count} min={1} max={12} error={err('schedule.count')} onChange={(count) => setMeter({ count })} />
              </Field>
              <Field id="firstBy" label="First one by" error={err('schedule.firstBy')}>
                <TimeInput id="firstBy" value={meter.firstBy} error={err('schedule.firstBy')} onChange={(firstBy) => setMeter({ firstBy })} />
              </Field>
              {meter.count > 1 && (
                <Field id="lastBy" label="Last one by" error={err('schedule.lastBy')}>
                  <TimeInput id="lastBy" value={meter.lastBy} error={err('schedule.lastBy')} onChange={(lastBy) => setMeter({ lastBy })} />
                </Field>
              )}
            </div>
          )}
          <Field
            id="minGap"
            label="Minimum gap between them (minutes)"
            hint="Taps closer together than this count once. 0 = no minimum."
            error={err('schedule.minGapMinutes')}
          >
            <NumberInput id="minGap" value={meter.minGapMinutes} min={0} max={720} error={err('schedule.minGapMinutes')} onChange={(minGapMinutes) => setMeter({ minGapMinutes })} />
          </Field>
        </>
      )
    }
    case 'QUOTA': {
      const quota = form.quota
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field id="timesPerWeek" label="Times per week" error={err('schedule.timesPerWeek')}>
            <NumberInput id="timesPerWeek" value={quota.timesPerWeek} min={1} max={7} error={err('schedule.timesPerWeek')} onChange={(timesPerWeek) => update({ quota: { ...quota, timesPerWeek } })} />
          </Field>
          <Field id="weekStarts" label="Week starts on">
            <select
              id="weekStarts"
              value={quota.weekStarts}
              onChange={(e) => update({ quota: { ...quota, weekStarts: e.target.value as DayCode } })}
              className={inputClass}
            >
              {DAY_CODES.map((day) => (
                <option key={day} value={day}>
                  {day[0] + day.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )
    }
    case 'FRESHNESS': {
      const thresholds = form.freshness.thresholds
      const labels = ['A bit messy after', 'Messy after', 'Filthy after']
      return (
        <div className="grid grid-cols-3 gap-3">
          {thresholds.map((days, i) => (
            <Field key={i} id={`threshold-${i}`} label={`${labels[i]} (days)`}>
              <NumberInput
                id={`threshold-${i}`}
                value={days}
                min={1}
                max={365}
                error={err('schedule.thresholdsDays')}
                onChange={(value) => {
                  const next = [...thresholds] as [number, number, number]
                  next[i] = value
                  update({ freshness: { thresholds: next } })
                }}
              />
            </Field>
          ))}
        </div>
      )
    }
  }
}
