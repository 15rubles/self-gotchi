/** Flat colors with a thick outline, matching the locked chibi style in DESIGN.md. */
export const ink = '#3b2a20'
export const stroke = 10

export const palette = {
  skin: '#ffd9bd',
  skinShade: '#f2bf9c',
  blush: '#ff9fa0',
  hair: '#5a3825',
  hairShine: '#7a5238',
  shirt: '#7ec8e3',
  shirtShade: '#5fb0cf',
  pants: '#4a5a8a',
  shoes: '#3a3a44',
  white: '#ffffff',
  sweat: '#8fd3ff',
  wall: '#fbe8c8',
  wallShade: '#f3d9ad',
  floor: '#d9a877',
  floorShade: '#c99566',
  window: '#bfe6ff',
  couch: '#c7697a',
  couchShade: '#a9525f',
  plant: '#6cbf6c',
  pot: '#d77a4a',
  smell: '#9ccc65',
  smellDark: '#7cb342',
  trash: '#9e9e9e',
} as const

/** Shared outline props for filled shapes. */
export const outlined = { stroke: ink, strokeWidth: stroke, strokeLinejoin: 'round' as const }
