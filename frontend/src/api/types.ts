// Mirrors the backend DTOs (app.selfgotchi.stateapi / task / user). Keep in sync by hand.

export type Category = 'PHYSICAL' | 'MENTAL'
export type TaskType = 'CHECK' | 'METER' | 'QUOTA' | 'FRESHNESS'
export type EffectKey = 'MOUTH_SMELL' | 'HUNGER' | 'MOTIVATION' | 'ROOM' | 'LUNCHBOX' | 'BOOK' | 'GENERIC'
export type TaskStatus = 'UPCOMING' | 'DUE_SOON' | 'DONE' | 'MISSED' | 'OFF'

export type Pose = 'NORMAL' | 'TIRED' | 'EXHAUSTED' | 'LAZY'
export type Face = 'NEUTRAL' | 'HAPPY' | 'WORRIED' | 'VERY_WORRIED' | 'TIRED' | 'EXHAUSTED'
export type EffectType = 'MOUTH_SMELL' | 'BELLY_GROWL' | 'SLOUCH' | 'SWEATPANTS'
export type IconType = 'LUNCHBOX' | 'BOOK' | 'GENERIC'

export interface Effect {
  key: EffectType
  severity: number
}

export interface Icon {
  key: IconType
  severity: number
  taskId: number
}

export interface CharacterState {
  pose: Pose
  face: Face
  /** 0 (clean) to 3 (filthy) */
  room: number
  effects: Effect[]
  icons: Icon[]
  iconOverflow: number
  streakBonus: boolean
}

export interface TaskState {
  id: number
  name: string
  category: Category
  type: TaskType
  effectKey: EffectKey
  sortOrder: number
  status: TaskStatus
  severity: number
  /** ISO instant of the next relevant deadline, null when OFF */
  dueAt: string | null
  done: number
  target: number
  streak: number
  daysSinceDone: number | null
  latestCompletionId: number | null
}

export interface StateResponse {
  at: string
  preview: boolean
  logicalDate: string
  timezone: string
  character: CharacterState
  tasks: TaskState[]
  rewards: RewardProgress
}

/** Room decorations earned with perfect days, in unlock order. */
export type RewardKey = 'RUG' | 'LAMP' | 'STRING_LIGHTS' | 'BIG_PLANT'

export interface RewardProgress {
  /** Days where every due habit got done (today counts once it's complete). */
  perfectDays: number
  unlocked: RewardKey[]
  /** The next reward and the perfect days it needs; null once everything is unlocked. */
  next: RewardKey | null
  nextAt: number | null
}

export interface CompletionResponse {
  id: number
  taskId: number
  completedAt: string
  source: 'APP' | 'NOTIFICATION'
}

export interface CompleteResponse {
  completion: CompletionResponse
  state: StateResponse
}

export interface Me {
  email: string
  displayName: string
  timezone: string
  dayResetHour: number
}

export interface FieldError {
  field: string
  message: string
}

/** RFC 7807 problem detail as returned by the API. */
export interface Problem {
  status: number
  title?: string
  detail?: string
  errors?: FieldError[]
}

// ---- task definitions ------------------------------------------------------------------------

export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export const DAY_CODES: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export interface CheckSchedule {
  type: 'CHECK'
  recurrence?: 'DAILY'
  /** empty = every day */
  days?: DayCode[]
  /** HH:mm */
  deadline: string
  dueSoonMinutes?: number
}

export interface MeterSchedule {
  type: 'METER'
  slots?: { by: string }[]
  count?: number
  minGapMinutes?: number
  firstBy?: string
  lastBy?: string
}

export interface QuotaSchedule {
  type: 'QUOTA'
  timesPerWeek: number
  weekStarts?: DayCode
}

export interface FreshnessSchedule {
  type: 'FRESHNESS'
  thresholdsDays: number[]
}

export type Schedule = CheckSchedule | MeterSchedule | QuotaSchedule | FreshnessSchedule

export interface TaskDefinition {
  id: number
  name: string
  category: Category
  type: TaskType
  effectKey: EffectKey
  schedule: Schedule
  active: boolean
  archivedAt: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface TaskInput {
  name: string
  category: Category
  effectKey: EffectKey
  schedule: Schedule
  sortOrder?: number
}

// ---- history -------------------------------------------------------------------------------

export type DayResult = 'ON_TIME' | 'LATE' | 'PARTIAL' | 'MISSED' | 'PENDING' | 'OFF' | 'NONE'

export interface HistoryDay {
  date: string
  result: DayResult
  completions: number
}

export interface HistoryTask {
  id: number
  name: string
  category: Category
  type: TaskType
  effectKey: EffectKey
  active: boolean
  archivedAt: string | null
  currentStreak: number
  bestStreak: number
  days: HistoryDay[]
}

export interface HistoryResponse {
  from: string
  to: string
  tasks: HistoryTask[]
}
