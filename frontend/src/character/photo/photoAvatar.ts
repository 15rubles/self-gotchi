import type { Face, Pose } from '../../api/types'
import { CANVAS, placeholderManifest, type AssetManifest, type FrameKey, type HeadAnchor, type Point } from '../manifest'

/**
 * Single-photo avatar: the user's own photo is the whole scene, and character states are shown
 * as treatments and overlays on it (no AI). The photo lives in the gitignored
 * `src/local-avatar/` folder; without one, the illustrated placeholders are used.
 */
const found = import.meta.glob('../../local-avatar/photo.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/**
 * Pixel measurements of the photo. Update these if you replace the photo:
 * open it in any image viewer and read off the eye centers and the middle of the mouth.
 */
const PHOTO = {
  width: 958,
  height: 1280,
  leftEye: { x: 370, y: 572 },
  rightEye: { x: 565, y: 572 },
  mouth: { x: 465, y: 770 },
}

/** Where the middle of the face should land on the 1024 canvas (a bit above center). */
const FACE_CENTER_Y = 480
/** anchors() puts the mouth 95 units below the head anchor at scale 1. */
const MOUTH_OFFSET_AT_SCALE_1 = 95

function buildManifest(src: string): AssetManifest {
  const k = CANVAS / PHOTO.width // photo spans the canvas width
  const faceCenter = {
    x: ((PHOTO.leftEye.x + PHOTO.rightEye.x) / 2) * k,
    y: ((PHOTO.leftEye.y + PHOTO.mouth.y) / 2) * k,
  }
  const height = PHOTO.height * k
  // Shift the photo so the face sits at FACE_CENTER_Y, but never leave a gap at the edges.
  const top = Math.min(0, Math.max(CANVAS - height, FACE_CENTER_Y - faceCenter.y))
  const anchor = { x: faceCenter.x, y: faceCenter.y + top }
  const scale = ((PHOTO.mouth.y - (PHOTO.leftEye.y + PHOTO.mouth.y) / 2) * k) / MOUTH_OFFSET_AT_SCALE_1

  // Landmarks in face units: the 440x440 face box centered on the anchor, divided by scale.
  const toFace = (p: { x: number; y: number }): Point => ({
    x: (p.x * k - anchor.x) / scale,
    y: (p.y * k + top - anchor.y) / scale,
  })

  return {
    avatarId: 'local-photo',
    styleVersion: 1,
    headAnchor: { x: Math.round(anchor.x), y: Math.round(anchor.y), scale },
    poses: { NORMAL: src, TIRED: src, EXHAUSTED: src, LAZY: src },
    faces: {
      NEUTRAL: 'overlay:face/NEUTRAL',
      HAPPY: 'overlay:face/HAPPY',
      WORRIED: 'overlay:face/WORRIED',
      VERY_WORRIED: 'overlay:face/VERY_WORRIED',
      TIRED: 'overlay:face/TIRED',
      EXHAUSTED: 'overlay:face/EXHAUSTED',
    },
    photo: {
      src,
      top,
      height,
      landmarks: { leftEye: toFace(PHOTO.leftEye), rightEye: toFace(PHOTO.rightEye), mouth: toFace(PHOTO.mouth) },
    },
  }
}

const src = Object.values(found)[0]

/** The local photo avatar, or null when no photo is present. */
export const photoManifest: AssetManifest | null = src ? buildManifest(src) : null

// ---- generated frames (npm run avatar:generate) ------------------------------------------

interface GeneratedFile {
  avatarId: string
  styleVersion: number
  poseAnchors: Partial<Record<Pose, HeadAnchor>>
  frames: Partial<Record<FrameKey, string>>
}

const generatedJson = import.meta.glob('../../local-avatar/generated/avatar.json', { eager: true, import: 'default' })
const generatedImages = import.meta.glob('../../local-avatar/generated/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function buildGenerated(file: GeneratedFile): AssetManifest | null {
  const urlOf = (name: string) =>
    Object.entries(generatedImages).find(([p]) => p.endsWith('/' + name))?.[1]
  const frames: Partial<Record<FrameKey, string>> = {}
  for (const [key, name] of Object.entries(file.frames)) {
    const url = name && urlOf(name)
    if (url) frames[key as FrameKey] = url
  }
  if (Object.keys(frames).length === 0) return null
  const neutral = (pose: Pose) => frames[`${pose}/NEUTRAL`] ?? frames['NORMAL/NEUTRAL'] ?? Object.values(frames)[0]!
  const faceKeys: Face[] = ['NEUTRAL', 'HAPPY', 'WORRIED', 'VERY_WORRIED', 'TIRED', 'EXHAUSTED']
  return {
    avatarId: file.avatarId,
    styleVersion: file.styleVersion,
    headAnchor: file.poseAnchors.NORMAL ?? { x: 512, y: 330, scale: 0.7 },
    // The DESIGN.md fields stay meaningful: each pose's neutral frame, and the normal pose per face.
    poses: { NORMAL: neutral('NORMAL'), TIRED: neutral('TIRED'), EXHAUSTED: neutral('EXHAUSTED'), LAZY: neutral('LAZY') },
    faces: Object.fromEntries(faceKeys.map((f) => [f, frames[`NORMAL/${f}`] ?? neutral('NORMAL')])) as Record<Face, string>,
    frames,
    poseAnchors: file.poseAnchors,
  }
}

const generatedFile = Object.values(generatedJson)[0] as GeneratedFile | undefined

/** AI-generated frames of the user, when `npm run avatar:generate` has been run. */
export const generatedManifest: AssetManifest | null = generatedFile ? buildGenerated(generatedFile) : null

/**
 * Generated frames when present, otherwise the illustrated (exaggerated chibi) placeholders.
 * The single-photo look is opt-in (/gallery?art=photo); the user preferred the drawn style.
 */
export const defaultManifest: AssetManifest = generatedManifest ?? placeholderManifest
