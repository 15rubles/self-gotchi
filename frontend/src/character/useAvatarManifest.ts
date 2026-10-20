import { useMemo } from 'react'
import { useAvatar } from '../api/hooks'
import type { AssetManifest } from './manifest'
import { defaultManifest, serverManifest } from './photo/photoAvatar'

/**
 * The art the character is drawn with: the avatar made in Settings (from the server) when there
 * is one, otherwise the build-time frames or the illustrated placeholders.
 */
export function useAvatarManifest(): AssetManifest {
  const active = useAvatar().data?.active
  return useMemo(() => (active && serverManifest(active)) || defaultManifest, [active])
}
