import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIConfig } from '@ad-astra/shared/types'

interface ConfigState {
  config: AIConfig | null
  setConfig: (config: AIConfig) => void
  clearConfig: () => void
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: null,
      setConfig: (config) => set({ config }),
      clearConfig: () => set({ config: null }),
    }),
    { name: 'aah-config' }
  )
)
