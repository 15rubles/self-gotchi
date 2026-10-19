/**
 * iOS-style colors: `ring` is the system color (circles, icons), `text` the same hue as a CSS
 * variable from index.css: a darker shade in light mode, the iOS dark-mode shade in dark mode,
 * so titles and colored text stay readable on the card (≥ 4.5:1).
 */
export interface ListColor {
  ring: string
  text: string
}

export const LIST_COLORS = {
  orange: { ring: '#ff9500', text: 'var(--list-orange)' },
  red: { ring: '#ff3b30', text: 'var(--list-red)' },
  blue: { ring: '#007aff', text: 'var(--list-blue)' },
  green: { ring: '#34c759', text: 'var(--list-green)' },
  purple: { ring: '#af52de', text: 'var(--list-purple)' },
  gray: { ring: '#8e8e93', text: 'var(--list-gray)' },
  lightGray: { ring: '#c7c7cc', text: 'var(--list-gray)' },
} satisfies Record<string, ListColor>

/** The text part of a row: hairline divider that starts at the text, none after the last row. */
export const rowBodyClass = 'flex min-w-0 flex-1 items-center gap-2 border-b border-sep py-2.5 pr-3 group-last:border-b-0'


/** Inline value controls that sit at the right end of a form row (time, select). */
export const inlineControl = 'rounded-lg bg-fill px-2 py-1 text-[17px] text-label tabular-nums focus:outline-2 focus:outline-tint'
