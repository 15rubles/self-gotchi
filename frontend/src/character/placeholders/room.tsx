import type { RewardKey } from '../../api/types'
import { art } from '../art'

/**
 * Where each room reward sits on the 1024x1024 canvas: near the edges and on the floor, never
 * over the character in the middle (the rug lies under its feet). Images keep their aspect
 * ratio and stand on the bottom of their box.
 */
const PLACEMENT: Record<RewardKey, { x: number; y: number; width: number; height: number }> = {
  RUG: { x: 262, y: 850, width: 500, height: 170 },
  STRING_LIGHTS: { x: 150, y: 8, width: 724, height: 190 },
  LAMP: { x: 195, y: 330, width: 150, height: 450 },
  BIG_PLANT: { x: -10, y: 470, width: 220, height: 400 },
}

// Back to front, so the plant stands in front of the lamp's base.
const ORDER: RewardKey[] = ['RUG', 'STRING_LIGHTS', 'LAMP', 'BIG_PLANT']

/** Shared room background, 4 cleanliness levels (0 clean .. 3 filthy), plus earned decorations. */
export function Room({ level, decorations = [] }: { level: number; decorations?: RewardKey[] }) {
  const l = Math.max(0, Math.min(3, level))
  return (
    <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full" aria-hidden>
      <image href={art.rooms[l]} x={0} y={0} width={1024} height={1024} preserveAspectRatio="xMidYMid slice" />
      {ORDER.filter((key) => decorations.includes(key)).map((key) => (
        <image key={key} className="sg-fade-in" href={art.decorations[key]} {...PLACEMENT[key]} preserveAspectRatio="xMidYMax meet" />
      ))}
    </svg>
  )
}
