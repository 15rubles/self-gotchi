import type { EffectKey, TaskState } from '../api/types'

/** "21:30" in the user's time zone (not the browser's). */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso))
}

/** "Mon 5 Oct" in the user's time zone. */
export function formatDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(
    new Date(iso),
  )
}

export const effectEmoji: Record<EffectKey, string> = {
  MOUTH_SMELL: '🪥',
  HUNGER: '🍽️',
  MOTIVATION: '🏋️',
  ROOM: '🧹',
  LUNCHBOX: '🍱',
  BOOK: '📚',
  GENERIC: '📝',
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** One-line progress text for a task row. */
export function describeTask(task: TaskState, timeZone: string): string {
  if (task.status === 'OFF') return 'Not scheduled today'
  const due = task.dueAt ? formatTime(task.dueAt, timeZone) : null
  switch (task.type) {
    case 'CHECK':
      if (task.status === 'DONE') return 'Done for today'
      if (task.status === 'MISSED') return `Was due ${due}, still counts if you do it now`
      return `Due by ${due}`
    case 'METER':
      if (task.status === 'DONE') return `${task.done}/${task.target} today, all done`
      return `${task.done}/${task.target} today · next by ${due}`
    case 'QUOTA':
      return `${task.done}/${task.target} this week`
    case 'FRESHNESS': {
      if (task.status === 'DONE') return 'Done today'
      const days = task.daysSinceDone ?? 0
      if (days === 0) return 'Fresh'
      return `${plural(days, 'day')} since last time`
    }
  }
}

export function streakLabel(task: TaskState): string | null {
  if (task.streak < 2) return null
  return task.type === 'QUOTA' ? `${task.streak} wk` : `${task.streak} d`
}
