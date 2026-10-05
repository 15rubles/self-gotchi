// Logical dates ("2026-10-05") from the API are plain calendar dates: handle them in UTC so
// the browser's own time zone can never shift them by a day.

const DAY_MS = 86_400_000

export const parseDate = (date: string): number => Date.parse(`${date}T00:00:00Z`)

export const toDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

export const addDays = (date: string, days: number): string => toDate(parseDate(date) + days * DAY_MS)

/** 0 = Monday ... 6 = Sunday. */
export const weekdayIndex = (date: string): number => (new Date(parseDate(date)).getUTCDay() + 6) % 7

export const mondayOf = (date: string): string => addDays(date, -weekdayIndex(date))

export const daysBetween = (from: string, to: string): number => Math.round((parseDate(to) - parseDate(from)) / DAY_MS)

export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(parseDate(date))
}
