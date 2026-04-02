import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIConfig } from '@ad-astra/shared/types'

interface ConfigState {
  config: AIConfig | null
  configHistory: AIConfig[]   // previously saved configs (newest first, max 5)
  setConfig: (config: AIConfig) => void
  clearConfig: () => void
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: null,
      configHistory: [],
      setConfig: (config) => set(s => ({
        config,
        configHistory: [
          config,
          ...s.configHistory.filter(c => !(c.provider === config.provider && c.model === config.model && c.baseUrl === config.baseUrl)),
        ].slice(0, 5),
      })),
      clearConfig: () => set({ config: null }),
    }),
    { name: 'aah-config' }
  )
)
