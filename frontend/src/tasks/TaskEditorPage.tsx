import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useArchiveTask, useSaveTask, useTask } from '../api/hooks'
import { DAY_CODES, type Category, type DayCode, type TaskDefinition, type TaskType } from '../api/types'
import { EFFECTS } from '../lib/effects'
import { effectEmoji } from '../lib/format'
import { FormRow, InlineTime, RowIcon, Stepper } from '../ui/FormRows'
import { Card, Group } from '../ui/ListSection'
import { inlineControl, LIST_COLORS, rowBodyClass } from '../ui/listStyles'
import { SeverityLadder, TimePreview } from './EffectPreview'
import { Segmented } from './fields'
import { TYPE_INFO, emptyForm, formFromTask, inputFromForm, validate, type FieldErrors, type TaskForm } from './taskForm'
import { CheckIcon, MinusIcon, PlusIcon } from '../ui/Icons'

/** iOS system colors for the row icons. */
const ICON = { red: '#ff3b30', orange: '#ff9500', blue: '#007aff', green: '#34c759', purple: '#af52de', gray: '#8e8e93', indigo: '#5856d6' }

export function TaskEditorPage() {
  const { id } = useParams()
  const taskId = id === undefined ? undefined : Number(id)
  const { data: task, isPending, error } = useTask(taskId)

  if (taskId !== undefined && isPending) return <p className="p-8 text-center text-label-2">Loading…</p>
  if (taskId !== undefined && (error || !task)) {
    return (
      <p className="p-8 text-center text-label-2">
        Habit not found.{' '}
        <Link to="/tasks" className="text-tint">
          Back to habits
        </Link>
      </p>
    )
  }
  // Remount when switching tasks so the form starts from that task's values.
  return <Editor key={task?.id ?? 'new'} task={task} />
}

/**
 * Laid out like iOS Reminders' "New Reminder" sheet: Cancel / title / Add in a bar, then cards
 * of rows (icon, label, control on the right).
 */
function Editor({ task }: { task?: TaskDefinition }) {
  const navigate = useNavigate()
  // Opened from Home ("+ New habit" there passes returnTo): go back there afterwards.
  const returnTo = (useLocation().state as { returnTo?: string } | null)?.returnTo
  const back = returnTo?.startsWith('/') ? returnTo : undefined
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
        onSuccess: (saved) => navigate(back ?? (task ? '/tasks' : `/tasks/${saved.id}`), { replace: !task }),
        onError: (e) => {
          if (e instanceof ApiError && e.problem.errors) {
            setErrors(Object.fromEntries(e.problem.errors.map((fe) => [fe.field, fe.message])))
          }
        },
      },
    )
  }

  const onCancel = () => {
    if (dirty && !window.confirm('Discard your changes?')) return
    navigate(back ?? '/tasks')
  }

  const onArchive = () => {
    if (!task || !window.confirm(`Archive "${task.name}"? It disappears from today and the character; its history stays.`)) return
    archive.mutate(task.id, { onSuccess: () => navigate(back ?? '/tasks') })
  }

  const err = (field: string) => errors[field]
  const scheduleError = err('schedule') ?? err('schedule.slots') ?? err('schedule.thresholdsDays')
  const archived = task !== undefined && !task.active
  const categoryColor = form.category === 'PHYSICAL' ? LIST_COLORS.green.ring : LIST_COLORS.purple.ring

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex items-center bg-app/90 px-4 py-2 backdrop-blur">
        <button type="button" onClick={onCancel} className="text-[17px] text-tint">
          Cancel
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold">{task ? 'Details' : 'New Habit'}</h2>
        <button type="submit" disabled={archived || save.isPending || !form.name.trim()} className="text-[17px] font-semibold text-tint disabled:text-label-3">
          {save.isPending ? 'Saving…' : task ? 'Done' : 'Add'}
        </button>
      </div>

      {archived && <Card className="px-4 py-3 text-[15px] text-label-2">This habit is archived and can't be edited.</Card>}

      <fieldset disabled={archived} className="space-y-6">
        <div>
          <Card>
            <input
              id="name"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Title"
              maxLength={100}
              autoFocus={!task}
              aria-label="Name"
              aria-invalid={Boolean(err('name'))}
              aria-describedby={err('name') ? 'name-error' : undefined}
              className="w-full bg-transparent px-4 py-3 text-[17px] placeholder:text-label-3 focus:outline-none"
            />
          </Card>
          {err('name') && (
            <p id="name-error" className="mt-1.5 px-4 text-[13px] font-semibold text-danger">
              {err('name')}
            </p>
          )}
        </div>

        <Group footer={scheduleError ? <span className="font-semibold text-danger">{scheduleError}</span> : TYPE_INFO[form.type].blurb}>
          <FormRow icon={<RowIcon emoji="🔁" color={ICON.red} />} label="Repeats" htmlFor="type">
            <select id="type" value={form.type} onChange={(e) => update({ type: e.target.value as TaskType })} className={`${inlineControl} cursor-pointer`}>
              {(Object.keys(TYPE_INFO) as TaskType[]).map((type) => (
                <option key={type} value={type}>
                  {TYPE_INFO[type].title}
                </option>
              ))}
            </select>
          </FormRow>
          <ScheduleRows form={form} update={update} err={err} />
        </Group>

        <Group title="Affects your" footer={err('effectKey') ? <span className="font-semibold text-danger">{err('effectKey')}</span> : undefined}>
          <li className="px-4 py-2.5">
            <Segmented<Category>
              label="Category"
              value={form.category}
              onChange={setCategory}
              options={[
                { value: 'PHYSICAL', label: 'Body & room' },
                { value: 'MENTAL', label: 'Mind' },
              ]}
            />
          </li>
          {EFFECTS.filter((e) => e.category === form.category).map((effect) => (
            <li key={effect.key} className="group">
              <button
                type="button"
                role="radio"
                aria-checked={form.effectKey === effect.key}
                onClick={() => update({ effectKey: effect.key })}
                className="flex w-full items-stretch pl-4 text-left hover:bg-fill active:bg-fill"
              >
                <span className="flex items-center pr-3">
                  <RowIcon emoji={effectEmoji[effect.key]} color={`${categoryColor}33`} />
                </span>
                <span className={rowBodyClass}>
                  <span className="flex-1 text-[17px]">{effect.label}</span>
                  {form.effectKey === effect.key && (
                    <CheckIcon size={20} strokeWidth={2.75} className="text-tint" />
                  )}
                </span>
              </button>
            </li>
          ))}
        </Group>
      </fieldset>

      <Group title="When it slips">
        <li className="p-3">
          <SeverityLadder effectKey={form.effectKey} />
        </li>
      </Group>

      <Group title="Live preview" footer={task && task.active ? undefined : "Save the habit to preview how you'll look at any time in the next two days."}>
        {task && task.active && (
          <li className="p-3">
            <TimePreview taskId={task.id} dirty={dirty} />
          </li>
        )}
      </Group>

      {save.error && !(save.error instanceof ApiError && save.error.problem.errors) && (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[15px] text-danger">
          {save.error.message}
        </p>
      )}

      {task && !archived && (
        <Group>
          <li>
            <button type="button" onClick={onArchive} disabled={archive.isPending} className="w-full px-4 py-3 text-center text-[17px] text-danger hover:bg-fill disabled:opacity-50">
              Archive Habit
            </button>
          </li>
        </Group>
      )}
    </form>
  )
}

/** The schedule as rows, depending on the habit type. Field paths match the server's errors. */
function ScheduleRows({
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
      const dayNames = check.days.length === 0 ? 'Every day' : DAY_CODES.filter((d) => check.days.includes(d)).map((d) => d[0] + d.slice(1, 3).toLowerCase()).join(', ')
      return (
        <>
          <FormRow icon={<RowIcon emoji="⏰" color={ICON.blue} />} label="Due by" htmlFor="deadline" error={err('schedule.deadline')} errorId="deadline-error">
            <InlineTime id="deadline" value={check.deadline} error={err('schedule.deadline')} onChange={(deadline) => update({ check: { ...check, deadline } })} />
          </FormRow>
          <FormRow icon={<RowIcon emoji="📅" color={ICON.red} />} label="Days">
            <span className="text-[17px] text-label-2">{dayNames}</span>
          </FormRow>
          <li className="flex justify-between gap-1 px-4 py-2.5" role="group" aria-label="Days">
            {DAY_CODES.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={check.days.includes(day)}
                aria-label={day[0] + day.slice(1).toLowerCase()}
                onClick={() => toggleDay(day)}
                className={`grid size-10 place-items-center rounded-full text-[13px] font-semibold ${check.days.includes(day) ? 'bg-tint text-white' : 'bg-fill text-label-2'}`}
              >
                {day[0] + day.slice(1, 2).toLowerCase()}
              </button>
            ))}
          </li>
          <FormRow icon={<RowIcon emoji="🔔" color={ICON.orange} />} label="Warn before" htmlFor="dueSoon" error={err('schedule.dueSoonMinutes')} errorId="dueSoon-error">
            <Stepper id="dueSoon" value={check.dueSoonMinutes} min={0} max={720} step={15} unit="min" error={err('schedule.dueSoonMinutes')} onChange={(dueSoonMinutes) => update({ check: { ...check, dueSoonMinutes } })} />
          </FormRow>
        </>
      )
    }
    case 'METER': {
      const meter = form.meter
      const setMeter = (patch: Partial<TaskForm['meter']>) => update({ meter: { ...meter, ...patch } })
      return (
        <>
          <li className="px-4 py-2.5">
            <Segmented
              label="Meter style"
              value={form.meterMode}
              onChange={(meterMode) => update({ meterMode })}
              options={[
                { value: 'slots', label: 'Specific times' },
                { value: 'count', label: 'N times, spaced' },
              ]}
            />
          </li>
          {form.meterMode === 'slots' ? (
            <>
              {meter.slots.map((slot, i) => (
                <FormRow
                  key={i}
                  icon={
                    <button
                      type="button"
                      onClick={() => setMeter({ slots: meter.slots.filter((_, j) => j !== i) })}
                      disabled={meter.slots.length <= 1}
                      aria-label={`Remove time ${i + 1}`}
                      className="grid size-[22px] place-items-center rounded-full bg-[#ff3b30] text-white disabled:opacity-30"
                    >
                      <MinusIcon size={14} strokeWidth={3} />
                    </button>
                  }
                  label={`Time ${i + 1}`}
                  htmlFor={`slot-${i}`}
                  error={err(`schedule.slots[${i}].by`)}
                  errorId={`slot-${i}-error`}
                >
                  <InlineTime
                    id={`slot-${i}`}
                    value={slot}
                    error={err(`schedule.slots[${i}].by`)}
                    onChange={(by) => setMeter({ slots: meter.slots.map((s, j) => (j === i ? by : s)) })}
                  />
                </FormRow>
              ))}
              {meter.slots.length < 12 && (
                <li className="group">
                  <button type="button" onClick={() => setMeter({ slots: [...meter.slots, meter.slots.at(-1) ?? '12:00'] })} className="flex w-full items-stretch pl-4 text-left hover:bg-fill">
                    <span className="flex items-center pr-3">
                      <span className="grid size-[22px] place-items-center rounded-full bg-[#34c759] text-white" aria-hidden>
                        <PlusIcon size={14} strokeWidth={3} />
                      </span>
                    </span>
                    <span className={`${rowBodyClass} text-[17px] text-tint`}>Add a time</span>
                  </button>
                </li>
              )}
            </>
          ) : (
            <>
              <FormRow icon={<RowIcon emoji="🔢" color={ICON.indigo} />} label="Times a day" htmlFor="count" error={err('schedule.count')} errorId="count-error">
                <Stepper id="count" value={meter.count} min={1} max={12} error={err('schedule.count')} onChange={(count) => setMeter({ count })} />
              </FormRow>
              <FormRow icon={<RowIcon emoji="🌅" color={ICON.orange} />} label="First one by" htmlFor="firstBy" error={err('schedule.firstBy')} errorId="firstBy-error">
                <InlineTime id="firstBy" value={meter.firstBy} error={err('schedule.firstBy')} onChange={(firstBy) => setMeter({ firstBy })} />
              </FormRow>
              {meter.count > 1 && (
                <FormRow icon={<RowIcon emoji="🌙" color={ICON.indigo} />} label="Last one by" htmlFor="lastBy" error={err('schedule.lastBy')} errorId="lastBy-error">
                  <InlineTime id="lastBy" value={meter.lastBy} error={err('schedule.lastBy')} onChange={(lastBy) => setMeter({ lastBy })} />
                </FormRow>
              )}
            </>
          )}
          <FormRow
            icon={<RowIcon emoji="⏳" color={ICON.gray} />}
            label="Min. gap"
            htmlFor="minGap"
            error={err('schedule.minGapMinutes')}
            errorId="minGap-error"
          >
            <Stepper id="minGap" value={meter.minGapMinutes} min={0} max={720} step={15} unit="min" error={err('schedule.minGapMinutes')} onChange={(minGapMinutes) => setMeter({ minGapMinutes })} />
          </FormRow>
        </>
      )
    }
    case 'QUOTA': {
      const quota = form.quota
      return (
        <>
          <FormRow icon={<RowIcon emoji="🏋️" color={ICON.green} />} label="Times per week" htmlFor="timesPerWeek" error={err('schedule.timesPerWeek')} errorId="timesPerWeek-error">
            <Stepper id="timesPerWeek" value={quota.timesPerWeek} min={1} max={7} error={err('schedule.timesPerWeek')} onChange={(timesPerWeek) => update({ quota: { ...quota, timesPerWeek } })} />
          </FormRow>
          <FormRow icon={<RowIcon emoji="📅" color={ICON.red} />} label="Week starts on" htmlFor="weekStarts">
            <select
              id="weekStarts"
              value={quota.weekStarts}
              onChange={(e) => update({ quota: { ...quota, weekStarts: e.target.value as DayCode } })}
              className={`${inlineControl} cursor-pointer`}
            >
              {DAY_CODES.map((day) => (
                <option key={day} value={day}>
                  {day[0] + day.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </FormRow>
        </>
      )
    }
    case 'FRESHNESS': {
      const thresholds = form.freshness.thresholds
      const rows = [
        { label: 'A bit messy after', emoji: '🧦', color: ICON.orange },
        { label: 'Messy after', emoji: '🍕', color: ICON.red },
        { label: 'Filthy after', emoji: '🗑️', color: ICON.gray },
      ]
      return (
        <>
          {thresholds.map((days, i) => (
            <FormRow key={i} icon={<RowIcon emoji={rows[i].emoji} color={rows[i].color} />} label={rows[i].label} htmlFor={`threshold-${i}`}>
              <Stepper
                id={`threshold-${i}`}
                value={days}
                min={1}
                max={365}
                unit="days"
                error={err('schedule.thresholdsDays')}
                onChange={(value) => {
                  const next = [...thresholds] as [number, number, number]
                  next[i] = value
                  update({ freshness: { thresholds: next } })
                }}
              />
            </FormRow>
          ))}
        </>
      )
    }
  }
}
