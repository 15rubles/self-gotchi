import type { Category, DayCode, EffectKey, Schedule, TaskDefinition, TaskInput, TaskType } from '../api/types'
import { formatDate } from '../lib/dates'
import { EFFECTS } from '../lib/effects'

/**
 * Editable form state. Keeps the values for every task type, so switching the type
 * picker back and forth doesn't lose what was typed.
 */
export interface TaskForm {
  name: string
  category: Category
  effectKey: EffectKey
  type: TaskType
  /** repeats = false: a one-time checkmark on `date` */
  check: { deadline: string; days: DayCode[]; dueSoonMinutes: number; repeats: boolean; date: string }
  meterMode: 'slots' | 'count'
  meter: { slots: string[]; count: number; minGapMinutes: number; firstBy: string; lastBy: string }
  quota: { timesPerWeek: number; weekStarts: DayCode }
  freshness: { thresholds: [number, number, number] }
}

export const emptyForm: TaskForm = {
  name: '',
  category: 'PHYSICAL',
  effectKey: 'MOUTH_SMELL',
  type: 'CHECK',
  check: { deadline: '21:00', days: [], dueSoonMinutes: 60, repeats: true, date: '' },
  meterMode: 'slots',
  meter: { slots: ['10:00', '23:30'], count: 3, minGapMinutes: 0, firstBy: '11:00', lastBy: '21:00' },
  quota: { timesPerWeek: 3, weekStarts: 'MON' },
  freshness: { thresholds: [3, 5, 7] },
}

export const TYPE_INFO: Record<TaskType, { title: string; blurb: string }> = {
  CHECK: { title: 'Checkmark', blurb: 'Done by a deadline: every day, on some weekdays, or once on a date' },
  METER: { title: 'Meter', blurb: 'Several times a day' },
  QUOTA: { title: 'Weekly quota', blurb: 'X times per week, judged on pace' },
  FRESHNESS: { title: 'Freshness', blurb: 'Every few days; gets worse the longer you wait' },
}

export function formFromTask(task: TaskDefinition): TaskForm {
  const form: TaskForm = structuredClone({ ...emptyForm, name: task.name, category: task.category, effectKey: task.effectKey, type: task.type })
  const s = task.schedule
  switch (s.type) {
    case 'CHECK':
      form.check = {
        deadline: s.deadline,
        days: s.days ?? [],
        dueSoonMinutes: s.dueSoonMinutes ?? 60,
        repeats: s.recurrence !== 'ONCE',
        date: s.date ?? '',
      }
      break
    case 'METER':
      if (s.slots && s.slots.length > 0) {
        form.meterMode = 'slots'
        form.meter.slots = s.slots.map((slot) => slot.by)
      } else {
        form.meterMode = 'count'
        form.meter.count = s.count ?? 1
        form.meter.firstBy = s.firstBy ?? '09:00'
        form.meter.lastBy = s.lastBy ?? s.firstBy ?? '21:00'
      }
      form.meter.minGapMinutes = s.minGapMinutes ?? 0
      break
    case 'QUOTA':
      form.quota = { timesPerWeek: s.timesPerWeek, weekStarts: s.weekStarts ?? 'MON' }
      break
    case 'FRESHNESS':
      form.freshness = { thresholds: [s.thresholdsDays[0], s.thresholdsDays[1], s.thresholdsDays[2]] }
      break
  }
  return form
}

export function scheduleFromForm(form: TaskForm): Schedule {
  switch (form.type) {
    case 'CHECK':
      return form.check.repeats
        ? { type: 'CHECK', recurrence: 'DAILY', days: form.check.days, deadline: form.check.deadline, dueSoonMinutes: form.check.dueSoonMinutes }
        : { type: 'CHECK', recurrence: 'ONCE', date: form.check.date, deadline: form.check.deadline, dueSoonMinutes: form.check.dueSoonMinutes }
    case 'METER':
      return form.meterMode === 'slots'
        ? { type: 'METER', slots: form.meter.slots.map((by) => ({ by })), minGapMinutes: form.meter.minGapMinutes }
        : {
            type: 'METER',
            count: form.meter.count,
            minGapMinutes: form.meter.minGapMinutes,
            firstBy: form.meter.firstBy,
            ...(form.meter.count > 1 ? { lastBy: form.meter.lastBy } : {}),
          }
    case 'QUOTA':
      return { type: 'QUOTA', timesPerWeek: form.quota.timesPerWeek, weekStarts: form.quota.weekStarts }
    case 'FRESHNESS':
      return { type: 'FRESHNESS', thresholdsDays: [...form.freshness.thresholds] }
  }
}

export function inputFromForm(form: TaskForm): TaskInput {
  return { name: form.name.trim(), category: form.category, effectKey: form.effectKey, schedule: scheduleFromForm(form) }
}

/** Errors keyed by the server's field paths (`name`, `schedule.deadline`, ...). */
export type FieldErrors = Record<string, string>

const TIME = /^\d{2}:\d{2}$/
const int = (n: number) => Number.isInteger(n)

/**
 * Quick checks mirroring the server, so most mistakes show before saving. The server stays
 * the authority (e.g. slot order relative to the day-reset hour) and its errors use the same keys.
 */
export function validate(form: TaskForm): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.name.trim()) errors.name = 'Give the habit a name'
  else if (form.name.trim().length > 100) errors.name = 'At most 100 characters'
  if (!EFFECTS.some((e) => e.key === form.effectKey && e.category === form.category)) {
    errors.effectKey = 'Pick an effect for this category'
  }
  switch (form.type) {
    case 'CHECK':
      if (!TIME.test(form.check.deadline)) errors['schedule.deadline'] = 'Pick a time'
      if (!form.check.repeats && !/^d{4}-d{2}-d{2}$/.test(form.check.date)) errors['schedule.date'] = 'Pick a date'
      if (!int(form.check.dueSoonMinutes) || form.check.dueSoonMinutes < 0 || form.check.dueSoonMinutes > 720) {
        errors['schedule.dueSoonMinutes'] = '0 to 720 minutes'
      }
      break
    case 'METER':
      if (form.meterMode === 'slots') {
        if (form.meter.slots.length === 0) errors['schedule.slots'] = 'Add at least one time'
        if (form.meter.slots.length > 12) errors['schedule.slots'] = 'At most 12 times'
        form.meter.slots.forEach((slot, i) => {
          if (!TIME.test(slot)) errors[`schedule.slots[${i}].by`] = 'Pick a time'
        })
      } else {
        if (!int(form.meter.count) || form.meter.count < 1 || form.meter.count > 12) errors['schedule.count'] = '1 to 12 times'
        if (!TIME.test(form.meter.firstBy)) errors['schedule.firstBy'] = 'Pick a time'
        if (form.meter.count > 1 && !TIME.test(form.meter.lastBy)) errors['schedule.lastBy'] = 'Pick a time'
      }
      if (!int(form.meter.minGapMinutes) || form.meter.minGapMinutes < 0 || form.meter.minGapMinutes > 720) {
        errors['schedule.minGapMinutes'] = '0 to 720 minutes'
      }
      break
    case 'QUOTA':
      if (!int(form.quota.timesPerWeek) || form.quota.timesPerWeek < 1 || form.quota.timesPerWeek > 7) {
        errors['schedule.timesPerWeek'] = '1 to 7 times'
      }
      break
    case 'FRESHNESS': {
      const [a, b, c] = form.freshness.thresholds
      if (![a, b, c].every((n) => int(n) && n >= 1 && n <= 365) || !(a < b && b < c)) {
        errors['schedule.thresholdsDays'] = 'Three increasing numbers of days, e.g. 3, 5, 7'
      }
      break
    }
  }
  return errors
}

/** One-line summary of a schedule, for the task list. */
export function describeSchedule(s: Schedule): string {
  switch (s.type) {
    case 'CHECK': {
      if (s.recurrence === 'ONCE' && s.date) return `Once on ${formatDate(s.date)} by ${s.deadline}`
      const days = s.days && s.days.length > 0 && s.days.length < 7 ? ` on ${s.days.map(cap).join(', ')}` : ' every day'
      return `By ${s.deadline}${days}`
    }
    case 'METER':
      if (s.slots && s.slots.length > 0) return `${s.slots.length}× a day: by ${s.slots.map((x) => x.by).join(', ')}`
      return `${s.count}× a day, ${s.firstBy}${s.lastBy ? `–${s.lastBy}` : ''}${s.minGapMinutes ? `, ${s.minGapMinutes} min apart` : ''}`
    case 'QUOTA':
      return `${s.timesPerWeek}× per week`
    case 'FRESHNESS':
      return `Messy after ${s.thresholdsDays[0]} days, worse at ${s.thresholdsDays[1]} and ${s.thresholdsDays[2]}`
  }
}

const cap = (day: DayCode) => day[0] + day.slice(1).toLowerCase()
