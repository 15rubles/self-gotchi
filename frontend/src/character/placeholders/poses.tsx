import { palette as c } from './palette'
import { outlined } from './palette'
import { Limb } from './shapes'

// Body poses on the 1024x1024 canvas, without a head: the face asset is drawn on top at the
// head anchor (512, 330), so every pose keeps its neck at the same spot.

function Neck() {
  return <rect x={487} y={460} width={50} height={60} rx={14} fill={c.skin} {...outlined} />
}

function Hand({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={26} fill={c.skin} {...outlined} />
}

function Shoe({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return <ellipse cx={x + (flip ? -10 : 10)} cy={y} rx={48} ry={26} fill={c.shoes} {...outlined} />
}

export function Normal() {
  return (
    <g>
      <Limb d="M 455 715 L 455 880" color={c.pants} width={74} />
      <Limb d="M 569 715 L 569 880" color={c.pants} width={74} />
      <Shoe x={450} y={900} flip />
      <Shoe x={574} y={900} />
      <Neck />
      <path d="M 400 520 Q 512 480 624 520 L 646 730 Q 512 750 378 730 Z" fill={c.shirt} {...outlined} />
      <path d="M 470 520 Q 512 560 554 520" fill="none" {...outlined} strokeWidth={8} />
      <Limb d="M 410 540 Q 370 620 362 700" color={c.shirt} width={56} />
      <Limb d="M 614 540 Q 654 620 662 700" color={c.shirt} width={56} />
      <Hand x={360} y={712} />
      <Hand x={664} y={712} />
    </g>
  )
}

export function Tired() {
  return (
    <g>
      <Limb d="M 455 720 Q 440 800 460 880" color={c.pants} width={74} />
      <Limb d="M 569 720 Q 584 800 564 880" color={c.pants} width={74} />
      <Shoe x={455} y={900} flip />
      <Shoe x={569} y={900} />
      <Neck />
      {/* rounder, hunched torso */}
      <path d="M 392 540 Q 512 500 632 540 Q 664 640 642 735 Q 512 760 382 735 Q 360 640 392 540 Z" fill={c.shirt} {...outlined} />
      {/* arms dangle low */}
      <Limb d="M 400 560 Q 372 680 372 790" color={c.shirt} width={52} />
      <Limb d="M 624 560 Q 652 680 652 790" color={c.shirt} width={52} />
      <Hand x={372} y={800} />
      <Hand x={652} y={800} />
    </g>
  )
}

export function Exhausted() {
  return (
    <g>
      {/* sitting on the floor, legs splayed forward */}
      <Limb d="M 450 730 Q 380 800 300 880" color={c.pants} width={78} />
      <Limb d="M 574 730 Q 644 800 724 880" color={c.pants} width={78} />
      <Shoe x={282} y={895} flip />
      <Shoe x={742} y={895} />
      <Neck />
      <path d="M 396 530 Q 512 500 628 530 Q 668 640 650 750 Q 512 780 374 750 Q 356 640 396 530 Z" fill={c.shirtShade} {...outlined} />
      {/* arms limp on the floor */}
      <Limb d="M 404 560 Q 340 660 300 760" color={c.shirtShade} width={52} />
      <Limb d="M 620 560 Q 684 660 724 760" color={c.shirtShade} width={52} />
      <Hand x={294} y={772} />
      <Hand x={730} y={772} />
    </g>
  )
}

export function Lazy() {
  return (
    <g>
      {/* couch */}
      <rect x={212} y={520} width={600} height={260} rx={60} fill={c.couchShade} {...outlined} />
      <rect x={180} y={720} width={664} height={130} rx={40} fill={c.couch} {...outlined} />
      <rect x={160} y={640} width={110} height={220} rx={45} fill={c.couch} {...outlined} />
      <rect x={754} y={640} width={110} height={220} rx={45} fill={c.couch} {...outlined} />
      <rect x={230} y={850} width={30} height={50} fill={c.couchShade} {...outlined} />
      <rect x={764} y={850} width={30} height={50} fill={c.couchShade} {...outlined} />
      {/* slumped body, legs over the seat edge */}
      <Limb d="M 455 735 L 440 800 L 430 905" color={c.pants} width={74} />
      <Limb d="M 569 735 L 600 800 L 620 905" color={c.pants} width={74} />
      <Shoe x={420} y={920} flip />
      <Shoe x={630} y={920} />
      <Neck />
      <path d="M 396 525 Q 512 490 628 525 L 650 745 Q 512 770 374 745 Z" fill={c.shirt} {...outlined} />
      {/* one arm on the couch arm, one holding a phone */}
      <Limb d="M 404 545 Q 320 600 250 660" color={c.shirt} width={52} />
      <Hand x={244} y={668} />
      <Limb d="M 620 545 Q 640 610 580 640" color={c.shirt} width={52} />
      <rect x={530} y={590} width={44} height={74} rx={8} fill="#222" {...outlined} strokeWidth={6} />
      <rect x={537} y={598} width={30} height={50} rx={4} fill="#9fd8ff" />
      <Hand x={572} y={646} />
    </g>
  )
}
