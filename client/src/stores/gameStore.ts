import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GameState, EraStartConditions, Difficulty, GameAction, ActionResult,
  BuildProject, ResearchProject, TechId, DisasterEvent, DisasterType, InfrastructureType,
} from '@ad-astra/shared/types'
import { BUILD_WEEKS } from '@ad-astra/shared/types'

// ── GDP growth rates (annual) by rough tier ───────────────────────────────────
const GDP_GROWTH_BASE = 0.025 // 2.5% default
function countryGrowthRate(_gdp: number, techLevel: number, sectors: Record<string, number>): number {
  const techBonus = (techLevel / 100) * 0.02
  const financeBonus = ((sectors.finance ?? 0) / 100) * 0.01
  const techSectorBonus = ((sectors.technology ?? 0) / 100) * 0.01
  return GDP_GROWTH_BASE + techBonus + financeBonus + techSectorBonus
}

// ── Natural disaster table ────────────────────────────────────────────────────
const DISASTER_TEMPLATES: Record<DisasterType, { names: string[]; gdpLossFraction: number; approvalDelta: number }> = {
  earthquake: { names: ['Major Earthquake', 'Devastating Tremor', 'Seismic Event'], gdpLossFraction: 0.02, approvalDelta: -8 },
  flood:      { names: ['Flash Floods', 'Monsoon Flooding', 'River Flood'], gdpLossFraction: 0.015, approvalDelta: -6 },
  drought:    { names: ['Severe Drought', 'Agricultural Drought', 'Water Crisis'], gdpLossFraction: 0.01, approvalDelta: -5 },
  hurricane:  { names: ['Category 4 Hurricane', 'Typhoon', 'Cyclone'], gdpLossFraction: 0.025, approvalDelta: -7 },
  wildfire:   { names: ['Forest Wildfire', 'Bushfire Crisis'], gdpLossFraction: 0.008, approvalDelta: -4 },
  tsunami:    { names: ['Tsunami Warning', 'Coastal Tsunami'], gdpLossFraction: 0.03, approvalDelta: -10 },
  pandemic:   { names: ['Disease Outbreak', 'Epidemic', 'Health Crisis'], gdpLossFraction: 0.04, approvalDelta: -12 },
}

const DISASTER_TYPES: DisasterType[] = ['earthquake', 'flood', 'drought', 'hurricane', 'wildfire', 'tsunami', 'pandemic']
// Annual probability per type (rough real-world frequency)
const DISASTER_PROB: Record<DisasterType, number> = {
  earthquake: 0.12,
  flood:      0.20,
  drought:    0.15,
  hurricane:  0.10,
  wildfire:   0.10,
  tsunami:    0.03,
  pandemic:   0.02,
}

function rollDisasters(countryId: string, gdp: number, date: string): DisasterEvent[] {
  const events: DisasterEvent[] = []
  for (const type of DISASTER_TYPES) {
    if (Math.random() < DISASTER_PROB[type]) {
      const tmpl = DISASTER_TEMPLATES[type]
      const name = tmpl.names[Math.floor(Math.random() * tmpl.names.length)]
      events.push({
        id: `dis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        name,
        date,
        affected: countryId,
        gdpLoss: Math.round(gdp * tmpl.gdpLossFraction),
        approvalDelta: tmpl.approvalDelta,
        description: `${name} strikes, causing significant damage.`,
      })
    }
  }
  return events
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function advanceDateStr(date: string, period: 'week' | 'month' | 'year'): string {
  const d = new Date(date)
  if (period === 'week') d.setDate(d.getDate() + 7)
  else if (period === 'month') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function periodWeeks(period: 'week' | 'month' | 'year'): number {
  return period === 'week' ? 1 : period === 'month' ? 4 : 52
}

// ── Store interface ───────────────────────────────────────────────────────────
interface GameStoreState {
  state: GameState | null
  isLoading: boolean
  isJumping: boolean
  error: string | null
  initGame: (conditions: EraStartConditions, playerCountryId: string, difficulty: Difficulty) => void
  loadGame: (saved: GameState) => void
  clearGame: () => void
  setLoading: (v: boolean) => void
  setJumping: (v: boolean) => void
  setError: (msg: string | null) => void
  cheatPatch: (patch: Partial<{
    date: string; countryId: string;
    stats: Partial<GameState['countries'][string]['stats']>;
    sectors: Partial<GameState['countries'][string]['sectors']>;
    yesman: boolean;
  }>) => void
  advanceDate: (period: 'week' | 'month' | 'year') => void
  addPendingAction: (text: string) => void
  removePendingAction: (id: string) => void
  updatePendingAction: (id: string, text: string) => void
  clearPendingActions: () => void
  applyResults: (results: ActionResult[], advancePeriod: 'week' | 'month' | 'year') => void
  setEmpireName: (name: string) => void
  // Build queue
  addBuildProject: (type: InfrastructureType, name: string) => void
  instaBuild: () => void
  // Research
  startResearch: (techId: TechId, weeksRequired: number) => void
  instaResearch: () => void
}

export const useGameStore = create<GameStoreState>()(persist((set) => ({
  state: null,
  isLoading: false,
  isJumping: false,
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
      buildQueue: [],
      researchQueue: [],
      unlockedTechs: [],
      recentDisasters: [],
      warDamage: {},
      yesman: false,
    }
    set({ state: newState, error: null })
  },

  loadGame: (saved) => set({
    state: {
      ...saved,
      buildQueue: saved.buildQueue ?? [],
      researchQueue: saved.researchQueue ?? [],
      unlockedTechs: saved.unlockedTechs ?? [],
      recentDisasters: saved.recentDisasters ?? [],
      warDamage: saved.warDamage ?? {},
      yesman: saved.yesman ?? false,
    },
    error: null,
  }),
  clearGame: () => set({ state: null, error: null }),
  setLoading: (v) => set({ isLoading: v }),
  setJumping: (v) => set({ isJumping: v }),
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
        yesman: patch.yesman !== undefined ? patch.yesman : s.yesman,
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

  advanceDate: (period) => set(store => {
    if (!store.state) return {}
    const s = store.state
    const weeksElapsed = periodWeeks(period)
    const newDate = advanceDateStr(s.currentDate, period)

    // Tick build queue
    const completedBuilds: BuildProject[] = []
    const newBuildQueue = (s.buildQueue ?? [])
      .map(p => ({ ...p, weeksRemaining: p.weeksRemaining - weeksElapsed }))
      .filter(p => { if (p.weeksRemaining <= 0) { completedBuilds.push(p); return false } return true })

    // Tick research queue
    const completedTechs: string[] = []
    const newResearchQueue = (s.researchQueue ?? [])
      .map(p => ({ ...p, weeksRemaining: p.weeksRemaining - weeksElapsed }))
      .filter(p => { if (p.weeksRemaining <= 0) { completedTechs.push(p.techId); return false } return true })

    // GDP growth for all countries each year
    let newCountries = { ...s.countries }
    const disasters: DisasterEvent[] = []
    if (period === 'year') {
      for (const [iso, country] of Object.entries(newCountries)) {
        const rate = countryGrowthRate(country.stats.gdp, country.stats.techLevel, country.sectors as unknown as Record<string, number>)
        newCountries[iso] = {
          ...country,
          stats: { ...country.stats, gdp: Math.round(country.stats.gdp * (1 + rate)) },
        }
      }
      // Roll disasters for player country
      const player = newCountries[s.playerCountryId]
      if (player) {
        const rolled = rollDisasters(s.playerCountryId, player.stats.gdp, newDate)
        disasters.push(...rolled)
        if (rolled.length > 0) {
          let { gdp, approval } = player.stats
          for (const d of rolled) { gdp = Math.max(0, gdp - d.gdpLoss); approval = Math.max(0, approval + d.approvalDelta) }
          newCountries[s.playerCountryId] = {
            ...player,
            stats: { ...player.stats, gdp, approval },
          }
        }
      }
    }

    return {
      state: {
        ...s,
        currentDate: newDate,
        countries: newCountries,
        buildQueue: newBuildQueue,
        researchQueue: newResearchQueue,
        unlockedTechs: [...(s.unlockedTechs ?? []), ...completedTechs as any],
        recentDisasters: [...disasters, ...(s.recentDisasters ?? [])].slice(0, 20),
      },
    }
  }),

  addPendingAction: (text) => set(store => {
    if (!store.state) return {}
    const action: GameAction = { id: `a-${Date.now()}-${Math.random().toString(36).slice(2)}`, text }
    return { state: { ...store.state, pendingActions: [...store.state.pendingActions, action] } }
  }),

  removePendingAction: (id) => set(store => {
    if (!store.state) return {}
    return { state: { ...store.state, pendingActions: store.state.pendingActions.filter(a => a.id !== id) } }
  }),

  updatePendingAction: (id, text) => set(store => {
    if (!store.state) return {}
    return {
      state: {
        ...store.state,
        pendingActions: store.state.pendingActions.map(a => a.id === id ? { ...a, text } : a),
      },
    }
  }),

  clearPendingActions: () => set(store => {
    if (!store.state) return {}
    return { state: { ...store.state, pendingActions: [] } }
  }),

  applyResults: (results, advancePeriod) => set(store => {
    if (!store.state) return {}
    const s = store.state
    const pid = s.playerCountryId
    const player = s.countries[pid]
    if (!player) return {}

    const newStats = { ...player.stats }
    for (const result of results) {
      for (const [key, delta] of Object.entries(result.statDeltas)) {
        const k = key as keyof typeof newStats
        if (typeof newStats[k] === 'number') {
          (newStats as Record<string, number>)[k] = Math.max(0, (newStats[k] as number) + delta)
        }
      }
    }

    // Add any build projects from AI results
    const newBuilds: BuildProject[] = []
    for (const r of results) {
      if (r.buildProject) {
        const weeks = BUILD_WEEKS[r.buildProject.type] ?? 52
        newBuilds.push({
          id: `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: r.buildProject.type,
          name: r.buildProject.name,
          weeksRemaining: weeks,
          totalWeeks: weeks,
          startDate: s.currentDate,
        })
      }
    }

    const newHistory = [
      ...s.actionHistory,
      ...results.map(r => ({ date: s.currentDate, action: r.summary, outcome: r.fullNarrative })),
    ]

    return {
      isJumping: false,
      state: {
        ...s,
        currentDate: advanceDateStr(s.currentDate, advancePeriod),
        countries: { ...s.countries, [pid]: { ...player, stats: newStats } },
        lastResults: results,
        pendingActions: [],
        actionHistory: newHistory,
        buildQueue: [...(s.buildQueue ?? []), ...newBuilds],
        warDamage: results.reduce((dmg, r) => {
          const updated = { ...dmg }
          for (const iso of r.nuclearStrike ?? []) updated[iso] = 'nuked'
          for (const iso of r.bombardment ?? []) { if (!updated[iso]) updated[iso] = 'bombed' }
          return updated
        }, s.warDamage ?? {}),
        empireName: results.find(r => r.empireName)?.empireName ?? s.empireName,
        controlledCountries: results.reduce((acc, r) => {
          if (r.annexedCountry && !acc.includes(r.annexedCountry)) return [...acc, r.annexedCountry]
          return acc
        }, s.controlledCountries ?? []),
      },
    }
  }),

  setEmpireName: (name) => set(store => {
    if (!store.state) return {}
    return { state: { ...store.state, empireName: name } }
  }),

  addBuildProject: (type, name) => set(store => {
    if (!store.state) return {}
    const weeks = BUILD_WEEKS[type] ?? 52
    const project: BuildProject = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type, name,
      weeksRemaining: weeks,
      totalWeeks: weeks,
      startDate: store.state.currentDate,
    }
    return { state: { ...store.state, buildQueue: [...(store.state.buildQueue ?? []), project] } }
  }),

  instaBuild: () => set(store => {
    if (!store.state) return {}
    return { state: { ...store.state, buildQueue: [] } }
  }),

  startResearch: (techId, weeksRequired) => set(store => {
    if (!store.state) return {}
    const project: ResearchProject = {
      id: `rq-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      techId,
      weeksRemaining: weeksRequired,
      totalWeeks: weeksRequired,
      startDate: store.state.currentDate,
    }
    return { state: { ...store.state, researchQueue: [...(store.state.researchQueue ?? []), project] } }
  }),

  instaResearch: () => set(store => {
    if (!store.state) return {}
    const s = store.state
    const completedTechs = (s.researchQueue ?? []).map(r => r.techId)
    return {
      state: {
        ...s,
        researchQueue: [],
        unlockedTechs: [...new Set([...(s.unlockedTechs ?? []), ...completedTechs])],
      },
    }
  }),
}), { name: 'aah-game', partialize: (s) => ({ state: s.state }) }))
