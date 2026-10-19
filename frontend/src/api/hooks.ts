import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { CompleteResponse, CompletionResponse, HistoryResponse, Me, StateResponse, TaskDefinition, TaskInput } from './types'

export const stateKey = ['state'] as const

/** Current state, refetched every 60 s while the tab is visible (states change on the clock). */
export function useCharacterState() {
  return useQuery({
    queryKey: stateKey,
    queryFn: () => apiFetch<StateResponse>('state'),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

/** State at another moment, for previews. Disabled while `at` is undefined. */
export function useStateAt(at: string | undefined) {
  return useQuery({
    queryKey: [...stateKey, 'at', at],
    queryFn: () => apiFetch<StateResponse>(`state?at=${encodeURIComponent(at!)}`),
    enabled: at !== undefined,
    staleTime: 30_000,
  })
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => apiFetch<Me>('me'), staleTime: Infinity })
}

export type MeInput = Pick<Me, 'displayName' | 'timezone' | 'dayResetHour'>

/** Saves name / time zone / day start. Days are re-derived from the log, so state and history refetch. */
export function useUpdateMe() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: MeInput) => apiFetch<Me>('me', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (me) => {
      client.setQueryData(['me'], me)
      void client.invalidateQueries({ queryKey: stateKey })
      void client.invalidateQueries({ queryKey: ['history'] })
      void client.invalidateQueries({ queryKey: ['completions'] })
    },
  })
}

export function useCompleteTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (taskId: number) =>
      apiFetch<CompleteResponse>(`tasks/${taskId}/complete`, { method: 'POST' }),
    onSuccess: (response) => {
      client.setQueryData(stateKey, response.state)
      void client.invalidateQueries({ queryKey: ['history'] })
      void client.invalidateQueries({ queryKey: ['completions'] })
    },
  })
}

export function useUndoCompletion() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (completionId: number) =>
      apiFetch<StateResponse>(`completions/${completionId}`, { method: 'DELETE' }),
    onSuccess: (state) => {
      client.setQueryData(stateKey, state)
      void client.invalidateQueries({ queryKey: ['history'] })
      void client.invalidateQueries({ queryKey: ['completions'] })
    },
  })
}

// ---- task definitions ------------------------------------------------------------------------

const tasksKey = ['tasks'] as const

export function useTasks(includeArchived = false) {
  return useQuery({
    queryKey: [...tasksKey, { includeArchived }],
    queryFn: () => apiFetch<TaskDefinition[]>(`tasks?includeArchived=${includeArchived}`),
  })
}

export function useTask(id: number | undefined) {
  return useQuery({
    queryKey: [...tasksKey, id],
    queryFn: () => apiFetch<TaskDefinition>(`tasks/${id}`),
    enabled: id !== undefined,
  })
}

/** After any task change the character, the list and the history may all differ. */
function useInvalidateTaskData() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: tasksKey })
    void client.invalidateQueries({ queryKey: stateKey })
    void client.invalidateQueries({ queryKey: ['history'] })
  }
}

export function useSaveTask() {
  const invalidate = useInvalidateTaskData()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: TaskInput }) =>
      apiFetch<TaskDefinition>(id === undefined ? 'tasks' : `tasks/${id}`, {
        method: id === undefined ? 'POST' : 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })
}

export function useArchiveTask() {
  const invalidate = useInvalidateTaskData()
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`tasks/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

// ---- history -------------------------------------------------------------------------------

/** Disabled until both logical dates are known. */
export function useHistory(from: string | undefined, to: string | undefined) {
  return useQuery({
    queryKey: ['history', from, to],
    queryFn: () => apiFetch<HistoryResponse>(`history?from=${from}&to=${to}`),
    enabled: Boolean(from && to),
  })
}

// ---- one day's log (history editor) ----------------------------------------------------------

/** Every log on a logical day, oldest first. */
export function useDayCompletions(date: string | null) {
  return useQuery({
    queryKey: ['completions', date],
    queryFn: () => apiFetch<CompletionResponse[]>(`completions?date=${date}`),
    enabled: date !== null,
  })
}

/** Logs a habit at a given moment ("I did it earlier"). */
export function useLogCompletion() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, completedAt }: { taskId: number; completedAt: string }) =>
      apiFetch<CompleteResponse>(`tasks/${taskId}/complete`, { method: 'POST', body: JSON.stringify({ completedAt }) }),
    onSuccess: (response) => {
      client.setQueryData(stateKey, response.state)
      void client.invalidateQueries({ queryKey: ['history'] })
      void client.invalidateQueries({ queryKey: ['completions'] })
    },
  })
}
