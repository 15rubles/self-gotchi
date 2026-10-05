import type { Category, CharacterState, EffectKey, IconType } from '../api/types'

export interface EffectInfo {
  key: EffectKey
  category: Category
  label: string
  /** What severity 1, 2 and 3 look like (DESIGN.md "Task to visual mapping"). */
  levels: [string, string, string]
}

export const EFFECTS: EffectInfo[] = [
  { key: 'MOUTH_SMELL', category: 'PHYSICAL', label: 'Bad breath', levels: ['Faint smell', 'Green cloud', 'Cloud + flies'] },
  { key: 'HUNGER', category: 'PHYSICAL', label: 'Hunger / energy', levels: ['Belly growls', 'Tired', 'Exhausted'] },
  { key: 'MOTIVATION', category: 'PHYSICAL', label: 'Motivation', levels: ['Slouching', 'Lazy on the couch', 'Lazy + sweatpants'] },
  { key: 'ROOM', category: 'PHYSICAL', label: 'Room', levels: ['A few things on the floor', 'Messy', 'Filthy'] },
  { key: 'LUNCHBOX', category: 'MENTAL', label: 'Lunchbox thought', levels: ['Small thought', 'Worried', 'Very worried'] },
  { key: 'BOOK', category: 'MENTAL', label: 'Book thought', levels: ['Small thought', 'Worried', 'Very worried'] },
  { key: 'GENERIC', category: 'MENTAL', label: 'Note thought', levels: ['Small thought', 'Worried', 'Very worried'] },
]

export const effectInfo = (key: EffectKey): EffectInfo => EFFECTS.find((e) => e.key === key)!

const calm: CharacterState = {
  pose: 'NORMAL',
  face: 'NEUTRAL',
  room: 0,
  effects: [],
  icons: [],
  iconOverflow: 0,
  streakBonus: false,
}

const iconOf: Partial<Record<EffectKey, IconType>> = { LUNCHBOX: 'LUNCHBOX', BOOK: 'BOOK', GENERIC: 'GENERIC' }

/**
 * What one effect alone looks like at a severity, for the editor's illustration.
 * Mirrors the backend's LayerResolver for a single task; the real character always comes
 * from the engine (/state), this is only a picture of the possible outcomes.
 */
export function previewCharacter(key: EffectKey, severity: number): CharacterState {
  switch (key) {
    case 'MOUTH_SMELL':
      return { ...calm, effects: [{ key: 'MOUTH_SMELL', severity }] }
    case 'HUNGER':
      return {
        ...calm,
        pose: severity >= 3 ? 'EXHAUSTED' : severity === 2 ? 'TIRED' : 'NORMAL',
        face: severity >= 3 ? 'EXHAUSTED' : severity === 2 ? 'TIRED' : 'NEUTRAL',
        effects: [{ key: 'BELLY_GROWL', severity }],
      }
    case 'MOTIVATION':
      return {
        ...calm,
        pose: severity >= 2 ? 'LAZY' : 'NORMAL',
        effects: severity === 1 ? [{ key: 'SLOUCH', severity: 1 }] : severity === 3 ? [{ key: 'SWEATPANTS', severity: 3 }] : [],
      }
    case 'ROOM':
      return { ...calm, room: severity }
    default:
      return {
        ...calm,
        face: severity >= 3 ? 'VERY_WORRIED' : severity === 2 ? 'WORRIED' : 'NEUTRAL',
        icons: [{ key: iconOf[key] ?? 'GENERIC', severity, taskId: 0 }],
      }
  }
}
