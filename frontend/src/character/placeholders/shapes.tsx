import { ink, stroke } from './palette'

/** A limb or thick line with the ink outline drawn underneath. */
export function Limb({ d, color, width }: { d: string; color: string; width: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={ink} strokeWidth={width + stroke * 2} />
      <path d={d} stroke={color} strokeWidth={width} />
    </g>
  )
}
