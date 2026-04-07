import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GameState, EraStartConditions, Difficulty, GameAction, ActionResult,
  BuildProject, ResearchProject, TechId, DisasterEvent, DisasterType, InfrastructureType, LoreEntry,
  RailLine, RailType, NewsItem, EraPhase, EconomyState, MilitaryState, PoliticsState,
  SocietyState, DiplomacyState, ColonyBase, PlanetBody, EspionageState, GovernmentType,
  WorldTickEvent,
} from '@ad-astra/shared/types'
import { BUILD_WEEKS, BUILD_COSTS, BUILD_MONTHLY_INCOME, BUILD_MAX_LEVEL } from '@ad-astra/shared/types'
import type { Infrastructure } from '@ad-astra/shared/types'
import { getCountryCentre, getCityCentre, isCoordInCountry } from '../lib/mapFly'
import { getEraStartUnlocks } from '@ad-astra/shared/eraTechPresets'
import { TECH_TREE, ANCIENT_TECH_TREE, INDUSTRIAL_TECH_TREE, ANCIENT_ERAS, checkEraPhaseTransition } from '@ad-astra/shared/techTree'
import { MODERN_COUNTRY_DATA } from '@ad-astra/shared/countryData'
import {
  newsFromDisaster, newsFromTechUnlock, newsFromGdpGrowth,
  newsFromStabilityEvent, newsFromActionResult, newsFromWorldEvent, newsFromAnnex,
  newsFromWorldTickEvent,
} from '@ad-astra/shared/newsGenerator'
import { worldTick } from '@ad-astra/shared/worldSimulation'

// ── Infrastructure level helpers ──────────────────────────────────────────────

/**
 * Cost to upgrade a single level. Uses an exponential curve so jumping directly
 * to a high level is much more expensive than incrementing one at a time.
 * Going from level (N-1) to level N costs BUILD_COSTS[type] * 1.25^(N-1).
 */
function costForLevelRange(type: InfrastructureType, fromLevel: number, toLevel: number): number {
  const base = BUILD_COSTS[type] ?? 1_000_000_000
  let total = 0
  for (let lvl = fromLevel + 1; lvl <= toLevel; lvl++) {
    total += base * Math.pow(1.25, lvl - 1)
  }
  return Math.round(total)
}

/** Weeks of construction for a level range — also scales up by level. */
function weeksForLevelRange(type: InfrastructureType, fromLevel: number, toLevel: number): number {
  const baseWeeks = BUILD_WEEKS[type] ?? 52
  const levels = toLevel - fromLevel
  // Each additional level adds 70% of the base time
  return Math.round(baseWeeks * (0.5 + 0.7 * levels))
}

/** Clamp a target level to the max allowed for that infrastructure type. */
function clampLevel(type: InfrastructureType, target: number): number {
  const max = BUILD_MAX_LEVEL[type] ?? 5
  return Math.max(1, Math.min(max, target))
}

/** Compute monthly income (USD) for an infrastructure at a given level. */
function monthlyIncomeFor(type: InfrastructureType, level: number): number {
  const base = BUILD_MONTHLY_INCOME[type] ?? 0
  // Each additional level adds 60% of the base income
  return Math.round(base * (1 + 0.6 * (level - 1)))
}

// ── GDP growth rates (annual) by rough tier ───────────────────────────────────
function countryGrowthRate(
  gdp: number,
  techLevel: number,
  sectors: Record<string, number>,
  stability: number,
  approval: number,
  infraMap: { type: string; countryId: string }[],
  countryId: string,
): number {
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
  const industryBonus = ((sectors.manufacturing ?? sectors.industry ?? 0) / 100) * 0.008
  const infraSectorBonus = ((sectors.infrastructure ?? 0) / 100) * 0.006

  // Infrastructure effects — each category capped to avoid runaway stacking
  const ownInfra = infraMap.filter(i => i.countryId === countryId)
  const count = (type: string) => ownInfra.filter(i => i.type === type).length
  const clamp = (v: number, max: number) => Math.min(v, max)

  // Economic enablers
  const portBonus    = clamp(count('port')                * 0.003, 0.012) // ports → trade GDP
  const airportBonus = clamp(count('airport')             * 0.002, 0.008) // airports → connectivity
  const railBonus    = clamp(count('rail_line')           * 0.0015 + count('high_speed_rail') * 0.003, 0.012)
  const finInstBonus = clamp(count('financial_institution')* 0.003, 0.009)
  const indZoneBonus = clamp(count('industrial_zone')     * 0.003, 0.009)
  const dataCentre   = clamp(count('data_centre')         * 0.002, 0.006)

  // Energy — fossil fuels are cheap growth; renewables are steady
  const energyBonus  = clamp(
    (count('fossil_fuel_plant') * 0.004 + count('nuclear_plant') * 0.005
     + count('solar_farm') * 0.002 + count('wind_farm') * 0.002 + count('hydro_dam') * 0.003),
    0.015,
  )

  // Knowledge economy
  const researchBonus = clamp((count('research_centre') + count('university')) * 0.002, 0.008)

  const infraTotal = portBonus + airportBonus + railBonus + finInstBonus + indZoneBonus + dataCentre + energyBonus + researchBonus

  const base = 0.022 + convergenceBonus + techBonus + stabilityBonus + approvalBonus + financeBonus + techSectorBonus + industryBonus + infraSectorBonus + infraTotal
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
  _hasHydrated: boolean
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
    allies: string[];
    atWarWith: string[];
    worldEvents: GameState['worldEvents'];
    revealMap: boolean;
  }>) => void
  advanceDate: (period: 'week' | 'month' | 'year') => void
  addPendingAction: (text: string) => void
  removePendingAction: (id: string) => void
  updatePendingAction: (id: string, text: string) => void
  clearPendingActions: () => void
  applyResults: (results: ActionResult[], advancePeriod: 'week' | 'month' | 'year', worldEvent?: import('@ad-astra/shared/types').WorldEvent) => void
  togglePause: () => void
  setPaused: (paused: boolean) => void
  // Diplomatic inbox
  acceptProposal: (proposalId: string) => void
  declineProposal: (proposalId: string) => void
  // News
  addNewsItem: (item: import('@ad-astra/shared/types').NewsItem) => void
  // Diplomatic chat history
  appendDiplomaticChat: (country: string, message: import('@ad-astra/shared/types').DiplomaticChatMessage) => void
  clearDiplomaticChat: (country: string) => void
  setEmpireName: (name: string) => void
  // Build queue
  addBuildProject: (type: InfrastructureType, name: string) => void
  instaBuild: () => void
  // Research
  startResearch: (techId: TechId, weeksRequired: number) => void
  instaResearch: () => void
  // Cheat actions
  cheatUnlockTech: (techId: string) => void
  cheatAnnex: (iso: string) => void
  // Deep system setters
  setEraPhase: (phase: EraPhase) => void
  setEconomy: (patch: Partial<EconomyState>) => void
  setMilitaryState: (patch: Partial<MilitaryState>) => void
  setPolitics: (patch: Partial<PoliticsState>) => void
  setSociety: (patch: Partial<SocietyState>) => void
  setDiplomacyState: (patch: Partial<DiplomacyState>) => void
  setEspionage: (patch: Partial<EspionageState>) => void
  addColony: (colony: Omit<ColonyBase, 'id'>) => void
  removeColony: (id: string) => void
  upgradeColony: (id: string) => void
  setActivePlanet: (planet: PlanetBody) => void
}


export const useGameStore = create<GameStoreState>()(persist((set) => ({
  state: null,
  isLoading: false,
  isJumping: false,
  isPaused: false,
  error: null,
  _hasHydrated: false,

  initGame: (conditions, playerCountryId, difficulty) => {
    const isAncient = ANCIENT_ERAS.includes(conditions.era)
    const player = conditions.countries[playerCountryId]
    const baseData = !isAncient ? MODERN_COUNTRY_DATA[playerCountryId.toUpperCase()] : undefined
    // Generate a unique save slot name: country-era-timestamp
    const countryName = (player?.name ?? playerCountryId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const eraName = conditions.era.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const ts = Date.now().toString(36)
    const saveSlot = `${countryName}-${eraName}-${ts}`

    const newState: GameState = {
      saveSlot,
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
      unlockedTechs: getEraStartUnlocks(conditions.era, playerCountryId),
      recentDisasters: [],
      warDamage: {},
      lore: [],
      newsItems: conditions.disputes.map(d => ({
        id: `news-dispute-${d.id}`,
        date: conditions.startDate,
        headline: `${d.name} — ${d.status === 'active' ? 'Ongoing' : d.status === 'negotiating' ? 'Talks Underway' : d.status === 'frozen' ? 'Frozen Conflict' : 'Resolved'}`,
        body: d.history.join(' '),
        category: (d.status === 'active' ? 'military' : 'diplomacy') as any,
        importance: 'major' as any,
        country: d.parties[0],
      })),
      yesman: false,
      // ── Deep simulation state ──────────────────────────────────────────────
      eraPhase: isAncient ? 'ancient' : 'modern',
      economy: {
        taxRate: 25,
        debt: 0,
        tradeBalance: 0,
        inflation: baseData ? baseData.inflationRate : 2,
        industrialisationLevel: isAncient ? 0 : (baseData ? Math.min(100, Math.round(baseData.sectorIndustry * 1.5)) : 50),
        sectorShares: isAncient
          ? { agriculture: 70, industry: 10, services: 15, military: 5 }
          : baseData
            ? {
                agriculture: baseData.sectorAgriculture,
                industry: baseData.sectorIndustry,
                services: baseData.sectorServices,
                military: Math.round(baseData.defenceSpendingPct * 2),
              }
            : { agriculture: 10, industry: 30, services: 50, military: 10 },
      },
      militaryState: {
        landStrength: player?.stats?.military ?? 50,
        airStrength: isAncient ? 0 : 30,
        navalStrength: 20,
        doctrine: 'defensive',
        morale: 75,
        attritionRate: 0,
        mobilisationLevel: 0,
      },
      politics: {
        governmentType: isAncient ? 'monarchy' : (baseData ? (baseData.governmentType as GovernmentType) : 'republic'),
        unrestLevel: 10,
        corruption: isAncient ? 40 : (baseData ? baseData.corruptionIndex : 25),
        censorshipLevel: isAncient ? 50 : 15,
        policies: [],
        yearsInPower: 0,
      },
      society: {
        population: isAncient
          ? (baseData ? Math.round(baseData.population * 0.04) : 800000)
          : (baseData ? baseData.population : 20000000),
        populationGrowthRate: isAncient ? 0.5 : (baseData ? baseData.populationGrowthRate : 1.2),
        educationIndex: isAncient ? 10 : (baseData ? Math.round(baseData.educationIndex * 100) : 55),
        happinessIndex: 60,
        inequalityIndex: isAncient ? 60 : (baseData ? Math.round(baseData.giniCoefficient) : 40),
        urbanisationRate: isAncient ? 15 : (baseData ? baseData.urbanisationRate : 55),
      },
      diplomacyState: {
        relations: {},
        alliances: [],
        tradeAgreements: [],
        sanctions: [],
        sphereOfInfluence: [],
        rivals: [],
      },
      colonies: [],
      activePlanet: 'earth',
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
      newsItems: saved.newsItems ?? [],
      yesman: saved.yesman ?? false,
      // Backward-compat defaults for new fields
      eraPhase: saved.eraPhase ?? (ANCIENT_ERAS.includes(saved.era) ? 'ancient' : 'modern'),
      economy: saved.economy ?? undefined,
      militaryState: saved.militaryState ?? undefined,
      politics: saved.politics ?? undefined,
      society: saved.society ?? undefined,
      diplomacyState: saved.diplomacyState ?? undefined,
      colonies: saved.colonies ?? [],
      activePlanet: saved.activePlanet ?? 'earth',
    },
    error: null,
  }),
  clearGame: () => {
    localStorage.removeItem('aah-game')
    set({ state: null, error: null, isPaused: false, isJumping: false })
  },
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
        allies: patch.allies !== undefined ? patch.allies : s.allies,
        atWarWith: patch.atWarWith !== undefined ? patch.atWarWith : s.atWarWith,
        worldEvents: patch.worldEvents !== undefined ? patch.worldEvents : s.worldEvents,
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
    // Build delays — each project has a small chance per tick of getting
    // delayed (supply chain, permits, labour disputes). Delays extend the
    // weeksRemaining and generate a news item.
    const delayNews: NewsItem[] = []
    const newBuildQueue = (s.buildQueue ?? [])
      .map(p => {
        // ~8% chance per month of elapsed time that a build hits a delay
        const delayChance = 0.08 * (weeksElapsed / 4)
        let extraDelay = 0
        if (Math.random() < delayChance) {
          // Delay adds 20-60% of original duration
          extraDelay = Math.round(p.totalWeeks * (0.2 + Math.random() * 0.4))
          delayNews.push({
            id: `news-delay-${p.id}-${Date.now()}`,
            date: s.currentDate,
            headline: `${p.name} Delayed`,
            body: `Construction setback adds ${extraDelay} weeks to the project. Cost overruns expected.`,
            category: 'economy',
            importance: 'minor',
            country: p.countryId ?? s.playerCountryId,
          })
        }
        return { ...p, weeksRemaining: p.weeksRemaining - weeksElapsed + extraDelay }
      })
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
          s.infrastructureMap,
          iso,
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

    // Turn completed builds into Infrastructure entries on the map.
    // Rail types are linear features — they become RailLine entries, not dots.
    // Upgrades (existingInfraId set) update the existing infra level; only
    // brand-new builds create new Infrastructure entries.
    const RAIL_INFRA_TYPES = new Set<string>(['rail_line', 'high_speed_rail'])
    const upgradedInfraIds = new Set<string>()
    const upgradedInfraNewLevels = new Map<string, number>()
    for (const b of completedBuilds) {
      if (RAIL_INFRA_TYPES.has(b.type)) continue
      if (b.existingInfraId && b.targetLevel) {
        upgradedInfraIds.add(b.existingInfraId)
        upgradedInfraNewLevels.set(b.existingInfraId, b.targetLevel)
      }
    }
    const newInfra: Infrastructure[] = completedBuilds
      .filter(b => !RAIL_INFRA_TYPES.has(b.type) && !b.existingInfraId)
      .map(b => {
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
          level: b.targetLevel ?? 1,
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

    // ── Monthly infrastructure income (recurring stream) ─────────────────────
    // Instead of a one-time boost on completion, every existing piece of
    // player-owned infrastructure pays a monthly GDP income. Scaled by
    // level. Applied per month of elapsed time.
    const monthsElapsed = weeksElapsed / 4
    if (monthsElapsed >= 1) {
      let totalMonthly = 0
      for (const inf of s.infrastructureMap) {
        if (inf.countryId !== s.playerCountryId) continue
        totalMonthly += monthlyIncomeFor(inf.type, inf.level ?? 1)
      }
      if (totalMonthly > 0) {
        const player = newCountries[s.playerCountryId]
        if (player) {
          const incomeThisTick = Math.round(totalMonthly * monthsElapsed)
          newCountries[s.playerCountryId] = {
            ...player,
            stats: { ...player.stats, gdp: player.stats.gdp + incomeThisTick },
          }
        }
      }
    }

    // News for completed builds — reports the NEW monthly income they'll add
    const buildCompletionNews: NewsItem[] = completedBuilds.map(cb => {
      const level = cb.targetLevel ?? 1
      const monthly = monthlyIncomeFor(cb.type, level)
      const isUpgrade = !!cb.existingInfraId
      const incomeStr = monthly >= 1e9 ? `$${(monthly / 1e9).toFixed(2)}B` : `$${(monthly / 1e6).toFixed(0)}M`
      return {
        id: `news-build-${cb.id}`,
        date: newDate,
        headline: isUpgrade
          ? `${cb.name} Operational`
          : `${cb.name} Completed`,
        body: isUpgrade
          ? `Upgrade finished — now contributing ${incomeStr}/month to national GDP.`
          : `New ${cb.type.replace(/_/g, ' ')} now operational. Contributing ${incomeStr}/month to national GDP.`,
        category: 'economy' as any,
        importance: 'minor' as any,
        country: s.playerCountryId,
      }
    })

    // ── Era phase transition check ────────────────────────────────────────────
    const allUnlockedAfter = [...(s.unlockedTechs ?? []), ...completedTechs]
    const newPhase = checkEraPhaseTransition(s.eraPhase ?? 'modern', allUnlockedAfter)

    // ── Deep system ticks (yearly) ────────────────────────────────────────────
    let newEconomy = s.economy
    let newMilitaryState = s.militaryState
    let newPolitics = s.politics
    let newSociety = s.society
    let newColonies = s.colonies

    if (period === 'year') {
      // Economy tick
      if (newEconomy) {
        const interestGrowth = newEconomy.debt > 0 ? newEconomy.debt * 0.04 : newEconomy.debt * 0.01
        const inflationDelta = newEconomy.taxRate > 45 ? 0.5 : newEconomy.taxRate < 15 ? -0.3 : 0
        const indGain = s.eraPhase === 'industrial' ? 1.5 : s.eraPhase === 'modern' ? 0.5 : 0
        newEconomy = {
          ...newEconomy,
          debt: Math.round(newEconomy.debt + interestGrowth),
          inflation: Math.max(0, Math.min(25, newEconomy.inflation + inflationDelta)),
          industrialisationLevel: Math.min(100, newEconomy.industrialisationLevel + indGain),
        }
      }

      // Politics tick
      if (newPolitics) {
        const playerStats = newCountries[s.playerCountryId]?.stats
        const unrestDelta = (playerStats?.approval ?? 50) > 65 ? -2 : (playerStats?.approval ?? 50) < 35 ? +3 : 0
        newPolitics = {
          ...newPolitics,
          unrestLevel: Math.max(0, Math.min(100, newPolitics.unrestLevel + unrestDelta)),
          yearsInPower: newPolitics.yearsInPower + 1,
        }
      }

      // Society tick
      if (newSociety) {
        const popGrowth = newSociety.populationGrowthRate / 100
        const eduGain = newEconomy ? Math.min(0.5, newEconomy.industrialisationLevel / 200) : 0
        newSociety = {
          ...newSociety,
          population: Math.round(newSociety.population * (1 + popGrowth)),
          educationIndex: Math.min(100, newSociety.educationIndex + eduGain),
          urbanisationRate: Math.min(100, newSociety.urbanisationRate + (s.eraPhase === 'industrial' ? 0.5 : s.eraPhase === 'modern' ? 0.3 : 0.1)),
        }
      }

      // Military attrition when at war
      if (newMilitaryState && (s.atWarWith ?? []).length > 0) {
        const attrition = newMilitaryState.attritionRate > 0 ? newMilitaryState.attritionRate : 1
        newMilitaryState = {
          ...newMilitaryState,
          landStrength: Math.max(0, newMilitaryState.landStrength - attrition),
          morale: Math.max(0, newMilitaryState.morale - 1),
        }
      }

      // Colony resource output → GDP bonus
      if ((newColonies ?? []).length > 0) {
        const colonyGdpBonus = (newColonies ?? []).reduce((sum, c) => sum + c.resourceOutput, 0) * 1e8
        const pc = newCountries[s.playerCountryId]
        if (pc) {
          newCountries[s.playerCountryId] = {
            ...pc,
            stats: { ...pc.stats, gdp: pc.stats.gdp + colonyGdpBonus },
          }
        }
      }
    }

    // Monthly attrition (lighter)
    if (period === 'month' && newMilitaryState && (s.atWarWith ?? []).length > 0) {
      newMilitaryState = {
        ...newMilitaryState,
        morale: Math.max(0, newMilitaryState.morale - 0.5),
      }
    }

    // ── RP generation (every week) ────────────────────────────────────────
    const playerCountry = newCountries[s.playerCountryId]
    if (playerCountry) {
      const unlockedCount = (s.unlockedTechs ?? []).length
      const universityCount = (s.infrastructureMap ?? []).filter(i => i.type === 'university').length
      const educationIndex = s.society?.educationIndex ?? 55
      const stability = playerCountry.stats.stability ?? 70

      const base = 5
      const uniBonus = universityCount * 3
      const techBonus = unlockedCount * 0.5
      const educationMultiplier = 0.5 + (educationIndex / 100)
      const stabilityMultiplier = stability < 40 ? 0.5 : 1.0

      const weeklyRP = Math.floor((base + uniBonus + techBonus) * educationMultiplier * stabilityMultiplier)
      const totalRP = weeklyRP * weeksElapsed

      const playerStats = { ...playerCountry.stats }
      playerStats.researchPoints = (playerStats.researchPoints ?? 0) + totalRP
      newCountries[s.playerCountryId] = { ...playerCountry, stats: playerStats }
    }

    // ── World tick simulation (every week) ────────────────────────────────
    const worldRelations = { ...(s.worldRelations ?? {}) }

    // Initialise world relations from country diplomacy if first tick
    if (Object.keys(worldRelations).length === 0) {
      for (const [iso, country] of Object.entries(newCountries)) {
        if (country.relations) {
          for (const [otherIso, relType] of Object.entries(country.relations)) {
            const key = [iso, otherIso].sort().join('-')
            if (worldRelations[key] == null) {
              const relValue = relType === 'allied' ? 60
                : relType === 'friendly' ? 30
                : relType === 'neutral' ? 0
                : relType === 'tense' ? -30
                : relType === 'hostile' ? -60
                : relType === 'at_war' ? -90
                : 0
              worldRelations[key] = relValue
            }
          }
        }
      }
    }

    // Run world tick for each week in the period
    const allWorldEvents: WorldTickEvent[] = []
    const newProposals: typeof s.diplomaticInbox = []
    for (let w = 0; w < weeksElapsed; w++) {
      const result = worldTick(newCountries, worldRelations, newDate, s.allies ?? [], s.playerCountryId)

      // Collect proposals directed at the player
      if (result.proposalsForPlayer && result.proposalsForPlayer.length > 0) {
        newProposals!.push(...result.proposalsForPlayer)
      }

      for (const event of result.events) {
        allWorldEvents.push(event)

        // Apply relation deltas
        if (event.relationsDelta) {
          for (const [key, delta] of Object.entries(event.relationsDelta)) {
            worldRelations[key] = Math.max(-100, Math.min(100, (worldRelations[key] ?? 0) + delta))
          }
        }

        // Apply stat changes to countries
        if (event.statChanges) {
          for (const change of event.statChanges) {
            const country = newCountries[change.country]
            if (!country) continue
            const stats = { ...country.stats }
            if (change.field === 'stability') {
              stats.stability = Math.max(0, Math.min(100, (stats.stability ?? 70) + change.delta))
            } else if (change.field === 'approval') {
              stats.approval = Math.max(0, Math.min(100, stats.approval + change.delta))
            } else if (change.field === 'gdp') {
              stats.gdp = Math.max(0, stats.gdp + change.delta)
            } else if (change.field === 'softPower') {
              stats.softPower = Math.max(0, Math.min(100, stats.softPower + change.delta))
            } else if (change.field === 'military') {
              stats.military = Math.max(0, Math.min(100, stats.military + change.delta))
            }
            newCountries[change.country] = { ...country, stats }
          }
        }
      }
    }

    // Convert world events to news items
    const worldNews = allWorldEvents.map(e => newsFromWorldTickEvent(e))

    // ── Generate news for this tick ───────────────────────────────────────────
    const newNewsItems: NewsItem[] = []
    // Era phase transition news
    if (newPhase) {
      const playerName = newCountries[s.playerCountryId]?.name ?? s.playerCountryId
      newNewsItems.push({
        id: `phase-${Date.now()}`,
        date: newDate,
        headline: newPhase === 'industrial'
          ? `${playerName} enters the Industrial Era — steam and steel transform the nation`
          : `${playerName} enters the Modern Era — electrification heralds a new age`,
        category: 'science',
        importance: 'breaking',
        country: s.playerCountryId,
      })
    }
    // News from disasters and political events
    for (const d of disasters) {
      if (d.type === 'rebellion' || d.type === 'unrest') {
        newNewsItems.push(newsFromStabilityEvent(d.type, d.affected, d.date))
      } else {
        newNewsItems.push(newsFromDisaster(d))
      }
    }
    // News from completed research
    const allTechNodes = [...TECH_TREE, ...ANCIENT_TECH_TREE, ...INDUSTRIAL_TECH_TREE]
    for (const techId of completedTechs) {
      const techName = allTechNodes.find(t => t.id === techId)?.name ?? techId
      newNewsItems.push(newsFromTechUnlock(techId as TechId, techName, newDate, s.playerCountryId))
    }
    // Economic news (once per year tick)
    if (period === 'year') {
      const playerCountryAfter = newCountries[s.playerCountryId]
      if (playerCountryAfter) {
        const item = newsFromGdpGrowth(s.playerCountryId, playerCountryAfter.stats.gdp / 1e9, playerGdpGrowth.rate, newDate)
        if (item) newNewsItems.push(item)
      }
    }

    return {
      state: {
        ...s,
        currentDate: newDate,
        countries: newCountries,
        buildQueue: newBuildQueue,
        researchQueue: newResearchQueue,
        infrastructureMap: [
          // Upgrade existing infra in-place where applicable
          ...s.infrastructureMap.map(inf => {
            const newLvl = upgradedInfraNewLevels.get(inf.id)
            return newLvl != null ? { ...inf, level: newLvl } : inf
          }),
          ...newInfra,
        ],
        railLines: [...(s.railLines ?? []), ...newRailLines],
        unlockedTechs: [...(s.unlockedTechs ?? []), ...completedTechs as any],
        recentDisasters: [...disasters, ...(s.recentDisasters ?? [])].slice(0, 20),
        newsItems: [...buildCompletionNews, ...delayNews, ...worldNews, ...newNewsItems, ...(s.newsItems ?? [])].slice(0, 200),
        worldRelations,
        diplomaticInbox: [...(s.diplomaticInbox ?? []), ...(newProposals ?? [])].slice(-20),
        ...(newControlledCountries !== undefined ? { controlledCountries: newControlledCountries } : {}),
        ...(newPhase ? { eraPhase: newPhase } : {}),
        ...(newEconomy ? { economy: newEconomy } : {}),
        ...(newMilitaryState ? { militaryState: newMilitaryState } : {}),
        ...(newPolitics ? { politics: newPolitics } : {}),
        ...(newSociety ? { society: newSociety } : {}),
        ...(newColonies ? { colonies: newColonies } : {}),
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
    const blockedRailNewsItems: NewsItem[] = []
    let totalBuildCost = 0

    // Countries friendly to the player: own country + allies + controlled countries
    const friendlyCountries = new Set<string>([
      pid,
      ...(s.allies ?? []),
      ...(s.controlledCountries ?? []),
    ])

    /**
     * Checks whether a rail route (given as raw [lng,lat] waypoints) crosses
     * into non-friendly territory.  Returns the ISO_A3 of the first blocking
     * country found, or null if the route is entirely within friendly territory.
     */
    function findBlockingCountry(rawWaypoints: [number, number][], targetIso: string): string | null {
      // targetIso must itself be friendly
      if (!friendlyCountries.has(targetIso)) return targetIso

      // Check each waypoint against every non-friendly country bounding box
      const nonFriendlyIsos = Object.keys(s.countries).filter(iso => !friendlyCountries.has(iso))
      for (const pt of rawWaypoints) {
        // Skip the point if it's inside the target (friendly) country — no issue
        if (isCoordInCountry(pt[0], pt[1], targetIso)) continue
        // Point is outside targetIso — find which non-friendly country it's in
        for (const iso of nonFriendlyIsos) {
          if (isCoordInCountry(pt[0], pt[1], iso)) return iso
        }
      }
      return null
    }

    /** Push a build project, or queue a blocked-rail news item for rail types. */
    function pushBuildProject(bp: { type: InfrastructureType; name: string; city?: string; fromCity?: string; toCity?: string; cities?: string[]; hostCountry?: string; targetLevel?: number }, targetIso: string) {
      // Embassies are always built in a foreign host country, not the player's territory.
      // Use hostCountry if provided, else try to detect the host from the city name.
      if (bp.type === 'embassy') {
        if (bp.hostCountry) {
          targetIso = bp.hostCountry.toUpperCase()
        } else if (bp.city) {
          // Try to find which country the city belongs to (excluding the player's country)
          for (const iso of Object.keys(s.countries)) {
            if (iso === pid) continue
            if (getCityCentre(bp.city, iso)) { targetIso = iso; break }
          }
        }
      }

      // ── Dedupe + upgrade: check if this building type already exists at this
      // city/country. If so, upgrade the existing infrastructure instead of
      // creating a duplicate. For rail, check by matching cities list instead.
      const isRail = RAIL_INFRA.has(bp.type)
      if (!isRail) {
        // Try to match by type + city + country. Cities dedupe on name case-
        // insensitively; types match exactly. Same for already-queued builds.
        const cityKey = (bp.city ?? bp.name).toLowerCase().trim()
        const existing = s.infrastructureMap.find(inf =>
          inf.countryId === targetIso
          && inf.type === bp.type
          && (inf.name.toLowerCase().includes(cityKey) || cityKey.includes(inf.name.toLowerCase().split(' ')[0] ?? ''))
        )
        // Also skip if a build project of the same type + city is already queued
        const alreadyQueued = (s.buildQueue ?? []).concat(newBuilds).find(q =>
          q.countryId === targetIso
          && q.type === bp.type
          && (q.name.toLowerCase().includes(cityKey) || cityKey.includes(q.name.toLowerCase().split(' ')[0] ?? ''))
        )
        if (alreadyQueued) {
          // Silently skip — can't double-build the same thing while already building
          return
        }
        if (existing) {
          // Upgrade path
          const maxLvl = BUILD_MAX_LEVEL[bp.type] ?? 5
          if (existing.level >= maxLvl) return // already maxed
          const targetLvl = clampLevel(bp.type, bp.targetLevel ?? existing.level + 1)
          if (targetLvl <= existing.level) return
          const weeks = weeksForLevelRange(bp.type, existing.level, targetLvl)
          const cost = costForLevelRange(bp.type, existing.level, targetLvl)
          newBuilds.push({
            id: `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: bp.type,
            name: `${existing.name} — Level ${targetLvl} Upgrade`,
            weeksRemaining: weeks,
            totalWeeks: weeks,
            startDate: s.currentDate,
            countryId: targetIso,
            lat: existing.lat,
            lng: existing.lng,
            startLevel: existing.level,
            targetLevel: targetLvl,
            existingInfraId: existing.id,
          })
          totalBuildCost += cost
          return
        }
      }

      const weeks = BUILD_WEEKS[bp.type] ?? 52
      if (RAIL_INFRA.has(bp.type) && (bp.fromCity || bp.cities?.length)) {
        const citiesList: string[] = bp.cities?.length
          ? bp.cities
          : [bp.fromCity!, bp.toCity!].filter(Boolean)
        const fallback = getCountryCentre(targetIso) ?? getCountryCentre(pid) ?? [0, 0] as [number, number]
        const rawWaypoints = citiesList
          .map(c => getCityCentre(c, targetIso) ?? fallback)
          .map(c => [c[0], c[1]] as [number, number])

        // ── Border routing check ──────────────────────────────────────────────
        // Prevent rail lines from crossing into non-allied territory
        const blockingIso = findBlockingCountry(rawWaypoints, targetIso)
        if (blockingIso) {
          const blockingName = s.countries[blockingIso]?.name ?? blockingIso
          blockedRailNewsItems.push({
            id: `rail-blocked-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            date: s.currentDate,
            headline: `Rail construction halted — route crosses ${blockingName} territory`,
            body: `Cannot build rail — route crosses non-allied territory. Establish an alliance or trade agreement with ${blockingName} to enable cross-border rail.`,
            category: 'world',
            importance: 'minor',
            country: pid,
          })
          return
        }

        // Clamp any remaining out-of-bounds waypoints to the country centre
        const waypoints = rawWaypoints.map(pt =>
          isCoordInCountry(pt[0], pt[1], targetIso) ? pt : (fallback as [number, number])
        )
        const fromCoords = waypoints[0] ?? (fallback as [number, number])
        const toCoords = waypoints[waypoints.length - 1] ?? (fallback as [number, number])
        const railTargetLvl = clampLevel(bp.type, bp.targetLevel ?? 1)
        const scaledCost = costForLevelRange(bp.type, 0, railTargetLvl)
        const scaledWeeks = railTargetLvl > 1 ? weeksForLevelRange(bp.type, 0, railTargetLvl) : weeks
        newBuilds.push({
          id: `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: bp.type,
          name: railTargetLvl > 1 ? `${bp.name} (Level ${railTargetLvl})` : bp.name,
          weeksRemaining: scaledWeeks,
          totalWeeks: scaledWeeks,
          startDate: s.currentDate,
          countryId: targetIso,
          fromCity: citiesList[0],
          toCity: citiesList[citiesList.length - 1],
          fromCoords,
          toCoords,
          cities: citiesList,
          waypoints,
          startLevel: 0,
          targetLevel: railTargetLvl,
        })
        totalBuildCost += scaledCost
      } else {
        // Brand-new build (not an upgrade). Start at level 0, target = AI choice (default 1).
        const targetLvl = clampLevel(bp.type, bp.targetLevel ?? 1)
        const scaledCost = costForLevelRange(bp.type, 0, targetLvl)
        const scaledWeeks = targetLvl > 1
          ? weeksForLevelRange(bp.type, 0, targetLvl)
          : weeks
        const cityCoords = (bp.city ? getCityCentre(bp.city, targetIso) : null) ?? getCityCentre(bp.name, targetIso)
        const centre = cityCoords ?? getCountryCentre(targetIso) ?? getCountryCentre(pid)
        newBuilds.push({
          id: `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: bp.type,
          name: targetLvl > 1 ? `${bp.name} (Level ${targetLvl})` : bp.name,
          weeksRemaining: scaledWeeks,
          totalWeeks: scaledWeeks,
          startDate: s.currentDate,
          countryId: targetIso,
          lat: centre ? centre[1] : undefined,
          lng: centre ? centre[0] : undefined,
          startLevel: 0,
          targetLevel: targetLvl,
        })
        totalBuildCost += scaledCost
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

    // ── Generate news from action results ─────────────────────────────────────
    const actionNewsItems: NewsItem[] = []
    for (const r of results) {
      if (r.outcome !== 'failure' || r.tags?.some(t => ['military', 'diplomacy'].includes(t))) {
        actionNewsItems.push(newsFromActionResult(r.summary, s.currentDate, pid, r.outcome, r.tags ?? []))
      }
      // Annex news
      if (r.annexedCountry) {
        actionNewsItems.push(newsFromAnnex(pid, r.annexedCountry, s.currentDate))
      }
    }
    if (worldEvent) {
      actionNewsItems.push(newsFromWorldEvent(worldEvent, s.currentDate))
    }

    // ── Apply upfront build cost to debt ──────────────────────────────────────
    const applyResultsEconomy = totalBuildCost > 0 && s.economy
      ? { ...s.economy, debt: s.economy.debt + totalBuildCost }
      : s.economy

    return {
      isJumping: false,
      state: {
        ...s,
        countries: { ...s.countries, [pid]: { ...player, stats: newStats } },
        lastResults: results,
        lore: [...(s.lore ?? []), ...newLoreEntries],
        pendingActions: [],
        actionHistory: newHistory,
        buildQueue: [...(s.buildQueue ?? []), ...newBuilds],
        ...(applyResultsEconomy ? { economy: applyResultsEconomy } : {}),
        newsItems: [...blockedRailNewsItems, ...actionNewsItems, ...(s.newsItems ?? [])].slice(0, 100),
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
        colonies: results.reduce((acc, r) => {
          if (r.outcome === 'failure' || !r.foundColony) return acc
          const fc = r.foundColony
          // Don't add duplicate colonies at the same planet/name
          if (acc.some(c => c.planet === fc.planet && c.name === fc.name)) return acc
          const newColony: import('@ad-astra/shared/types').ColonyBase = {
            id: `colony-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            planet: fc.planet,
            name: fc.name,
            lat: fc.lat,
            lng: fc.lng,
            population: 12,
            resourceOutput: 1,
            established: s.currentDate,
            level: 1,
          }
          return [...acc, newColony]
        }, s.colonies ?? []),
      },
    }
  }),

  togglePause: () => set(s => ({ isPaused: !s.isPaused })),
  setPaused: (paused) => set({ isPaused: paused }),

  acceptProposal: (proposalId) => set(store => {
    if (!store.state) return {}
    const s = store.state
    const inbox = s.diplomaticInbox ?? []
    const proposal = inbox.find(p => p.id === proposalId)
    if (!proposal) return {}
    // Apply effect based on proposal type
    const newRelations = { ...(s.worldRelations ?? {}) }
    const key = [s.playerCountryId, proposal.fromCountry].sort().join('-')
    const newAllies = [...(s.allies ?? [])]
    const player = s.countries[s.playerCountryId]
    const fromName = s.countries[proposal.fromCountry]?.name ?? proposal.fromCountry
    const playerName = player?.name ?? s.playerCountryId
    let newPlayer = player
    let headline = ''
    let body = ''
    switch (proposal.type) {
      case 'trade_deal':
        newRelations[key] = Math.min(100, (newRelations[key] ?? 0) + 15)
        if (player) {
          newPlayer = { ...player, stats: { ...player.stats, gdp: player.stats.gdp + Math.round(player.stats.gdp * 0.005) } }
        }
        headline = `${playerName} and ${fromName} Sign Trade Agreement`
        body = `The two nations have ratified a major bilateral trade deal, lifting tariffs and opening markets. Both economies expected to benefit.`
        break
      case 'alliance':
        newRelations[key] = Math.min(100, (newRelations[key] ?? 0) + 30)
        if (!newAllies.includes(proposal.fromCountry)) newAllies.push(proposal.fromCountry)
        headline = `${playerName} and ${fromName} Form Military Alliance`
        body = `The two nations have signed a mutual defence pact, pledging to support each other in time of war. A significant geopolitical realignment.`
        break
      case 'arms_deal':
        newRelations[key] = Math.min(100, (newRelations[key] ?? 0) + 10)
        if (player) {
          newPlayer = { ...player, stats: { ...player.stats, military: Math.min(100, player.stats.military + 5) } }
        }
        headline = `${playerName} Acquires Weapons Systems from ${fromName}`
        body = `A major arms deal has been finalised. ${playerName}'s military strength is expected to grow as new equipment is delivered.`
        break
      case 'summit':
        newRelations[key] = Math.min(100, (newRelations[key] ?? 0) + 20)
        if (player) {
          newPlayer = { ...player, stats: { ...player.stats, softPower: Math.min(100, player.stats.softPower + 3) } }
        }
        headline = `${playerName} and ${fromName} Hold Diplomatic Summit`
        body = `Leaders of both nations met to discuss bilateral relations and shared interests. The summit was widely seen as a success.`
        break
    }
    const newsItem = {
      id: `news-accept-${proposal.id}`,
      date: s.currentDate,
      headline,
      body,
      category: 'diplomacy' as const,
      importance: (proposal.type === 'alliance' ? 'breaking' : 'major') as 'breaking' | 'major',
      country: s.playerCountryId,
    }
    const newInbox = inbox.map(p => p.id === proposalId ? { ...p, status: 'accepted' as const } : p)
    return {
      state: {
        ...s,
        diplomaticInbox: newInbox,
        worldRelations: newRelations,
        allies: newAllies,
        countries: newPlayer && player ? { ...s.countries, [s.playerCountryId]: newPlayer } : s.countries,
        newsItems: [newsItem, ...(s.newsItems ?? [])].slice(0, 200),
      },
    }
  }),

  addNewsItem: (item) => set(store => {
    if (!store.state) return {}
    return {
      state: {
        ...store.state,
        newsItems: [item, ...(store.state.newsItems ?? [])].slice(0, 200),
      },
    }
  }),

  appendDiplomaticChat: (country, message) => set(store => {
    if (!store.state) return {}
    const chats = { ...(store.state.diplomaticChats ?? {}) }
    const existing = chats[country] ?? []
    chats[country] = [...existing, message].slice(-100) // cap per-country history at 100 messages
    return { state: { ...store.state, diplomaticChats: chats } }
  }),

  clearDiplomaticChat: (country) => set(store => {
    if (!store.state) return {}
    const chats = { ...(store.state.diplomaticChats ?? {}) }
    delete chats[country]
    return { state: { ...store.state, diplomaticChats: chats } }
  }),

  declineProposal: (proposalId) => set(store => {
    if (!store.state) return {}
    const s = store.state
    const inbox = s.diplomaticInbox ?? []
    const proposal = inbox.find(p => p.id === proposalId)
    if (!proposal) return {}
    // Small relation penalty for declining
    const newRelations = { ...(s.worldRelations ?? {}) }
    const key = [s.playerCountryId, proposal.fromCountry].sort().join('-')
    newRelations[key] = Math.max(-100, (newRelations[key] ?? 0) - 5)
    const fromName = s.countries[proposal.fromCountry]?.name ?? proposal.fromCountry
    const playerName = s.countries[s.playerCountryId]?.name ?? s.playerCountryId
    const typeLabel =
      proposal.type === 'trade_deal' ? 'Trade Deal' :
      proposal.type === 'alliance'   ? 'Alliance Offer' :
      proposal.type === 'arms_deal'  ? 'Arms Deal' :
      proposal.type === 'summit'     ? 'Summit Request' : 'Proposal'
    const newsItem = {
      id: `news-decline-${proposal.id}`,
      date: s.currentDate,
      headline: `${playerName} Rejects ${fromName} ${typeLabel}`,
      body: `${playerName} has formally declined the proposal from ${fromName}. Diplomatic relations cool slightly as a result.`,
      category: 'diplomacy' as const,
      importance: 'minor' as const,
      country: s.playerCountryId,
    }
    const newInbox = inbox.map(p => p.id === proposalId ? { ...p, status: 'declined' as const } : p)
    return {
      state: {
        ...s,
        diplomaticInbox: newInbox,
        worldRelations: newRelations,
        newsItems: [newsItem, ...(s.newsItems ?? [])].slice(0, 200),
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
    const s = store.state

    // Find the tech in all trees to get its cost
    const allTechNodes = [...TECH_TREE, ...ANCIENT_TECH_TREE, ...INDUSTRIAL_TECH_TREE]
    const tech = allTechNodes.find(t => t.id === techId)
    const cost = tech?.cost ?? 0

    // Check player has enough RP
    const playerCountry = s.countries[s.playerCountryId]
    const currentRP = playerCountry?.stats.researchPoints ?? 0
    if (currentRP < cost) return {}

    // Deduct the RP cost
    const newCountries = { ...s.countries }
    if (playerCountry) {
      newCountries[s.playerCountryId] = {
        ...playerCountry,
        stats: { ...playerCountry.stats, researchPoints: currentRP - cost },
      }
    }

    const project: ResearchProject = {
      id: `rq-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      techId,
      weeksRemaining: weeksRequired,
      totalWeeks: weeksRequired,
      startDate: s.currentDate,
    }
    return { state: { ...s, countries: newCountries, researchQueue: [...(s.researchQueue ?? []), project] } }
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

  cheatUnlockTech: (techId) => set(s => {
    if (!s.state) return {}
    const current = s.state.unlockedTechs ?? []
    if (current.includes(techId as TechId)) return {}
    return { state: { ...s.state, unlockedTechs: [...current, techId as TechId] } }
  }),

  cheatAnnex: (iso) => set(s => {
    if (!s.state) return {}
    const isoUpper = iso.toUpperCase()
    const controlled = s.state.controlledCountries ?? []
    if (controlled.includes(isoUpper)) return {}
    return { state: { ...s.state, controlledCountries: [...controlled, isoUpper] } }
  }),

  setEraPhase: (phase) => set(s => {
    if (!s.state) return {}
    return { state: { ...s.state, eraPhase: phase } }
  }),

  setEconomy: (patch) => set(s => {
    if (!s.state?.economy) return {}
    return { state: { ...s.state, economy: { ...s.state.economy, ...patch } } }
  }),

  setMilitaryState: (patch) => set(s => {
    if (!s.state?.militaryState) return {}
    return { state: { ...s.state, militaryState: { ...s.state.militaryState, ...patch } } }
  }),

  setPolitics: (patch) => set(s => {
    if (!s.state?.politics) return {}
    return { state: { ...s.state, politics: { ...s.state.politics, ...patch } } }
  }),

  setSociety: (patch) => set(s => {
    if (!s.state?.society) return {}
    return { state: { ...s.state, society: { ...s.state.society, ...patch } } }
  }),

  setDiplomacyState: (patch) => set(s => {
    if (!s.state?.diplomacyState) return {}
    return { state: { ...s.state, diplomacyState: { ...s.state.diplomacyState, ...patch } } }
  }),

  setEspionage: (patch) => set(s => {
    if (!s.state) return {}
    const current = s.state.espionage ?? {
      agencyBudget: 0, agencyTier: 1, operativeCount: 0,
      networkStrength: {}, activeMissions: [], completedMissions: [],
      detectedBy: [], counterIntelLevel: 20,
    }
    return { state: { ...s.state, espionage: { ...current, ...patch } } }
  }),

  addColony: (colonyData) => set(s => {
    if (!s.state) return {}
    const colony: ColonyBase = {
      ...colonyData,
      id: `colony-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }
    return { state: { ...s.state, colonies: [...(s.state.colonies ?? []), colony] } }
  }),

  removeColony: (id) => set(s => {
    if (!s.state) return {}
    return { state: { ...s.state, colonies: (s.state.colonies ?? []).filter(c => c.id !== id) } }
  }),

  upgradeColony: (id) => set(s => {
    if (!s.state) return {}
    return {
      state: {
        ...s.state,
        colonies: (s.state.colonies ?? []).map(c =>
          c.id === id && c.level < 3 ? { ...c, level: (c.level + 1) as 1 | 2 | 3 } : c
        ),
      },
    }
  }),

  setActivePlanet: (planet) => set(s => {
    if (!s.state) return {}
    return { state: { ...s.state, activePlanet: planet } }
  }),
}), {
  name: 'aah-game',
  partialize: (s) => ({ state: s.state }),
  // Called when rehydration completes (or when there is nothing to rehydrate).
  // `state` is the store instance — use it directly to avoid circular-ref issues
  // that arise if we call useGameStore.setState() before the export is assigned.
  onRehydrateStorage: () => (state) => {
    if (state) {
      state._hasHydrated = true
    }
  },
}))
