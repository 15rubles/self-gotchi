// Shared art generated with `npm run art:generate` (OpenAI image API, chibi style). Committed:
// none of it is personal. Rooms are full 1024x1024 frames; the rest are trimmed transparent sprites.
import lamp from './deco-lamp.webp'
import lights from './deco-lights.webp'
import bigPlant from './deco-plant.webp'
import rug from './deco-rug.webp'
import bookIcon from './icon-book.webp'
import genericIcon from './icon-generic.webp'
import lunchboxIcon from './icon-lunchbox.webp'
import fly from './fly.webp'
import growl from './growl.webp'
import room0 from './room-0.webp'
import room1 from './room-1.webp'
import room2 from './room-2.webp'
import room3 from './room-3.webp'
import smell1 from './smell-1.webp'
import smell2 from './smell-2.webp'
import smell3 from './smell-3.webp'
import sparkle from './sparkle.webp'

export const art = {
  rooms: [room0, room1, room2, room3],
  smell: [smell1, smell2, smell3],
  fly,
  growl,
  sparkle,
  icons: { LUNCHBOX: lunchboxIcon, BOOK: bookIcon, GENERIC: genericIcon },
  /** Room rewards, unlocked by perfect days. */
  decorations: { RUG: rug, LAMP: lamp, STRING_LIGHTS: lights, BIG_PLANT: bigPlant },
}
