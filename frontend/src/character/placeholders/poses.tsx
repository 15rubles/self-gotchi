import { outlined, palette as c } from './palette'
import { Limb } from './shapes'

// Body poses on the 1024x1024 canvas, without a head: the face asset is drawn on top at the
// head anchor (512, 330), so every pose keeps its neck at the same spot.
// Poses are exaggerated on purpose: the energy level should read from across the room.

function Neck() {
  return <rect x={487} y={460} width={50} height={60} rx={14} fill={c.skin} {...outlined} />
}

function Hand({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={26} fill={c.skin} {...outlined} />
}

function Shoe({ x, y, flip = false, rotate = 0 }: { x: number; y: number; flip?: boolean; rotate?: number }) {
  return (
    <ellipse
      cx={x + (flip ? -10 : 10)}
      cy={y}
      rx={48}
      ry={26}
      fill={c.shoes}
      {...outlined}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    />
  )
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
      {/* knees buckling inward */}
      <Limb d="M 455 725 Q 500 800 450 885" color={c.pants} width={74} />
      <Limb d="M 569 725 Q 524 800 574 885" color={c.pants} width={74} />
      <Shoe x={440} y={905} flip rotate={-8} />
      <Shoe x={584} y={905} rotate={8} />
      <Neck />
      {/* heavily hunched, saggy torso */}
      <path d="M 380 545 Q 512 505 644 545 Q 690 650 652 745 Q 512 775 372 745 Q 334 650 380 545 Z" fill={c.shirtShade} {...outlined} />
      {/* arms dangle almost to the knees */}
      <Limb d="M 392 565 Q 350 700 352 840" color={c.shirtShade} width={52} />
      <Limb d="M 632 565 Q 674 700 672 840" color={c.shirtShade} width={52} />
      <Hand x={352} y={852} />
      <Hand x={672} y={852} />
    </g>
  )
}

export function Exhausted() {
  return (
    <g>
      {/* collapsed on the floor, a puddle of a person */}
      <ellipse cx={512} cy={900} rx={380} ry={60} fill="#000" opacity={0.15} />
      <Limb d="M 450 740 Q 340 830 210 900" color={c.pants} width={80} />
      <Limb d="M 574 740 Q 684 830 814 900" color={c.pants} width={80} />
      <Shoe x={186} y={910} flip rotate={-20} />
      <Shoe x={838} y={910} rotate={20} />
      <Neck />
      <path d="M 392 535 Q 512 505 632 535 Q 690 650 660 765 Q 512 800 364 765 Q 334 650 392 535 Z" fill={c.shirtShade} {...outlined} />
      {/* arms flopped flat on the floor */}
      <Limb d="M 400 565 Q 300 680 220 790" color={c.shirtShade} width={52} />
      <Limb d="M 624 565 Q 724 680 804 790" color={c.shirtShade} width={52} />
      <Hand x={210} y={802} />
      <Hand x={814} y={802} />
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
      {/* sunk deep into the cushions, legs sprawled off the seat */}
      <Limb d="M 455 745 L 400 800 L 330 905" color={c.pants} width={74} />
      <Limb d="M 569 745 L 650 790 L 720 900" color={c.pants} width={74} />
      <Shoe x={315} y={920} flip rotate={-15} />
      <Shoe x={735} y={915} rotate={15} />
      <Neck />
      <path d="M 390 530 Q 512 495 634 530 Q 676 650 656 760 Q 512 790 368 760 Q 348 650 390 530 Z" fill={c.shirt} {...outlined} />
      {/* one arm draped over the couch arm, one holding the phone up to the face */}
      <Limb d="M 398 550 Q 300 590 230 640" color={c.shirt} width={52} />
      <Hand x={222} y={646} />
      <Limb d="M 626 550 Q 660 620 600 650" color={c.shirt} width={52} />
      <rect x={548} y={596} width={46} height={78} rx={8} fill="#222" {...outlined} strokeWidth={6} />
      <rect x={555} y={604} width={32} height={54} rx={4} fill="#9fd8ff" />
      <Hand x={592} y={656} />
      {/* snack bag and crumbs */}
      <path d="M 690 690 L 760 680 L 770 760 L 700 770 Z" fill="#ffb74d" {...outlined} strokeWidth={7} />
      <path d="M 708 715 L 752 710" stroke="#e65100" strokeWidth={8} strokeLinecap="round" />
      <g fill="#e0a040" stroke={c.couchShade} strokeWidth={2}>
        <circle cx={480} cy={790} r={7} />
        <circle cx={520} cy={805} r={6} />
        <circle cx={600} cy={795} r={7} />
        <circle cx={440} cy={810} r={5} />
      </g>
    </g>
  )
}
