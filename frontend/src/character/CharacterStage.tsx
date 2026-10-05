import type { CSSProperties } from 'react'
import type { CharacterState, Effect } from '../api/types'
import { AssetImage } from './AssetImage'
import { CANVAS, FACE_SIZE, anchors, pickFrame, type AssetManifest } from './manifest'
import { CrossfadeImage } from './photo/CrossfadeImage'
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
 * Three kinds of manifest render here: layered art (a pose image plus a face image per state,
 * e.g. the illustrated placeholders), generated frames (one realistic image per pose + face,
 * cross-faded), and a single real photo with states as treatments and overlays. The realistic
 * kinds are their own room: mess, smell and icons are drawn over them.
 *
 * @param celebrateKey bump to play the completion sparkle + hop
 */
export function CharacterStage({
  state,
  manifest = defaultManifest,
  celebrateKey = 0,
  className = '',
  showAnchors = false,
}: {
  state: CharacterState
  manifest?: AssetManifest
  celebrateKey?: number
  className?: string
  /** Debug: draw the head/mouth/belly/thought anchors, for tuning a manifest. */
  showAnchors?: boolean
}) {
  const a = anchors(manifest, state.pose)
  const photo = manifest.photo
  const frame = pickFrame(manifest, state.pose, state.face)
  /** Real-photo look: a single photo with overlays, or generated frames. */
  const realistic = Boolean(photo || frame)
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
      {!realistic && <Room level={state.room} />}

      <div className={`absolute inset-0 ${realistic ? 'sg-breathe' : 'sg-bob'}`}>
        <div key={celebrateKey} className={`absolute inset-0 ${celebrateKey > 0 ? (realistic ? 'sg-hop-photo' : 'sg-hop') : ''}`}>
          <div className={`absolute inset-0 ${has('SLOUCH') ? (realistic ? 'sg-slouch-photo' : 'sg-slouch') : ''}`}>
            <div className={`absolute inset-0 ${photo ? `sg-photo-pose sg-photo-pose-${state.pose}` : ''}`}>
              <div className={`absolute inset-0 ${has('BELLY_GROWL') ? 'sg-growl-shake' : ''}`}>
                {/* 2. body pose (sweatpants = grey tint on the body layer) */}
                <div className={`absolute inset-0 transition-[filter] duration-700 ${has('SWEATPANTS') && !frame ? 'sg-sweatpants' : ''}`}>
                  {frame ? (
                    <CrossfadeImage src={frame} />
                  ) : photo ? (
                    <PhotoPose photo={photo} pose={state.pose} />
                  ) : (
                    <AssetImage url={manifest.poses[state.pose]} kind="pose" />
                  )}
                </div>
                {/* 3. face at the head anchor (generated frames already include it) */}
                <div className="absolute" style={faceBox}>
                  {frame ? null : photo ? (
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
                        (realistic ? (
                          <PhotoMouthSmell x={a.mouth.x} y={a.mouth.y} level={item.severity} />
                        ) : (
                          <MouthSmell x={a.mouth.x} y={a.mouth.y} level={item.severity} />
                        ))}
                      {item.key === 'BELLY_GROWL' &&
                        (realistic ? <PhotoBellyGrowl x={a.belly.x} y={a.belly.y} /> : <BellyGrowl x={a.belly.x} y={a.belly.y} />)}
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1b. a photo's mess sits on top of it, outside the body motion */}
      {realistic && <PhotoRoom level={state.room} />}

      {/* 5. thought icons */}
      <div className={`pointer-events-none absolute inset-0 ${realistic ? '' : 'sg-bob'}`}>
        <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full" aria-hidden>
          <ThoughtBubble icons={state.icons} overflow={state.iconOverflow} anchor={a.thought} head={a.head} photo={realistic} />
        </svg>
      </div>

      {showAnchors && <AnchorDots a={a} />}
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

function AnchorDots({ a }: { a: ReturnType<typeof anchors> }) {
  const dots = [
    ['head', a.head, '#22d3ee'],
    ['mouth', a.mouth, '#f43f5e'],
    ['belly', a.belly, '#f59e0b'],
    ['thought', a.thought, '#a3e635'],
  ] as const
  return (
    <svg viewBox="0 0 1024 1024" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <circle cx={a.head.x} cy={a.head.y} r={(FACE_SIZE * a.head.scale) / 2} fill="none" stroke="#22d3ee" strokeWidth={4} strokeDasharray="12 8" />
      {dots.map(([name, p, color]) => (
        <g key={name}>
          <circle cx={p.x} cy={p.y} r={12} fill={color} stroke="#000" strokeWidth={3} />
          <text x={p.x + 18} y={p.y + 8} fontSize={30} fontWeight={700} fill={color} stroke="#000" strokeWidth={5} paintOrder="stroke">
            {name}
          </text>
        </g>
      ))}
    </svg>
  )
}

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
