import type { DayResult } from '../api/types'

/**
 * Day results use the fixed status palette (dataviz reference: good / warning / serious /
 * critical), never categorical colors. Each also has a shape so color is never the only cue:
 * missed = slash, late = dot, partial = half fill, pending = dashed outline.
 */
export const RESULT_STYLE: Record<DayResult, { label: string; fill: string; ink: string }> = {
  ON_TIME: { label: 'Done on time', fill: '#0ca30c', ink: '#ffffff' },
  LATE: { label: 'Done late', fill: '#fab219', ink: '#3b2a20' },
  PARTIAL: { label: 'Partly done', fill: '#ec835a', ink: '#3b2a20' },
  MISSED: { label: 'Missed', fill: '#d03b3b', ink: '#ffffff' },
  PENDING: { label: 'Today, still open', fill: '#ffffff', ink: '#57534e' },
  OFF: { label: 'Not scheduled', fill: '#e7e5e4', ink: '#a8a29e' },
  NONE: { label: 'Nothing due', fill: '#f5f5f4', ink: '#d6d3d1' },
}

export const LEGEND_ORDER: DayResult[] = ['ON_TIME', 'LATE', 'PARTIAL', 'MISSED', 'PENDING', 'OFF']
