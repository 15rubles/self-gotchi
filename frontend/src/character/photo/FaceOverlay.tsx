import { useId } from 'react'
import type { Face } from '../../api/types'
import type { PhotoFrame } from '../manifest'

/**
 * Layer 3 for a photo avatar: the expression can't change on a single photo, so moods are
 * soft, realistic overlays at the real eye and mouth positions: under-eye shadows, pallor,
 * blush, sweat. Drawn in face units (440x440 box centered on the head anchor).
 */
export function FaceOverlay({ face, landmarks }: { face: Face; landmarks: PhotoFrame['landmarks'] }) {
  const id = useId().replace(/:/g, '')
  const { leftEye, rightEye, mouth } = landmarks
  const eyeGap = rightEye.x - leftEye.x
  const faceW = eyeGap * 1.45
  const faceH = (mouth.y - leftEye.y) * 2.4
  const faceCy = (leftEye.y + mouth.y) / 2

  const bags = (strength: number) =>
    [leftEye, rightEye].map((eye, i) => (
      <ellipse
        key={i}
        cx={eye.x}
        cy={eye.y + eyeGap * 0.24}
        rx={eyeGap * 0.34}
        ry={eyeGap * 0.16}
        fill={`url(#${id}-bags)`}
        opacity={strength}
        filter={`url(#${id}-soft)`}
        style={{ mixBlendMode: 'multiply' }}
      />
    ))

  const tint = (color: string, opacity: number, blend: 'color' | 'soft-light' | 'multiply' = 'color') => (
    <ellipse
      cx={(leftEye.x + rightEye.x) / 2}
      cy={faceCy}
      rx={faceW / 2}
      ry={faceH / 2}
      fill={color}
      opacity={opacity}
      filter={`url(#${id}-wide)`}
      style={{ mixBlendMode: blend }}
    />
  )

  const sweat = (x: number, y: number, size: number) => (
    <g transform={`translate(${x} ${y}) scale(${size})`} className="sg-sweat">
      <path d="M 0 -16 Q 11 0 9 8 Q 5 16 0 16 Q -5 16 -9 8 Q -11 0 0 -16 Z" fill={`url(#${id}-drop)`} />
      <ellipse cx={-3} cy={4} rx={2.5} ry={4} fill="#fff" opacity={0.85} />
    </g>
  )

  const temple = { x: rightEye.x + eyeGap * 0.55, y: rightEye.y - eyeGap * 0.45 }
  const blush = (opacity: number) =>
    [leftEye, rightEye].map((eye, i) => (
      <ellipse
        key={i}
        cx={eye.x + (i === 0 ? -1 : 1) * eyeGap * 0.12}
        cy={eye.y + eyeGap * 0.55}
        rx={eyeGap * 0.28}
        ry={eyeGap * 0.17}
        fill="#ff6f7d"
        opacity={opacity}
        filter={`url(#${id}-wide)`}
        style={{ mixBlendMode: 'multiply' }}
      />
    ))

  return (
    <svg viewBox="-220 -220 440 440" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={eyeGap * 0.07} />
        </filter>
        <filter id={`${id}-wide`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={eyeGap * 0.15} />
        </filter>
        <radialGradient id={`${id}-bags`}>
          <stop offset="0" stopColor="#4a2a3a" />
          <stop offset="1" stopColor="#4a2f3f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-drop`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#7fc4ff" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {face === 'HAPPY' && (
        <g>
          {blush(0.35)}
          {tint('#ffcf7a', 0.18, 'soft-light')}
        </g>
      )}
      {face === 'WORRIED' && (
        <g>
          {tint('#9fb7d9', 0.18)}
          {sweat(temple.x, temple.y, 1.3)}
        </g>
      )}
      {face === 'VERY_WORRIED' && (
        <g>
          {tint('#a9bfd9', 0.35)}
          {bags(0.35)}
          {sweat(temple.x, temple.y, 1.5)}
          {sweat(leftEye.x - eyeGap * 0.6, leftEye.y - eyeGap * 0.3, 1.1)}
          {sweat(temple.x - eyeGap * 0.2, temple.y - eyeGap * 0.45, 1)}
        </g>
      )}
      {face === 'TIRED' && (
        <g>
          {bags(0.6)}
          {tint('#b8a9a0', 0.2)}
        </g>
      )}
      {face === 'EXHAUSTED' && (
        <g>
          {bags(0.95)}
          {bags(0.35)}
          {tint('#c9cdd3', 0.4)}
          {sweat(temple.x, temple.y, 1.2)}
        </g>
      )}
    </svg>
  )
}
