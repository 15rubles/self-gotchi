import type { Face, Pose } from '../api/types'

/**
 * Personalized asset manifest, exactly the shape from DESIGN.md ("Asset manifest").
 * Phase 2 serves this from GET /avatar/manifest with signed image URLs; Phase 1 uses
 * {@link placeholderManifest}, whose `placeholder:` URLs resolve to inline SVG components.
 */
export interface AssetManifest {
  avatarId: string
  styleVersion: number
  /** Center of the head on the 1024x1024 canvas; faces are drawn centered here. */
  headAnchor: { x: number; y: number; scale: number }
  poses: Record<Pose, string>
  faces: Record<Face, string>
}

/** All layers share one square coordinate system. */
export const CANVAS = 1024
/** Side of the square a face image covers at scale 1, in canvas units. */
export const FACE_SIZE = 440

export const placeholderManifest: AssetManifest = {
  avatarId: 'placeholder',
  styleVersion: 1,
  headAnchor: { x: 512, y: 330, scale: 1 },
  poses: {
    NORMAL: 'placeholder:pose/NORMAL',
    TIRED: 'placeholder:pose/TIRED',
    EXHAUSTED: 'placeholder:pose/EXHAUSTED',
    LAZY: 'placeholder:pose/LAZY',
  },
  faces: {
    NEUTRAL: 'placeholder:face/NEUTRAL',
    HAPPY: 'placeholder:face/HAPPY',
    WORRIED: 'placeholder:face/WORRIED',
    VERY_WORRIED: 'placeholder:face/VERY_WORRIED',
    TIRED: 'placeholder:face/TIRED',
    EXHAUSTED: 'placeholder:face/EXHAUSTED',
  },
}

/**
 * Where shared effects attach, derived from the head anchor so they follow any avatar.
 * Offsets are in canvas units at scale 1.
 */
export function anchors(manifest: AssetManifest) {
  const { x, y, scale } = manifest.headAnchor
  return {
    mouth: { x: x, y: y + 95 * scale },
    belly: { x: x, y: y + 330 * scale },
    thought: { x: x + 250 * scale, y: y - 200 * scale },
    head: { x, y, scale },
  }
}
