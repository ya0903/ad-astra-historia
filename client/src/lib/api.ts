import type { Era, EraStartConditions, GameState } from '@ad-astra/shared/types'

// Base URL — empty string (Vite proxies /api to :3001)
const BASE = ''

// Helper for error handling
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// Health check
export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/api/health`)
  return handleResponse<{ status: string }>(res)
}

// Era GeoJSON (raw FeatureCollection — use unknown since GeoJSON types aren't installed)
export async function fetchEraGeoJSON(era: Era): Promise<unknown> {
  const res = await fetch(`${BASE}/api/game/geojson/${era}`)
  return handleResponse<unknown>(res)
}

// Era starting conditions
export async function fetchEraConditions(era: Era): Promise<EraStartConditions> {
  const res = await fetch(`${BASE}/api/game/era/${era}`)
  return handleResponse<EraStartConditions>(res)
}

// List saves
export async function listSaves(): Promise<{ saves: string[] }> {
  const res = await fetch(`${BASE}/api/saves`)
  return handleResponse<{ saves: string[] }>(res)
}

// Save game
export async function saveGame(filename: string, state: GameState): Promise<{ saved: boolean; filename: string }> {
  const res = await fetch(`${BASE}/api/saves/${filename}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
  return handleResponse<{ saved: boolean; filename: string }>(res)
}

// Load save
export async function loadSave(filename: string): Promise<GameState> {
  const res = await fetch(`${BASE}/api/saves/${filename}`)
  return handleResponse<GameState>(res)
}

// Delete save
export async function deleteSave(filename: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE}/api/saves/${filename}`, {
    method: 'DELETE',
  })
  return handleResponse<{ deleted: boolean }>(res)
}

// Rename save — load the old one, save under new name, delete old
export async function renameSave(oldName: string, newName: string): Promise<void> {
  const state = await loadSave(oldName)
  await saveGame(newName, state)
  await deleteSave(oldName)
}
