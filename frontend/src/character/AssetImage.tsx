import { faceComponents, poseComponents } from './placeholders/registry'
import type { Face, Pose } from '../api/types'

const PLACEHOLDER = 'placeholder:'

/**
 * Renders one personalized asset. `placeholder:pose/X` and `placeholder:face/X` resolve to
 * the inline SVG placeholders; anything else is treated as an image URL (the AI assets in
 * Phase 2), so swapping the manifest is all it takes to switch art.
 */
export function AssetImage({ url, kind }: { url: string; kind: 'pose' | 'face' }) {
  if (url.startsWith(PLACEHOLDER)) {
    const [, name] = url.slice(PLACEHOLDER.length).split('/')
    if (kind === 'pose') {
      const Pose = poseComponents[name as Pose]
      return (
        <svg viewBox="0 0 1024 1024" className="h-full w-full" aria-hidden>
          {Pose && <Pose />}
        </svg>
      )
    }
    const FaceArt = faceComponents[name as Face]
    return (
      <svg viewBox="-220 -220 440 440" className="h-full w-full overflow-visible" aria-hidden>
        {FaceArt && <FaceArt />}
      </svg>
    )
  }
  return <img src={url} alt="" draggable={false} className="h-full w-full select-none object-contain" />
}
