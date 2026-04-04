export type Era = '1945' | '1960s' | '1990s' | '2010s' | 'modern' | 'greek' | 'roman' | 'ottoman'
export type Difficulty = 'passive' | 'realistic' | 'aggressive'
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom'
export type RelationType = 'allied' | 'friendly' | 'neutral' | 'tense' | 'hostile' | 'at_war'
export type PassageStatus = 'open' | 'tolled' | 'blocked'
export type OrgType = 'military_alliance' | 'trade_bloc' | 'research_collective' | 'political_union' | 'cultural'
export type RailType = 'domestic_hsr' | 'cross_continent' | 'undersea_tunnel'
export type LandUseType = 'forest' | 'deforested' | 'national_park' | 'nature_corridor' | 'desert_agriculture' | 'desertification'
export type NonStateType = 'paramilitary' | 'insurgency' | 'terror' | 'separatist'

export type InfrastructureType =
  | 'research_centre' | 'university' | 'intelligence_agency' | 'telecom_node'
  | 'city' | 'capital' | 'port' | 'airport'
  | 'solar_farm' | 'wind_farm' | 'hydro_dam' | 'fossil_fuel_plant' | 'nuclear_plant'
  | 'military_base' | 'nuclear_silo' | 'defence_system'
  | 'financial_institution' | 'emergency_services' | 'industrial_zone'
  | 'desalination_plant' | 'data_centre' | 'embassy'
  | 'stadium' | 'arts_centre' | 'film_studio'
  | 'rail_line' | 'high_speed_rail'

export interface Infrastructure {
  id: string
  countryId: string
  type: InfrastructureType
  lat: number
  lng: number
  level: number
  name: string
  nationalised?: boolean
}

export interface RailLine {
  id: string
  countryId: string
  fromCity: string
  toCity: string
  fromCoords: [number, number]
  toCoords: [number, number]
  waypoints?: [number, number][]  // full multi-city route coords in order
  type: RailType
}

export interface LandUseRegion {
  id: string
  countryId: string
  type: LandUseType
  polygon: [number, number][]
}

export interface CountryStats {
  gdp: number
  military: number
  researchPoints: number
  approval: number
  softPower: number
  techLevel: number
  culturalReach: number
  /** 0–100. 70 = stable, <40 = unrest, <20 = rebellion risk */
  stability: number
}

export interface CountrySectors {
  defence: number
  technology: number
  batteries: number
  microchips: number
  space: number
  pharmaceuticals: number
  agriculture: number
  finance: number
}

export interface Country {
  id: string
  name: string
  colour: string
  capitalCity: string
  majorCities: Array<{ name: string; lat: number; lng: number }>
  stats: CountryStats
  sectors: CountrySectors
  infrastructure: Infrastructure[]
  relations: Record<string, RelationType>
  organisations: string[]
  nationalisedAssets: string[]
  laws: string[]
  personality?: NationPersonality
}

export interface Organisation {
  id: string
  name: string
  type: OrgType
  members: string[]
  founded: string
  playerCreated: boolean
  colour: string
}

export interface Dispute {
  id: string
  name: string
  parties: string[]
  status: 'active' | 'negotiating' | 'frozen' | 'resolved'
  history: string[]
}

export interface NonStateActor {
  id: string
  name: string
  type: NonStateType
  regions: string[]
  strength: number
  sponsors: string[]
}

export interface SpaceProgramme {
  tier: 0 | 1 | 2 | 3 | 4
  completedMilestones: string[]
  activeProject: string | null
  lunarBase: boolean
  marsBase: boolean
}

export interface Megaproject {
  id: string
  countryId: string
  type: string
  name: string
  startDate: string
  completionDate: string
  progress: number
}

// ── Build queue ───────────────────────────────────────────────────────────────

export const BUILD_WEEKS: Record<InfrastructureType, number> = {
  // Cities / civic
  city: 520,           // ~10 years
  capital: 520,
  embassy: 26,         // 6 months
  stadium: 78,         // 18 months
  arts_centre: 52,     // 1 year
  film_studio: 26,     // 6 months
  emergency_services: 13, // 3 months
  // Transport
  port: 156,           // 3 years
  airport: 156,        // 3 years
  // Energy
  solar_farm: 26,      // 6 months
  wind_farm: 26,
  hydro_dam: 260,      // 5 years
  fossil_fuel_plant: 78, // 18 months
  nuclear_plant: 520,  // 10 years
  // Military
  military_base: 52,   // 1 year
  nuclear_silo: 260,   // 5 years
  defence_system: 104, // 2 years
  // Knowledge / tech
  university: 208,     // 4 years
  research_centre: 156,// 3 years
  intelligence_agency: 78, // 18 months
  telecom_node: 26,    // 6 months
  data_centre: 52,     // 1 year
  // Economy
  financial_institution: 52,
  industrial_zone: 78,
  desalination_plant: 78,
  // Rail
  rail_line: 104,       // 2 years standard rail
  high_speed_rail: 260, // 5 years high-speed
}

export interface BuildProject {
  id: string
  type: InfrastructureType
  name: string
  weeksRemaining: number
  totalWeeks: number
  startDate: string
  countryId?: string
  lat?: number
  lng?: number
  // Rail-specific fields — only set for rail_line / high_speed_rail types
  fromCity?: string
  toCity?: string
  fromCoords?: [number, number]
  toCoords?: [number, number]
  cities?: string[]              // all stops for multi-city rail routes
  waypoints?: [number, number][] // resolved coords for all cities in order
}

// ── Research ──────────────────────────────────────────────────────────────────

export type TechId =
  | 'basic_industry' | 'advanced_manufacturing' | 'photolithography'
  | 'semiconductors' | 'computing' | 'ai_research' | 'nuclear_fission'
  | 'nuclear_fusion' | 'space_launch' | 'satellite_network' | 'moon_landing'
  | 'biotech' | 'renewable_energy' | 'stealth_tech' | 'hypersonics'
  // ── Ancient / Medieval ────────────────────────────────────────────────────
  | 'bronze_working' | 'iron_working' | 'steel_forging'
  | 'hoplite_warfare' | 'cavalry' | 'heavy_cavalry' | 'naval_warfare'
  | 'siege_weapons' | 'fortifications' | 'professional_army'
  | 'road_network' | 'aqueducts' | 'architecture'
  | 'philosophy' | 'mathematics' | 'medicine' | 'astronomy'
  | 'irrigation' | 'qanat_system' | 'crop_rotation'
  | 'coinage' | 'trade_routes' | 'merchant_guilds'
  | 'trebuchet' | 'gunpowder' | 'printing_press'
  | 'plate_armour' | 'longbow' | 'crossbow'
  | 'caravel' | 'cannon' | 'janissary_corps'
  // ── Naval & Exploration ───────────────────────────────────────────────────
  | 'coastal_navigation' | 'cartography' | 'compass_navigation'
  | 'ocean_navigation' | 'deep_sea_exploration'

export interface TechNode {
  id: TechId
  name: string
  description: string
  researchWeeks: number            // realistic research time
  cost: number                     // researchPoints
  prerequisites: TechId[]
  unlocksEra: Era[] // eras where available
}

export interface ResearchProject {
  id: string
  techId: TechId
  weeksRemaining: number
  totalWeeks: number
  startDate: string
}

// ── Natural disasters ─────────────────────────────────────────────────────────

export type DisasterType = 'earthquake' | 'flood' | 'drought' | 'hurricane' | 'wildfire' | 'tsunami' | 'pandemic'
  | 'unrest' | 'rebellion'

export interface DisasterEvent {
  id: string
  type: DisasterType
  name: string
  date: string
  affected: string    // country ISO_A3
  gdpLoss: number
  approvalDelta: number
  description: string
}

export interface GameAction {
  id: string
  text: string
  interpreted?: string
}

export interface WorldEvent {
  headline: string              // e.g. "Kurdistan declares independence"
  narrative: string             // 2 sentence description
  affectedCountry?: string      // ISO_A3 of country most affected
  newNation?: string            // name of newly formed country (if applicable)
  annexedRegion?: string        // province/region name that gains independence
}

export interface ActionResult {
  actionId: string
  outcome: 'success' | 'partial' | 'failure'
  failureReason?: string        // required when outcome is partial or failure
  summary: string
  fullNarrative: string
  worldReaction: string
  statDeltas: Record<string, number>
  tags: string[]
  countryReactions?: Array<{ country: string; stance: 'positive' | 'negative' | 'neutral'; quote: string }>
  domesticReaction?: string
  empireName?: string          // if conquest/expansion occurred, suggest a new empire name
  annexedCountry?: string      // ISO_A3 of entire sovereign country brought under control
  annexedRegion?: string       // province/state name when taking sub-national territory (e.g. "Kashmir", "Crimea")
  focusIso?: string            // ISO_A3 to fly map camera to
  buildProject?: { type: InfrastructureType; name: string; city?: string; fromCity?: string; toCity?: string; cities?: string[] }  // single build (legacy)
  buildProjects?: Array<{ type: InfrastructureType; name: string; city?: string; fromCity?: string; toCity?: string; cities?: string[] }> // multiple builds from one action
  nuclearStrike?: string[]     // ISO_A3 list of countries hit by nuclear strike
  bombardment?: string[]       // ISO_A3 list of countries heavily bombed/damaged
}

export interface LoreEntry {
  id: string
  date: string
  title: string
  narrative: string
  tags: string[]
  involvedCountries: string[]
  statDeltas: Record<string, number>
}

export type NationPersonality = 'aggressive' | 'defensive' | 'trade' | 'isolationist' | 'expansionist' | 'diplomatic'

export interface NationPersonalityModifiers {
  militaryGrowthBonus: number      // e.g. +0.1 = 10% faster military growth
  gdpGrowthBonus: number
  stabilityModifier: number
  diplomaticBonus: number
  warProbabilityMultiplier: number
}

export interface GameState {
  era: Era
  currentDate: string
  playerCountryId: string
  empireName?: string          // set when player has expanded into an empire
  controlledCountries?: string[] // ISO_A3 of countries under player control
  controlledRegions?: Array<{ name: string; adm0_a3: string }> // sub-national provinces/regions under control
  worldEvents?: WorldEvent[]   // random world events that have occurred
  difficulty: Difficulty
  countries: Record<string, Country>
  infrastructureMap: Infrastructure[]
  railLines: RailLine[]
  landUseRegions: LandUseRegion[]
  organisations: Organisation[]
  disputes: Dispute[]
  nonStateActors: NonStateActor[]
  spaceProgrammes: Record<string, SpaceProgramme>
  megaprojects: Megaproject[]
  actionHistory: Array<{ date: string; action: string; outcome: string }>
  pendingActions: GameAction[]
  lastResults: ActionResult[]
  strategicPassages: Record<string, PassageStatus>
  // Build queue
  buildQueue: BuildProject[]
  // Research
  researchQueue: ResearchProject[]
  unlockedTechs: TechId[]
  // Disasters log
  recentDisasters: DisasterEvent[]
  // War damage overlay — persists on map
  warDamage: Record<string, 'bombed' | 'nuked'>
  // Lore log — accumulates every event ever fired
  lore: LoreEntry[]
  // Game flags
  yesman: boolean              // countries auto-accept proposals
  isPaused?: boolean
}

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseUrl?: string
  authToken?: string
  model: string
}

export interface EraStartConditions {
  era: Era
  startDate: string
  countries: Record<string, Country>
  organisations: Organisation[]
  disputes: Dispute[]
  nonStateActors: NonStateActor[]
  strategicPassages: Record<string, PassageStatus>
}
