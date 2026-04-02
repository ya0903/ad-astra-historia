import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GameState, EraStartConditions, Difficulty, GameAction, ActionResult,
  BuildProject, ResearchProject, TechId, DisasterEvent, DisasterType, InfrastructureType, LoreEntry,
  RailLine, RailType,
} from '@ad-astra/shared/types'
import { BUILD_WEEKS } from '@ad-astra/shared/types'
import type { Infrastructure } from '@ad-astra/shared/types'
import { getCountryCentre, getCityCentre } from '../lib/mapFly'

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
      lore: [],
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
      lore: saved.lore ?? [],
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

    // Turn completed builds into Infrastructure entries on the map
    // Rail types are linear features — they become RailLine entries, not dots
    const RAIL_INFRA_TYPES = new Set<string>(['rail_line', 'high_speed_rail'])
    const newInfra: Infrastructure[] = completedBuilds.filter(b => !RAIL_INFRA_TYPES.has(b.type)).map(b => {
      const cityCoords = b.lat != null && b.lng != null ? null : getCityCentre(b.name)
      const centre = cityCoords
                  ?? (b.countryId ? getCountryCentre(b.countryId) : null)
                  ?? getCountryCentre(s.playerCountryId)
                  ?? [0, 0]
      // Slight random offset so stacked buildings are distinguishable
      const jitter = () => (Math.random() - 0.5) * 0.15
      return {
        id: `infra-${b.id}`,
        countryId: b.countryId ?? s.playerCountryId,
        type: b.type,
        name: b.name,
        lat: (b.lat ?? centre[1]) + jitter(),
        lng: (b.lng ?? centre[0]) + jitter(),
        level: 1,
      } satisfies Infrastructure
    })

    // Convert completed rail builds into RailLine map features
    const newRailLines: RailLine[] = completedBuilds
      .filter(b => RAIL_INFRA_TYPES.has(b.type) && b.fromCoords && b.toCoords)
      .map(b => ({
        id: `rail-${b.id}`,
        countryId: b.countryId ?? s.playerCountryId,
        fromCity: b.fromCity ?? '',
        toCity: b.toCity ?? '',
        fromCoords: b.fromCoords!,
        toCoords: b.toCoords!,
        waypoints: b.waypoints,
        type: (b.type === 'high_speed_rail' ? 'domestic_hsr' : 'domestic_hsr') as RailType,
      }))

    return {
      state: {
        ...s,
        currentDate: newDate,
        countries: newCountries,
        buildQueue: newBuildQueue,
        researchQueue: newResearchQueue,
        infrastructureMap: [...s.infrastructureMap, ...newInfra],
        railLines: [...(s.railLines ?? []), ...newRailLines],
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
    const RAIL_INFRA = new Set(['rail_line', 'high_speed_rail'])
    const newBuilds: BuildProject[] = []
    for (const r of results) {
      if (r.buildProject) {
        const weeks = BUILD_WEEKS[r.buildProject.type] ?? 52
        const targetIso = r.focusIso ?? pid
        const bp = r.buildProject

        if (RAIL_INFRA.has(bp.type) && (bp.fromCity || bp.cities?.length)) {
          // Rail line — resolve waypoints for all stops
          const citiesList: string[] = bp.cities?.length
            ? bp.cities
            : [bp.fromCity!, bp.toCity!].filter(Boolean)
          const fallback = getCountryCentre(targetIso) ?? getCountryCentre(pid) ?? [0, 0] as [number, number]
          const waypoints = citiesList
            .map(c => getCityCentre(c, targetIso) ?? fallback)
            .map(c => [c[0], c[1]] as [number, number])
          const fromCoords = waypoints[0] ?? (fallback as [number, number])
          const toCoords = waypoints[waypoints.length - 1] ?? (fallback as [number, number])
          newBuilds.push({
            id: `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: bp.type,
            name: bp.name,
            weeksRemaining: weeks,
            totalWeeks: weeks,
            startDate: s.currentDate,
            countryId: targetIso,
            fromCity: citiesList[0],
            toCity: citiesList[citiesList.length - 1],
            fromCoords,
            toCoords,
            cities: citiesList,
            waypoints,
          })
        } else {
          // Point infrastructure — prefer explicit city field, then parse from name
          const cityCoords = (bp.city ? getCityCentre(bp.city, targetIso) : null) ?? getCityCentre(bp.name, targetIso)
          const centre = cityCoords ?? getCountryCentre(targetIso) ?? getCountryCentre(pid)
          newBuilds.push({
            id: `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: bp.type,
            name: bp.name,
            weeksRemaining: weeks,
            totalWeeks: weeks,
            startDate: s.currentDate,
            countryId: targetIso,
            lat: centre ? centre[1] : undefined,
            lng: centre ? centre[0] : undefined,
          })
        }
      }
    }

    const newHistory = [
      ...s.actionHistory,
      ...results.map(r => ({ date: s.currentDate, action: r.summary, outcome: r.fullNarrative })),
    ]

    const newLoreEntries: LoreEntry[] = results.map(r => ({
      id: `lore-${Date.now()}-${r.actionId}`,
      date: s.currentDate,
      title: r.summary,
      narrative: r.fullNarrative,
      tags: r.tags ?? [],
      involvedCountries: (r.countryReactions ?? []).map(cr => cr.country),
      statDeltas: r.statDeltas ?? {},
    }))

    return {
      isJumping: false,
      state: {
        ...s,
        currentDate: advanceDateStr(s.currentDate, advancePeriod),
        countries: { ...s.countries, [pid]: { ...player, stats: newStats } },
        lastResults: results,
        lore: [...(s.lore ?? []), ...newLoreEntries],
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
    const s = store.state
    const RAIL_INFRA = new Set(['rail_line', 'high_speed_rail'])
    const newInfra: Infrastructure[] = (s.buildQueue ?? [])
      .filter(b => !RAIL_INFRA.has(b.type))
      .map(b => {
        const cityCoords = b.lat != null && b.lng != null ? null : getCityCentre(b.name)
        const centre = cityCoords
                    ?? (b.countryId ? getCountryCentre(b.countryId) : null)
                    ?? getCountryCentre(s.playerCountryId)
                    ?? [0, 0]
        const jitter = () => (Math.random() - 0.5) * 0.15
        return {
          id: `infra-${b.id}`,
          countryId: b.countryId ?? s.playerCountryId,
          type: b.type,
          name: b.name,
          lat: (b.lat ?? centre[1]) + jitter(),
          lng: (b.lng ?? centre[0]) + jitter(),
          level: 1,
        } satisfies Infrastructure
      })
    const newRailLines: RailLine[] = (s.buildQueue ?? [])
      .filter(b => RAIL_INFRA.has(b.type) && b.fromCoords && b.toCoords)
      .map(b => ({
        id: `rail-${b.id}`,
        countryId: b.countryId ?? s.playerCountryId,
        fromCity: b.fromCity ?? '',
        toCity: b.toCity ?? '',
        fromCoords: b.fromCoords!,
        toCoords: b.toCoords!,
        waypoints: b.waypoints,
        type: 'domestic_hsr' as RailType,
      }))
    return {
      state: {
        ...s,
        buildQueue: [],
        infrastructureMap: [...s.infrastructureMap, ...newInfra],
        railLines: [...(s.railLines ?? []), ...newRailLines],
      },
    }
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
