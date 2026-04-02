import type { Era, EraStartConditions, GameState } from '@ad-astra/shared/types'

// Base URL — empty string (Vite proxies /api to :3001)
const BASE = ''

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('aah-auth')
    if (!raw) return null
    return (JSON.parse(raw) as { state?: { token?: string } }).state?.token ?? null
  } catch { return null }
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/api/health`)
  return handleResponse<{ status: string }>(res)
}

export async function fetchEraGeoJSON(era: Era): Promise<unknown> {
  const res = await fetch(`${BASE}/api/game/geojson/${era}`)
  return handleResponse<unknown>(res)
}

export async function fetchEraConditions(era: Era): Promise<EraStartConditions> {
  const res = await fetch(`${BASE}/api/game/era/${era}`)
  return handleResponse<EraStartConditions>(res)
}

export async function listSaves(): Promise<{ saves: string[] }> {
  const res = await fetch(`${BASE}/api/saves`, { headers: authHeaders() })
  return handleResponse<{ saves: string[] }>(res)
}

export async function saveGame(filename: string, state: GameState): Promise<{ saved: boolean; filename: string }> {
  const res = await fetch(`${BASE}/api/saves/${filename}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(state),
  })
  return handleResponse<{ saved: boolean; filename: string }>(res)
}

export async function loadSave(filename: string): Promise<GameState> {
  const res = await fetch(`${BASE}/api/saves/${filename}`, { headers: authHeaders() })
  return handleResponse<GameState>(res)
}

export async function deleteSave(filename: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE}/api/saves/${filename}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleResponse<{ deleted: boolean }>(res)
}

export async function renameSave(oldName: string, newName: string): Promise<void> {
  const state = await loadSave(oldName)
  await saveGame(newName, state)
  await deleteSave(oldName)
}

// ── Auth API ──────────────────────────────────────────────────────────────────

interface AuthResponse { userId: string; username: string; token: string }

export async function signup(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return handleResponse<AuthResponse>(res)
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return handleResponse<AuthResponse>(res)
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    headers: authHeaders(),
  })
}
