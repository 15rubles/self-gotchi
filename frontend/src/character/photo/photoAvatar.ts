import type { Face, Pose } from '../../api/types'
import { placeholderManifest, type AssetManifest, type FrameKey, type HeadAnchor } from '../manifest'

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
