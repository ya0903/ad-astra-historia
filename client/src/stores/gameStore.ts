import { create } from 'zustand'
import type { GameState, EraStartConditions, Difficulty } from '@ad-astra/shared/types'

interface GameStoreState {
  state: GameState | null
  isLoading: boolean
  error: string | null
  initGame: (conditions: EraStartConditions, playerCountryId: string, difficulty: Difficulty) => void
  loadGame: (saved: GameState) => void
  clearGame: () => void
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
  // Cheat menu — directly mutates player state
  cheatPatch: (patch: Partial<{ date: string; countryId: string; stats: Partial<GameState['countries'][string]['stats']>; sectors: Partial<GameState['countries'][string]['sectors']> }>) => void
}

export const useGameStore = create<GameStoreState>()((set) => ({
  state: null,
  isLoading: false,
  error: null,

  initGame: (conditions, playerCountryId, difficulty) => {
    const newState: GameState = {
      era: conditions.era,
      currentDate: conditions.startDate,
      playerCountryId,
      difficulty,
      countries: conditions.countries,
      infrastructureMap: [],
      railLines: [],
      landUseRegions: [],
      organisations: conditions.organisations,
      disputes: conditions.disputes,
      nonStateActors: conditions.nonStateActors,
      spaceProgrammes: {},
      megaprojects: [],
      actionHistory: [],
      pendingActions: [],
      lastResults: [],
      strategicPassages: conditions.strategicPassages,
    }
    set({ state: newState, error: null })
  },

  loadGame: (saved) => set({ state: saved, error: null }),

  clearGame: () => set({ state: null, error: null }),

  setLoading: (v) => set({ isLoading: v }),

  setError: (msg) => set({ error: msg }),

  cheatPatch: (patch) => set(store => {
    if (!store.state) return {}
    const s = store.state
    const pid = s.playerCountryId
    const player = s.countries[pid]
    if (!player) return {}
    return {
      state: {
        ...s,
        currentDate: patch.date ?? s.currentDate,
        playerCountryId: patch.countryId ?? pid,
        countries: {
          ...s.countries,
          [pid]: {
            ...player,
            stats: patch.stats ? { ...player.stats, ...patch.stats } : player.stats,
            sectors: patch.sectors ? { ...player.sectors, ...patch.sectors } : player.sectors,
          },
        },
      },
    }
  }),
}))
