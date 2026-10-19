import type { DayResult, HistoryTask } from '../api/types'

export interface Tone {
  label: string
  fill: string
  ink: string
  /** Text shown in the calendar cell next to the color, so color is never the only cue. */
  mark: string
  /** Dashed outline instead of a fill (a day that isn't over yet). */
  dashed?: boolean
}

/**
 * Day results use the fixed status palette (dataviz reference: good / warning / serious /
 * critical), never categorical colors.
 */
export const RESULT_STYLE: Record<DayResult, Tone> = {
  ON_TIME: { label: 'Done on time', fill: '#0ca30c', ink: '#ffffff', mark: '✓' },
  LATE: { label: 'Done late', fill: '#fab219', ink: '#3b2a20', mark: 'late' },
  PARTIAL: { label: 'Partly done', fill: '#ec835a', ink: '#3b2a20', mark: '½' },
  MISSED: { label: 'Missed', fill: '#d03b3b', ink: '#ffffff', mark: '✗' },
  PENDING: { label: 'Today, still open', fill: '#ffffff', ink: '#57534e', mark: '…', dashed: true },
  OFF: { label: 'Not scheduled', fill: '#e7e5e4', ink: '#a8a29e', mark: '–' },
  NONE: { label: 'Nothing due', fill: '#f5f5f4', ink: '#a8a29e', mark: '' },
}

export const LEGEND_ORDER: DayResult[] = ['ON_TIME', 'LATE', 'PARTIAL', 'MISSED', 'PENDING', 'OFF']

// ---- all habits on one day ------------------------------------------------------------------

export type SummaryLevel = 'ALL' | 'MOST' | 'SOME' | 'NONE_DONE' | 'OPEN' | 'NOTHING_DUE'

/** Same palette as the results, by how much of the day's habits got done. */
export const SUMMARY_STYLE: Record<SummaryLevel, Omit<Tone, 'mark'>> = {
  ALL: { label: 'All done', fill: RESULT_STYLE.ON_TIME.fill, ink: RESULT_STYLE.ON_TIME.ink },
  MOST: { label: 'Half or more done', fill: RESULT_STYLE.LATE.fill, ink: RESULT_STYLE.LATE.ink },
  SOME: { label: 'Less than half done', fill: RESULT_STYLE.PARTIAL.fill, ink: RESULT_STYLE.PARTIAL.ink },
  NONE_DONE: { label: 'Nothing done', fill: RESULT_STYLE.MISSED.fill, ink: RESULT_STYLE.MISSED.ink },
  OPEN: { label: 'Today, still open', fill: RESULT_STYLE.PENDING.fill, ink: RESULT_STYLE.PENDING.ink, dashed: true },
  NOTHING_DUE: { label: 'Nothing due', fill: RESULT_STYLE.NONE.fill, ink: RESULT_STYLE.NONE.ink },
}

export const SUMMARY_LEGEND: SummaryLevel[] = ['ALL', 'MOST', 'SOME', 'NONE_DONE', 'OPEN']

export interface DaySummary {
  done: number
  /** Habits that counted that day: done, partly done, missed or still open. */
  due: number
  level: SummaryLevel
}

const DONE: DayResult[] = ['ON_TIME', 'LATE']
const COUNTED: DayResult[] = ['ON_TIME', 'LATE', 'PARTIAL', 'MISSED', 'PENDING']

/**
 * Per-day totals across habits. Quota and freshness habits only report days they were done,
 * so they add to both sides on those days and don't count otherwise.
 */
export function summarize(tasks: HistoryTask[]): Map<string, DaySummary> {
  const byDate = new Map<string, { done: number; due: number; open: boolean }>()
  for (const task of tasks) {
    for (const day of task.days) {
      const entry = byDate.get(day.date) ?? { done: 0, due: 0, open: false }
      if (DONE.includes(day.result)) entry.done++
      if (COUNTED.includes(day.result)) entry.due++
      if (day.result === 'PENDING') entry.open = true
      byDate.set(day.date, entry)
    }
  }
  const summaries = new Map<string, DaySummary>()
  for (const [date, { done, due, open }] of byDate) {
    summaries.set(date, { done, due, level: levelOf(done, due, open) })
  }
  return summaries
}

function levelOf(done: number, due: number, open: boolean): SummaryLevel {
  if (due === 0) return 'NOTHING_DUE'
  if (done === due) return 'ALL'
  if (open) return 'OPEN'
  if (done === 0) return 'NONE_DONE'
  return done * 2 >= due ? 'MOST' : 'SOME'
}
