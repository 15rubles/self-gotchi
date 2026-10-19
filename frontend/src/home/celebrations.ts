import type { StateResponse } from '../api/types'
import { rewardName, STREAK_MILESTONES } from '../lib/format'

export interface Celebration {
  messages: string[]
  /** Bigger burst: a perfect day or a new room reward. */
  big: boolean
}

const plural = (n: number, word: string) => `${n}-${word}`

/**
 * What a completion earned, comparing the state before and after it: a perfect day (today
 * became perfect), newly unlocked room rewards, and streak milestones of the completed habit.
 */
export function celebrationsFor(before: StateResponse, after: StateResponse, taskId: number): Celebration {
  const messages: string[] = []
  const perfect = after.rewards.perfectDays > before.rewards.perfectDays
  if (perfect) messages.push("🎉 Perfect day! Everything's done.")

  const newRewards = after.rewards.unlocked.filter((key) => !before.rewards.unlocked.includes(key))
  for (const key of newRewards) messages.push(`🏆 New in your room: ${rewardName[key]}!`)

  const was = before.tasks.find((t) => t.id === taskId)
  const now = after.tasks.find((t) => t.id === taskId)
  if (was && now) {
    const milestone = [...STREAK_MILESTONES].reverse().find((m) => was.streak < m && now.streak >= m)
    if (milestone) messages.push(`🔥 ${plural(milestone, now.type === 'QUOTA' ? 'week' : 'day')} streak: ${now.name}`)
  }
  return { messages, big: perfect || newRewards.length > 0 }
}
