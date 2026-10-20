import type { ActiveAvatar, Face, Pose } from '../../api/types'
import { placeholderManifest, type AssetManifest, type FrameKey, type HeadAnchor } from '../manifest'

// ---- generated frames (npm run avatar:generate) ------------------------------------------

interface GeneratedFile {
  avatarId: string
  styleVersion: number
  /** Missing in files from before the chibi style existed, which were all photos. */
  style?: 'photo' | 'chibi'
  poseAnchors: Partial<Record<Pose, HeadAnchor>>
  frames: Partial<Record<FrameKey, string>>
  blinks?: Partial<Record<Pose, string>>
}

const generatedJson = import.meta.glob('../../local-avatar/generated/avatar.json', { eager: true, import: 'default' })
// WebP only: older PNG/JPG frames may still sit next to their converted copies and would be bundled too.
const generatedImages = import.meta.glob('../../local-avatar/generated/*.webp', {
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
  const blinks = Object.fromEntries(
    Object.entries(file.blinks ?? {}).flatMap(([pose, name]) => {
      const url = name && urlOf(name)
      return url ? [[pose, url]] : []
    }),
  )
  return framesManifest(file.avatarId, file.styleVersion, file.style ?? 'photo', file.poseAnchors, frames, blinks)
}

/** A manifest of one image per pose + face, from frame URLs. Null without any frame. */
function framesManifest(
  avatarId: string,
  styleVersion: number,
  style: 'photo' | 'chibi',
  poseAnchors: Partial<Record<Pose, HeadAnchor>>,
  frames: Partial<Record<FrameKey, string>>,
  blinks: Partial<Record<Pose, string>>,
): AssetManifest | null {
  if (Object.keys(frames).length === 0) return null
  const neutral = (pose: Pose) => frames[`${pose}/NEUTRAL`] ?? frames['NORMAL/NEUTRAL'] ?? Object.values(frames)[0]!
  const faceKeys: Face[] = ['NEUTRAL', 'HAPPY', 'WORRIED', 'VERY_WORRIED', 'TIRED', 'EXHAUSTED']
  return {
    avatarId,
    styleVersion,
    headAnchor: poseAnchors.NORMAL ?? { x: 512, y: 330, scale: 0.7 },
    // The DESIGN.md fields stay meaningful: each pose's neutral frame, and the normal pose per face.
    poses: { NORMAL: neutral('NORMAL'), TIRED: neutral('TIRED'), EXHAUSTED: neutral('EXHAUSTED'), LAZY: neutral('LAZY') },
    faces: Object.fromEntries(faceKeys.map((f) => [f, frames[`NORMAL/${f}`] ?? neutral('NORMAL')])) as Record<Face, string>,
    frames,
    frameStyle: style,
    blinks,
    poseAnchors,
  }
}

/** The avatar drawn on the server from a photo (Settings -> Character). */
export function serverManifest(avatar: ActiveAvatar): AssetManifest | null {
  const anchors = Object.fromEntries(
    Object.entries(avatar.poseAnchors).map(([pose, a]) => [pose, { x: a.x, y: a.y, scale: a.scale, ...(a.belly ? { belly: a.belly } : {}) }]),
  ) as Partial<Record<Pose, HeadAnchor>>
  return framesManifest(`server-${avatar.id}`, avatar.styleVersion, avatar.style, anchors, avatar.frames as Partial<Record<FrameKey, string>>, avatar.blinks)
}

const generatedFile = Object.values(generatedJson)[0] as GeneratedFile | undefined

/** AI-generated frames of the user (chibi or photo), when `npm run avatar:generate` has been run. */
export const generatedManifest: AssetManifest | null = generatedFile ? buildGenerated(generatedFile) : null

/**
 * Generated frames when present, otherwise the illustrated (exaggerated chibi) placeholders.
 * The single-photo look is opt-in (/gallery?art=photo); the user preferred the drawn style.
 */
export const defaultManifest: AssetManifest = generatedManifest ?? placeholderManifest
