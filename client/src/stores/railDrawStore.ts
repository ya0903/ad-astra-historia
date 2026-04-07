import { create } from 'zustand'
import type { RailStation } from '@ad-astra/shared/types'

export type DrawTool = 'straight' | 'bend' | 'doubleBend' | 'squiggle'
export type DrawMode = 'idle' | 'drawing' | 'stationing'
export type DrawRailType = 'domestic_hsr' | 'cross_continent'

interface RailDrawState {
  mode: DrawMode
  tool: DrawTool
  railType: DrawRailType
  waypoints: [number, number][]
  stations: RailStation[]
  borderValid: boolean
  error: string | null
  startDrawing: (railType: DrawRailType) => void
  setTool: (tool: DrawTool) => void
  addWaypoint: (lng: number, lat: number) => void
  undoWaypoint: () => void
  setBorderValid: (valid: boolean) => void
  enterStationMode: () => void
  addStation: (station: RailStation) => void
  removeStation: (id: string) => void
  upgradeStation: (id: string) => void
  cancel: () => void
  reset: () => void
}

export const useRailDrawStore = create<RailDrawState>((set) => ({
  mode: 'idle',
  tool: 'straight',
  railType: 'domestic_hsr',
  waypoints: [],
  stations: [],
  borderValid: true,
  error: null,
  startDrawing: (railType) => set({ mode: 'drawing', railType, waypoints: [], stations: [], borderValid: true, error: null }),
  setTool: (tool) => set({ tool }),
  addWaypoint: (lng, lat) => set(s => ({ waypoints: [...s.waypoints, [lng, lat]] })),
  undoWaypoint: () => set(s => ({ waypoints: s.waypoints.slice(0, -1) })),
  setBorderValid: (valid) => set({ borderValid: valid }),
  enterStationMode: () => set({ mode: 'stationing' }),
  addStation: (station) => set(s => ({ stations: [...s.stations, station] })),
  removeStation: (id) => set(s => ({ stations: s.stations.filter(x => x.id !== id) })),
  upgradeStation: (id) => set(s => ({
    stations: s.stations.map(x => x.id === id ? { ...x, level: Math.min(5, x.level + 1) } : x),
  })),
  cancel: () => set({ mode: 'idle', waypoints: [], stations: [], error: null }),
  reset: () => set({ mode: 'idle', waypoints: [], stations: [], borderValid: true, error: null }),
}))
