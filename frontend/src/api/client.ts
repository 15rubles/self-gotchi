import type { Problem } from './types'

export const API = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly problem: Problem

  constructor(problem: Problem) {
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`)
    this.status = problem.status
    this.problem = problem
  }
}

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

/**
 * Fetch against the API with the session cookie and the CSRF header Spring expects.
 * A 401 means the session is gone: go to the server's login page.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  // A FormData upload sets its own multipart Content-Type (with the boundary).
  if (init.body !== undefined && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (method !== 'GET' && method !== 'HEAD') {
    const token = readCookie('XSRF-TOKEN')
    if (token) headers.set('X-XSRF-TOKEN', decodeURIComponent(token))
  }

  const response = await fetch(path.startsWith('/') ? path : `${API}/${path}`, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
  })

  if (response.status === 401) {
    window.location.assign('/login')
    throw new ApiError({ status: 401, title: 'Not signed in' })
  }
  if (!response.ok) {
    let problem: Problem = { status: response.status }
    try {
      problem = { ...problem, ...(await response.json()) }
    } catch {
      // not JSON; keep the status only
    }
    throw new ApiError(problem)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/logout', { method: 'POST' }).catch(() => undefined)
  window.location.assign('/login?logout')
}
