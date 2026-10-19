/**
 * Small stroke icons drawn in SVG instead of text glyphs (+ − ‹ › ✓ × ↺), which font metrics push
 * off-center inside round buttons. They use `currentColor`, are block-level (so grid centering
 * is exact) and hidden from screen readers (the button carries the label).
 */
function Icon({ d, size = 16, strokeWidth = 2.5, className = '' }: { d: string; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`block shrink-0 ${className}`}
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}

type IconProps = { size?: number; strokeWidth?: number; className?: string }

export const PlusIcon = (p: IconProps) => <Icon d="M12 5v14M5 12h14" {...p} />
export const MinusIcon = (p: IconProps) => <Icon d="M5 12h14" {...p} />
export const ChevronLeftIcon = (p: IconProps) => <Icon d="M15 5l-7 7 7 7" {...p} />
export const ChevronRightIcon = (p: IconProps) => <Icon d="M9 5l7 7-7 7" {...p} />
export const CheckIcon = (p: IconProps) => <Icon d="M5 12.5l4.5 4.5L19 7" {...p} />
export const CloseIcon = (p: IconProps) => <Icon d="M6 6l12 12M18 6L6 18" {...p} />
export const UndoIcon = (p: IconProps) => <Icon d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" {...p} />
