import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIConfig } from '@ad-astra/shared/types'

export type AIRole = 'action' | 'advisor' | 'narrator' | 'diplomat'

interface ConfigState {
  config: AIConfig | null                    // Global / primary config
  roleConfigs: Partial<Record<AIRole, AIConfig>>  // Per-role overrides
  useSameModel: boolean                      // true = use config for all roles
  configHistory: AIConfig[]
  setConfig: (config: AIConfig) => void
  setRoleConfig: (role: AIRole, config: AIConfig | null) => void
  setUseSameModel: (v: boolean) => void
  clearConfig: () => void
  getConfigForRole: (role: AIRole) => AIConfig | null
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: null,
      roleConfigs: {},
      useSameModel: true,
      configHistory: [],

      setConfig: (config) => set(s => ({
        config,
        configHistory: [
          config,
          ...s.configHistory.filter(c => !(c.provider === config.provider && c.model === config.model && c.baseUrl === config.baseUrl)),
        ].slice(0, 5),
      })),

      setRoleConfig: (role, config) => set(s => ({
        roleConfigs: config
          ? { ...s.roleConfigs, [role]: config }
          : Object.fromEntries(Object.entries(s.roleConfigs).filter(([k]) => k !== role)),
      })),

      setUseSameModel: (v) => set({ useSameModel: v }),

      clearConfig: () => set({ config: null, roleConfigs: {} }),

      getConfigForRole: (role) => {
        const s = get()
        if (s.useSameModel) return s.config
        return s.roleConfigs[role] ?? s.config
      },
    }),
    { name: 'aah-config' }
  )
)
