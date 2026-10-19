import { art } from '../art'

// Thought icons drawn in a 100x100 box centered on (0, 0).

const Icon = ({ href }: { href: string }) => <image href={href} x={-46} y={-46} width={92} height={92} />

export const Lunchbox = () => <Icon href={art.icons.LUNCHBOX} />
export const Book = () => <Icon href={art.icons.BOOK} />
export const Generic = () => <Icon href={art.icons.GENERIC} />
