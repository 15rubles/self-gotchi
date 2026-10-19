import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { CharacterState, Face, Pose, RewardKey } from '../api/types'
import { CharacterStage } from '../character/CharacterStage'
import { placeholderManifest, type AssetManifest } from '../character/manifest'
import { defaultManifest } from '../character/photo/photoAvatar'

const base: CharacterState = {
  pose: 'NORMAL',
  face: 'NEUTRAL',
  room: 0,
  effects: [],
  icons: [],
  iconOverflow: 0,
  streakBonus: false,
}

const poses: Pose[] = ['NORMAL', 'TIRED', 'EXHAUSTED', 'LAZY']
const faces: Face[] = ['NEUTRAL', 'HAPPY', 'WORRIED', 'VERY_WORRIED', 'TIRED', 'EXHAUSTED']

const samples: { title: string; state: CharacterState; decorations?: RewardKey[] }[] = [
  ...poses.map((pose) => ({ title: `Pose ${pose}`, state: { ...base, pose } })),
  ...faces.map((face) => ({ title: `Face ${face}`, state: { ...base, face } })),
  ...[1, 2, 3].map((room) => ({ title: `Room level ${room}`, state: { ...base, room } })),
  ...[1, 2, 3].map((severity) => ({
    title: `Mouth smell ${severity}`,
    state: { ...base, effects: [{ key: 'MOUTH_SMELL' as const, severity }] },
  })),
  { title: 'Belly growl (hunger 1)', state: { ...base, effects: [{ key: 'BELLY_GROWL', severity: 1 }] } },
  { title: 'Slouch (workout 1)', state: { ...base, effects: [{ key: 'SLOUCH', severity: 1 }] } },
  {
    title: 'Lazy + sweatpants (workout 3)',
    state: { ...base, pose: 'LAZY', effects: [{ key: 'SWEATPANTS', severity: 3 }] },
  },
  {
    title: 'Icons: lunchbox 1, book 3 (pulses)',
    state: {
      ...base,
      face: 'VERY_WORRIED',
      icons: [
        { key: 'BOOK', severity: 3, taskId: 2 },
        { key: 'LUNCHBOX', severity: 1, taskId: 1 },
      ],
    },
  },
  {
    title: 'Icons capped at 3, +2 overflow',
    state: {
      ...base,
      face: 'WORRIED',
      icons: [
        { key: 'BOOK', severity: 2, taskId: 1 },
        { key: 'LUNCHBOX', severity: 2, taskId: 2 },
        { key: 'GENERIC', severity: 2, taskId: 3 },
      ],
      iconOverflow: 2,
    },
  },
  { title: 'Happy + streak', state: { ...base, face: 'HAPPY', streakBonus: true } },
  { title: 'Room rewards: rug, lamp', state: base, decorations: ['RUG', 'LAMP'] },
  { title: 'Room rewards: all four', state: base, decorations: ['RUG', 'LAMP', 'STRING_LIGHTS', 'BIG_PLANT'] },
  { title: 'Room rewards on a messy day', state: { ...base, room: 2 }, decorations: ['RUG', 'LAMP', 'STRING_LIGHTS', 'BIG_PLANT'] },
  {
    title: 'Worst day',
    state: {
      pose: 'EXHAUSTED',
      face: 'EXHAUSTED',
      room: 3,
      effects: [
        { key: 'MOUTH_SMELL', severity: 3 },
        { key: 'BELLY_GROWL', severity: 3 },
        { key: 'SWEATPANTS', severity: 3 },
      ],
      icons: [
        { key: 'LUNCHBOX', severity: 3, taskId: 1 },
        { key: 'BOOK', severity: 3, taskId: 2 },
      ],
      iconOverflow: 0,
      streakBonus: false,
    },
  },
]

/**
 * Dev page: every layer and animation for the active art, no backend needed.
 * ?only=<text> filters, ?art=illustrated|photo switches art, ?anchors shows the overlay anchors.
 */
export function GalleryPage() {
  const [celebrate, setCelebrate] = useState(0)
  const [params] = useSearchParams()
  const only = params.get('only')?.toLowerCase()
  const art = params.get('art')
  const [photo, setPhoto] = useState<AssetManifest | null>(null)
  useEffect(() => {
    // Dev only: keeps the personal photo out of production bundles entirely.
    if (import.meta.env.DEV && art === 'photo') {
      void import('../character/photo/devPhoto').then((m) => setPhoto(m.photoManifest))
    }
  }, [art])
  const manifest = art === 'illustrated' ? placeholderManifest : art === 'photo' && photo ? photo : defaultManifest
  const showAnchors = params.has('anchors')
  const shown = only ? samples.filter((s) => s.title.toLowerCase().includes(only)) : samples
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Character states</h2>
        <button
          type="button"
          onClick={() => setCelebrate((k) => k + 1)}
          className="rounded-lg bg-lime-300 px-3 py-1 font-semibold text-stone-950"
        >
          Play completion
        </button>
      </div>
      <div className={`grid gap-3 ${shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {shown.map(({ title, state, decorations }) => (
          <figure key={title}>
            <CharacterStage state={state} decorations={decorations} manifest={manifest} celebrateKey={celebrate} showAnchors={showAnchors} className="!rounded-xl !border-2 !shadow-none" />
            <figcaption className="mt-1 text-center text-xs text-label-2">{title}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
