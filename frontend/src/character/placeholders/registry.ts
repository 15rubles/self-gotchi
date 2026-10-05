import type { Face, IconType, Pose } from '../../api/types'
import * as faces from './faces'
import * as icons from './icons'
import * as poses from './poses'

type Art = () => React.JSX.Element

/** Placeholder art by manifest variant name. */
export const poseComponents: Record<Pose, Art> = {
  NORMAL: poses.Normal,
  TIRED: poses.Tired,
  EXHAUSTED: poses.Exhausted,
  LAZY: poses.Lazy,
}

export const faceComponents: Record<Face, Art> = {
  NEUTRAL: faces.Neutral,
  HAPPY: faces.Happy,
  WORRIED: faces.Worried,
  VERY_WORRIED: faces.VeryWorried,
  TIRED: faces.Tired,
  EXHAUSTED: faces.Exhausted,
}

export const iconComponents: Record<IconType, Art> = {
  LUNCHBOX: icons.Lunchbox,
  BOOK: icons.Book,
  GENERIC: icons.Generic,
}
