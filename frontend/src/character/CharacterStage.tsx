import type { CSSProperties } from 'react'
import type { CharacterState, Effect } from '../api/types'
import { AssetImage } from './AssetImage'
import { CANVAS, FACE_SIZE, anchors, type AssetManifest } from './manifest'
import { FaceOverlay } from './photo/FaceOverlay'
import { PhotoBellyGrowl, PhotoMouthSmell, PhotoRoom } from './photo/PhotoEffects'
import { PhotoPose } from './photo/PhotoPose'
import { defaultManifest } from './photo/photoAvatar'
import { BellyGrowl, MouthSmell, Sparkles } from './placeholders/effects'
import { Room } from './placeholders/room'
import { ThoughtBubble } from './ThoughtBubble'
import { useFadeOut } from './useFadeOut'
import './animations.css'

const pct = (units: number) => `${(units / CANVAS) * 100}%`

/**
 * The character as five stacked layers on one square canvas (DESIGN.md "Character state model"):
 * 1 room, 2 body pose, 3 face at the head anchor, 4 body effects, 5 thought icons.
 *
 * Two kinds of manifest render here: layered art (a pose image plus a face image per state,
 * e.g. the illustrated placeholders or Phase 2 AI assets) and a single real photo, where the
 * photo is the scene and states become photo treatments and realistic overlays.
 *
 * @param celebrateKey bump to play the completion sparkle + hop
 */
export function CharacterStage({
  state,
  manifest = defaultManifest,
  celebrateKey = 0,
  className = '',
}: {
  state: CharacterState
  manifest?: AssetManifest
  celebrateKey?: number
  className?: string
}) {
  const a = anchors(manifest)
  const photo = manifest.photo
  const has = (key: Effect['key']) => state.effects.some((e) => e.key === key)
  const effects = useFadeOut(
    state.effects.filter((e) => e.key === 'MOUTH_SMELL' || e.key === 'BELLY_GROWL'),
    effectKey,
  )
  const faceSize = FACE_SIZE * a.head.scale
  const faceBox: CSSProperties = {
    left: pct(a.head.x - faceSize / 2),
    top: pct(a.head.y - faceSize / 2),
    width: pct(faceSize),
    height: pct(faceSize),
  }

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-3xl border-4 border-stone-800 bg-stone-900 shadow-[0_6px_0_#292524] ${className}`}
      role="img"
      aria-label={describe(state)}
    >
      {/* 1. room (layered art draws it behind; a photo is its own room, grime goes on top below) */}
      {!photo && <Room level={state.room} />}

      <div className={`absolute inset-0 ${photo ? 'sg-breathe' : 'sg-bob'}`}>
        <div key={celebrateKey} className={`absolute inset-0 ${celebrateKey > 0 ? (photo ? 'sg-hop-photo' : 'sg-hop') : ''}`}>
          <div className={`absolute inset-0 ${has('SLOUCH') ? (photo ? 'sg-slouch-photo' : 'sg-slouch') : ''}`}>
            <div className={`absolute inset-0 ${photo ? `sg-photo-pose sg-photo-pose-${state.pose}` : ''}`}>
              <div className={`absolute inset-0 ${has('BELLY_GROWL') ? 'sg-growl-shake' : ''}`}>
                {/* 2. body pose (sweatpants = grey tint on the body layer) */}
                <div className={`absolute inset-0 transition-[filter] duration-700 ${has('SWEATPANTS') ? 'sg-sweatpants' : ''}`}>
                  {photo ? (
                    <PhotoPose photo={photo} pose={state.pose} />
                  ) : (
                    <AssetImage url={manifest.poses[state.pose]} kind="pose" />
                  )}
                </div>
                {/* 3. face at the head anchor */}
                <div className="absolute" style={faceBox}>
                  {photo ? (
                    <FaceOverlay face={state.face} landmarks={photo.landmarks} />
                  ) : (
                    <AssetImage url={manifest.faces[state.face]} kind="face" />
                  )}
                </div>
                {/* 4. body effects */}
                <svg viewBox="0 0 1024 1024" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                  {effects.map(({ item, leaving }) => (
                    <g key={item.key} className={leaving ? 'sg-fade-out' : 'sg-fade-in'}>
                      {item.key === 'MOUTH_SMELL' &&
                        (photo ? (
                          <PhotoMouthSmell x={a.mouth.x} y={a.mouth.y} level={item.severity} />
                        ) : (
                          <MouthSmell x={a.mouth.x} y={a.mouth.y} level={item.severity} />
                        ))}
                      {item.key === 'BELLY_GROWL' &&
                        (photo ? <PhotoBellyGrowl x={a.belly.x} y={a.belly.y} /> : <BellyGrowl x={a.belly.x} y={a.belly.y} />)}
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1b. a photo's mess sits on top of it, outside the body motion */}
      {photo && <PhotoRoom level={state.room} />}

      {/* 5. thought icons */}
      <div className={`pointer-events-none absolute inset-0 ${photo ? '' : 'sg-bob'}`}>
        <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full" aria-hidden>
          <ThoughtBubble icons={state.icons} overflow={state.iconOverflow} anchor={a.thought} head={a.head} photo={!!photo} />
        </svg>
      </div>

      {state.streakBonus && <div className="sg-happy-glow pointer-events-none absolute inset-0" aria-hidden />}
      {celebrateKey > 0 && (
        <svg key={`sparkle-${celebrateKey}`} viewBox="0 0 1024 1024" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <Sparkles x={a.head.x} y={a.head.y + 120} />
        </svg>
      )}
    </div>
  )
}

const effectKey = (e: Effect) => e.key

const poseText = { NORMAL: 'standing', TIRED: 'tired', EXHAUSTED: 'exhausted', LAZY: 'slumped and lazy' }
const faceText = {
  NEUTRAL: 'calm',
  HAPPY: 'happy',
  WORRIED: 'worried',
  VERY_WORRIED: 'very worried',
  TIRED: 'tired',
  EXHAUSTED: 'exhausted',
}
const roomText = ['clean', 'a bit messy', 'messy', 'filthy']

function describe(state: CharacterState): string {
  const parts = [`You look ${poseText[state.pose]} and ${faceText[state.face]}, in a ${roomText[state.room] ?? 'messy'} room`]
  for (const e of state.effects) {
    if (e.key === 'MOUTH_SMELL') parts.push(`bad breath level ${e.severity}`)
    if (e.key === 'BELLY_GROWL') parts.push('a growling stomach')
    if (e.key === 'SWEATPANTS') parts.push('in sweatpants')
  }
  if (state.icons.length > 0) {
    parts.push(`thinking about ${state.icons.length + state.iconOverflow} unfinished task(s)`)
  }
  return parts.join(', ') + '.'
}
