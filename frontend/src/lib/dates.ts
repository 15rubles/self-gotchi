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

/** "2026-10-01" for any date in October 2026. */
export const monthStart = (date: string): string => `${date.slice(0, 7)}-01`

/** First day of the month `months` away from the month of `date`. */
export function addMonths(date: string, months: number): string {
  const d = new Date(parseDate(monthStart(date)))
  d.setUTCMonth(d.getUTCMonth() + months)
  return toDate(d.getTime())
}

/** Last day of the month of `date`. */
export const monthEnd = (date: string): string => addDays(addMonths(date, 1), -1)

/** Milliseconds `zone` is ahead of UTC at `instant`. */
function zoneOffset(instant: number, zone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instant)
      .map((p) => [p.type, Number(p.value)]),
  )
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return wall - Math.floor(instant / 1000) * 1000
}

/**
 * The instant when a wall clock in `zone` shows `date` + `time` ("2026-10-18", "08:00"), whatever
 * the browser's own zone. Two passes settle the offset across a daylight-saving change.
 */
export function zonedInstant(date: string, time: string, zone: string): Date {
  const [h, m] = time.split(':').map(Number)
  const wall = parseDate(date) + (h * 60 + m) * 60_000
  const first = wall - zoneOffset(wall, zone)
  return new Date(wall - zoneOffset(first, zone))
}

/** "08:05": the wall-clock time of `instant` in `zone`. */
export function zonedTime(instant: Date, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant)
}
