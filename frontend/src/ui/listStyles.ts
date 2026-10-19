/**
 * iOS-style colors: `ring` is the system color (circles, icons), `text` a darker shade of the
 * same hue so titles and colored text stay readable on white (≥ 4.5:1).
 */
export interface ListColor {
  ring: string
  text: string
}

export const LIST_COLORS = {
  orange: { ring: '#ff9500', text: '#c93400' },
  red: { ring: '#ff3b30', text: '#d70015' },
  blue: { ring: '#007aff', text: '#0063cc' },
  green: { ring: '#34c759', text: '#248a3d' },
  purple: { ring: '#af52de', text: '#8944ab' },
  gray: { ring: '#8e8e93', text: '#6c6c70' },
  lightGray: { ring: '#c7c7cc', text: '#6c6c70' },
} satisfies Record<string, ListColor>

/** The text part of a row: hairline divider that starts at the text, none after the last row. */
export const rowBodyClass = 'flex min-w-0 flex-1 items-center gap-2 border-b border-stone-200 py-2.5 pr-3 group-last:border-b-0'

