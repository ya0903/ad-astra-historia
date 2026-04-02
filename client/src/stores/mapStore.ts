import { create } from 'zustand'
import type maplibregl from 'maplibre-gl'

interface MapStoreState {
  map: maplibregl.Map | null
  setMap: (m: maplibregl.Map | null) => void
}

export const useMapStore = create<MapStoreState>()((set) => ({
  map: null,
  setMap: (m) => set({ map: m }),
}))
