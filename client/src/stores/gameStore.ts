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
function countryGrowthRate(gdp: number, techLevel: number, sectors: Record<string, number>, stability: number, approval: number): number {
  // Convergence: poorer countries grow faster (catch-up effect)
  const gdpB = gdp / 1e9  // GDP in billions
  const convergenceBonus = gdpB < 100 ? 0.02 : gdpB < 500 ? 0.01 : gdpB < 2000 ? 0.005 : 0

  // Base growth influenced by tech and stability
  const techBonus = (techLevel / 100) * 0.025
  const stabilityBonus = stability >= 60 ? 0.01 : stability >= 40 ? 0.005 : stability < 20 ? -0.015 : 0
  const approvalBonus = approval >= 70 ? 0.005 : approval < 30 ? -0.01 : 0

  // Sector contributions
  const financeBonus = ((sectors.finance ?? 0) / 100) * 0.012
  const techSectorBonus = ((sectors.technology ?? 0) / 100) * 0.012
  const industryBonus = ((sectors.industry ?? 0) / 100) * 0.008

  const base = 0.022 + convergenceBonus + techBonus + stabilityBonus + approvalBonus + financeBonus + techSectorBonus + industryBonus
  return Math.max(-0.05, Math.min(0.15, base))  // cap at -5% to +15%
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
  unrest:     { names: ['Civil Unrest', 'Protests Erupt', 'Social Tensions Rise'], gdpLossFraction: 0.005, approvalDelta: -5 },
  rebellion:  { names: ['Armed Rebellion', 'Popular Uprising', 'Separatist Revolt'], gdpLossFraction: 0.02, approvalDelta: -10 },
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
  // Political events are triggered by stability logic, not random rolls
  unrest:     0,
  rebellion:  0,
}

/** Compute annual stability delta based on approval, overexpansion, and GDP growth. */
function stabilityDrift(approval: number, controlledCount: number, gdpGrowth: number): number {
  let delta = 0

  // Approval-based drift
  if (approval >= 75)      delta += 4
  else if (approval >= 60) delta += 2
  else if (approval >= 45) delta += 0
  else if (approval >= 30) delta -= 2
  else if (approval >= 15) delta -= 5
  else                     delta -= 8

  // Overexpansion penalty — each controlled territory beyond 2 drains stability
  const overExpansion = Math.max(0, controlledCount - 2)
  delta -= overExpansion * 1.5

  // GDP growth bonus — strong economy stabilises
  if (gdpGrowth > 0.05) delta += 2
  else if (gdpGrowth < 0) delta -= 2

  return Math.round(Math.max(-10, Math.min(6, delta)))
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
  isPaused: boolean
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
  applyResults: (results: ActionResult[], advancePeriod: 'week' | 'month' | 'year', worldEvent?: import('@ad-astra/shared/types').WorldEvent) => void
  togglePause: () => void
  setPaused: (paused: boolean) => void
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
  isPaused: false,
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
    let newControlledCountries: string[] | undefined
    const playerGdpGrowth: { rate: number } = { rate: 0 }
    if (period === 'year') {
      for (const [iso, country] of Object.entries(newCountries)) {
        const rate = countryGrowthRate(
          country.stats.gdp,
          country.stats.techLevel,
          country.sectors as unknown as Record<string, number>,
          country.stats.stability ?? 70,
          country.stats.approval,
        )
        if (iso === s.playerCountryId) playerGdpGrowth.rate = rate
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

      // ── Stability simulation (player country) ──────────────────────────────
      const playerAfterDisasters = newCountries[s.playerCountryId]
      if (playerAfterDisasters) {
        const controlled = s.controlledCountries ?? []
        const drift = stabilityDrift(playerAfterDisasters.stats.approval, controlled.length + 1, playerGdpGrowth.rate)
        const currentStability = playerAfterDisasters.stats.stability ?? 70
        const newStability = Math.max(0, Math.min(100, currentStability + drift))

        let { gdp, approval } = playerAfterDisasters.stats

        // Political events fire probabilistically when below threshold
        if (newStability < 20 && Math.random() < 0.12) {
          const tmpl = DISASTER_TEMPLATES.rebellion
          const name = tmpl.names[Math.floor(Math.random() * tmpl.names.length)]
          const gdpLoss = Math.round(gdp * tmpl.gdpLossFraction)
          disasters.push({
            id: `pol-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: 'rebellion', name, date: newDate,
            affected: s.playerCountryId, gdpLoss,
            approvalDelta: tmpl.approvalDelta,
            description: `${name} — public order breaking down. Separatist factions gaining strength.`,
          })
          gdp = Math.max(0, gdp - gdpLoss)
          approval = Math.max(0, approval + tmpl.approvalDelta)
          // Breakaway: lose last controlled territory
          if (controlled.length > 0 && Math.random() < 0.3) {
            newControlledCountries = controlled.slice(0, -1)
          }
        } else if (newStability < 35 && Math.random() < 0.08) {
          const tmpl = DISASTER_TEMPLATES.unrest
          const name = tmpl.names[Math.floor(Math.random() * tmpl.names.length)]
          const gdpLoss = Math.round(gdp * tmpl.gdpLossFraction)
          disasters.push({
            id: `pol-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: 'unrest', name, date: newDate,
            affected: s.playerCountryId, gdpLoss,
            approvalDelta: tmpl.approvalDelta,
            description: `${name} — citizens demanding change. Stability is deteriorating.`,
          })
          gdp = Math.max(0, gdp - gdpLoss)
          approval = Math.max(0, approval + tmpl.approvalDelta)
        }

        newCountries[s.playerCountryId] = {
          ...playerAfterDisasters,
          stats: { ...playerAfterDisasters.stats, gdp, approval, stability: newStability },
        }
      }

      // Neighbour events — other nations act according to their personality
      // This is lightweight and deterministic (no AI call)
      const allCountries = Object.values(newCountries)
      for (const c of allCountries) {
        if (c.id === s.playerCountryId) continue
        if (Math.random() > 0.03) continue  // 3% chance per country per year

        const personality = c.personality ?? 'diplomatic'
        if (personality === 'aggressive' || personality === 'expansionist') {
          // Aggressive nation destabilises region — minor approval hit to player
          if (Math.random() < 0.4) {
            newCountries[s.playerCountryId] = {
              ...newCountries[s.playerCountryId],
              stats: {
                ...newCountries[s.playerCountryId].stats,
                approval: Math.max(0, (newCountries[s.playerCountryId].stats.approval ?? 50) - 2),
              },
            }
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
        ...(newControlledCountries !== undefined ? { controlledCountries: newControlledCountries } : {}),
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

  applyResults: (results, advancePeriod, worldEvent) => set(store => {
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

    function pushBuildProject(bp: { type: InfrastructureType; name: string; city?: string; fromCity?: string; toCity?: string; cities?: string[] }, targetIso: string) {
      const weeks = BUILD_WEEKS[bp.type] ?? 52
      if (RAIL_INFRA.has(bp.type) && (bp.fromCity || bp.cities?.length)) {
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

    for (const r of results) {
      const targetIso = r.focusIso ?? pid
      // Only queue builds on success or partial outcomes — failures produce nothing
      if (r.outcome === 'failure') continue
      const bpList = r.buildProjects?.length ? r.buildProjects : r.buildProject ? [r.buildProject] : []
      for (const bp of bpList) {
        pushBuildProject(bp, targetIso)
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

    if (worldEvent) {
      newLoreEntries.push({
        id: `lore-world-${Date.now()}`,
        date: s.currentDate,
        title: `[World Event] ${worldEvent.headline}`,
        narrative: worldEvent.narrative,
        tags: ['world_event'],
        involvedCountries: worldEvent.affectedCountry ? [worldEvent.affectedCountry] : [],
        statDeltas: {},
      })
    }

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
        controlledRegions: results.reduce((acc, r) => {
          if (r.annexedRegion && r.focusIso) {
            const entry = { name: r.annexedRegion, adm0_a3: r.focusIso }
            if (!acc.some(x => x.name === r.annexedRegion && x.adm0_a3 === r.focusIso)) return [...acc, entry]
          }
          return acc
        }, s.controlledRegions ?? []),
        worldEvents: worldEvent ? [...(s.worldEvents ?? []), worldEvent] : (s.worldEvents ?? []),
      },
    }
  }),

  togglePause: () => set(s => ({ isPaused: !s.isPaused })),
  setPaused: (paused) => set({ isPaused: paused }),

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
