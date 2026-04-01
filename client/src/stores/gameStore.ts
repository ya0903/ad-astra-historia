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
}))
