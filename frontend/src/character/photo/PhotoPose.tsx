import type { Pose } from '../../api/types'
import type { PhotoFrame } from '../manifest'

/**
 * Layer 2 for a photo avatar: the photo itself. Poses are photo treatments: color via the
 * `sg-photo-filter-*` classes here, slump/tilt via `sg-photo-pose-*` on the wrapper that also
 * carries the face overlays and effects, so everything moves together.
 */
export function PhotoPose({ photo, pose }: { photo: PhotoFrame; pose: Pose }) {
  return (
    <img
      src={photo.src}
      alt=""
      draggable={false}
      className={`sg-photo-filter-${pose} absolute left-0 w-full max-w-none select-none`}
      style={{ top: `${(photo.top / 1024) * 100}%`, height: `${(photo.height / 1024) * 100}%` }}
    />
  )
}
