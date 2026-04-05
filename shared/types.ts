export type Era = '1945' | '1960s' | '1990s' | '2010s' | 'modern' | 'greek' | 'roman' | 'ottoman' | 'abbasid' | 'tang' | 'aztec' | 'songhai' | 'sengoku'
export type EraPhase = 'ancient' | 'industrial' | 'modern'
export type PlanetBody = 'earth' | 'moon' | 'mars'
export type GovernmentType = 'tribal' | 'monarchy' | 'republic' | 'democracy' | 'autocracy' | 'theocracy' | 'military_junta' | 'federal_republic' | 'communist' | 'shogunate'
export type MilitaryDoctrine = 'offensive' | 'defensive' | 'expeditionary' | 'guerrilla' | 'nuclear_deterrence' | 'blitzkrieg'
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
  manufacturing: number  // general manufacturing incl. batteries, microchips, heavy industry
  space: number
  pharmaceuticals: number
  agriculture: number
  finance: number
  infrastructure: number // transport, energy grid, telecoms, public works
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

export type TechCategory =
  | 'infrastructure' | 'military' | 'economy' | 'government' | 'society' | 'science'

export type TechId =
  // ── Modern / Post-1900s ───────────────────────────────────────────────────
  // Infrastructure
  | 'basic_industry' | 'advanced_manufacturing' | 'renewable_energy'
  | 'national_grid' | 'highway_network' | 'high_speed_rail_tech'
  | 'deepwater_port' | 'civil_aviation' | 'water_sanitation'
  | 'telecom_infrastructure' | 'internet_backbone' | '5g_network'
  // Science & Technology
  | 'photolithography' | 'semiconductors' | 'computing' | 'ai_research'
  | 'nuclear_fission' | 'nuclear_fusion' | 'quantum_computing'
  | 'space_launch' | 'satellite_network' | 'moon_landing' | 'mars_mission'
  | 'biotech' | 'genetic_engineering' | 'nanotechnology'
  // Military
  | 'stealth_tech' | 'hypersonics' | 'drone_warfare'
  | 'cyber_warfare' | 'missile_defence' | 'aircraft_carrier'
  // Economy
  | 'central_banking' | 'stock_exchange' | 'free_trade_zone'
  | 'industrial_agriculture' | 'green_agriculture' | 'sovereign_wealth'
  // Government
  | 'census_bureau' | 'civil_service' | 'anti_corruption'
  | 'public_broadcasting' | 'digital_governance'
  // Society
  | 'universal_healthcare' | 'public_education' | 'social_security'
  | 'mass_media' | 'space_programme_culture'
  // Military advanced
  | 'nuclear_weapons' | 'icbm' | 'nuclear_submarine' | 'electronic_warfare'
  | 'cluster_munitions' | 'precision_guided_munitions' | 'drone_swarms'
  | 'space_weapons' | 'bio_weapons' | 'active_protection_systems'
  | 'exoskeleton_infantry'
  // Economy advanced
  | 'derivatives_markets' | 'digital_banking' | 'cryptocurrency'
  | 'trade_bloc' | 'resource_extraction' | 'offshore_finance'
  | 'smart_manufacturing' | 'space_economy'
  // Government advanced
  | 'mass_surveillance' | 'propaganda_apparatus' | 'federalisation'
  | 'electoral_system' | 'judicial_independence' | 'cybersecurity_agency'
  // Society advanced
  | 'social_media_ecosystem' | 'higher_education' | 'cultural_diplomacy'
  | 'universal_broadband' | 'mental_health_system' | 'smart_cities'
  // Science advanced
  | 'advanced_robotics' | 'materials_science' | 'climate_engineering'
  | 'autonomous_vehicles'
  // Infrastructure advanced
  | 'smart_grid' | 'hydrogen_economy' | 'battery_storage'
  // ── Ancient / Medieval ────────────────────────────────────────────────────
  // Metallurgy / Infrastructure
  | 'bronze_working' | 'iron_working' | 'steel_forging'
  | 'road_network' | 'aqueducts' | 'architecture'
  | 'irrigation' | 'qanat_system' | 'crop_rotation'
  // Military
  | 'hoplite_warfare' | 'cavalry' | 'heavy_cavalry' | 'naval_warfare'
  | 'siege_weapons' | 'fortifications' | 'professional_army'
  | 'trebuchet' | 'gunpowder' | 'cannon' | 'janissary_corps'
  | 'plate_armour' | 'longbow' | 'crossbow'
  // Science / Knowledge
  | 'philosophy' | 'mathematics' | 'medicine' | 'astronomy'
  | 'printing_press'
  // Economy
  | 'coinage' | 'trade_routes' | 'merchant_guilds'
  // Naval & Exploration
  | 'coastal_navigation' | 'cartography' | 'compass_navigation'
  | 'caravel' | 'ocean_navigation' | 'deep_sea_exploration'
  // Government / Society
  | 'law_codification' | 'census_taxation' | 'diplomatic_corps'
  | 'state_religion' | 'public_granaries' | 'civic_administration'
  // ── Industrial / 19th Century ─────────────────────────────────────────────
  // Infrastructure
  | 'steam_engine' | 'coal_mining' | 'steel_production' | 'factory_system'
  | 'locomotive' | 'railroad_network' | 'oil_drilling' | 'electricity'
  | 'urban_planning' | 'mechanised_agriculture'
  // Military
  | 'rifle_infantry' | 'field_artillery' | 'machine_gun' | 'early_tank'
  | 'ironclad_warship' | 'bolt_action_rifle' | 'mass_conscription'
  // Science
  | 'telegraph' | 'industrial_chemistry' | 'newspaper_press'
  | 'photography' | 'public_health'
  // Economy
  | 'banking_system' | 'joint_stock_company' | 'central_bank'
  | 'free_market' | 'trade_unions'
  // Government / Society
  | 'nationalism' | 'constitution' | 'colonial_administration'

export interface TechNode {
  id: TechId
  name: string
  description: string
  category: TechCategory
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

export type NewsCategory = 'economy' | 'military' | 'diplomacy' | 'science' | 'disaster' | 'politics' | 'world'
export type NewsImportance = 'breaking' | 'major' | 'minor'

export interface NewsItem {
  id: string
  date: string                  // YYYY-MM-DD
  headline: string
  body?: string                 // optional 1-2 sentence detail
  category: NewsCategory
  importance: NewsImportance
  country?: string              // ISO_A3 of primary country
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
  foundColony?: {              // Moon or Mars colony founded by this action
    planet: 'moon' | 'mars'
    name: string               // specific base name (e.g. "Chang'e Base Alpha")
    lat: number                // -90 to 90
    lng: number                // -180 to 180
  }
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
  // News feed
  newsItems?: NewsItem[]       // recent world headlines
  // Diplomacy
  allies?: string[]            // ISO_A3 of allied nations
  atWarWith?: string[]         // ISO_A3 of nations at war with player
  // Game flags
  yesman: boolean              // countries auto-accept proposals
  isPaused?: boolean
  revealMap?: boolean          // cheat: full map visibility
  // ── Era phase (ancient → industrial → modern) ─────────────────────────────
  eraPhase?: EraPhase
  // ── Deep simulation sub-states ────────────────────────────────────────────
  economy?: EconomyState
  militaryState?: MilitaryState
  politics?: PoliticsState
  society?: SocietyState
  diplomacyState?: DiplomacyState
  // ── Off-world colonies ────────────────────────────────────────────────────
  colonies?: ColonyBase[]
  // ── Active planet view (UI only) ─────────────────────────────────────────
  activePlanet?: PlanetBody
  // ── Espionage / intelligence ──────────────────────────────────────────────
  espionage?: EspionageState
}

// ── Deep simulation state interfaces ─────────────────────────────────────────

export interface EconomyState {
  taxRate: number                    // 0–100 percent
  debt: number                       // USD, negative = surplus
  tradeBalance: number               // USD per year (positive = surplus)
  inflation: number                  // annual %
  industrialisationLevel: number     // 0–100
  sectorShares: {
    agriculture: number              // % of GDP (all four must sum ~100)
    industry: number
    services: number
    military: number
  }
}

export interface MilitaryState {
  landStrength: number               // 0–100
  airStrength: number                // 0–100
  navalStrength: number              // 0–100
  doctrine: MilitaryDoctrine
  morale: number                     // 0–100
  attritionRate: number              // % strength lost per month at war
  mobilisationLevel: number          // 0–100 (how much economy is on war footing)
}

export interface PoliticsState {
  governmentType: GovernmentType
  unrestLevel: number                // 0–100
  corruption: number                 // 0–100
  censorshipLevel: number            // 0–100
  policies: string[]                 // active policy ids
  yearsInPower: number
}

export interface SocietyState {
  population: number                 // total population
  populationGrowthRate: number       // annual %
  educationIndex: number             // 0–100
  happinessIndex: number             // 0–100
  inequalityIndex: number            // 0–100 (Gini-like)
  urbanisationRate: number           // 0–100%
}

export interface DiplomacyState {
  relations: Record<string, {
    opinion: number                  // -100 to +100
    type: RelationType
  }>
  alliances: string[]                // ISO_A3 military partners
  tradeAgreements: string[]          // ISO_A3 trade partners
  sanctions: string[]                // ISO_A3 countries under player's sanctions
  sphereOfInfluence: string[]        // ISO_A3 of subordinate states
  rivals: string[]                   // declared rivals
}

export interface ColonyBase {
  id: string
  planet: 'moon' | 'mars'
  name: string
  lat: number                        // equirectangular degrees
  lng: number
  population: number
  resourceOutput: number             // score per yearly tick
  established: string               // ISO date
  level: 1 | 2 | 3
  terraformProgress?: number         // 0–100, Mars only
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

// ── Espionage / Intelligence ──────────────────────────────────────────────────

export type EspionageMissionType =
  | 'coup'            // destabilise foreign government
  | 'tech_theft'      // steal research/technology
  | 'fund_rebellion'  // finance separatist/rebel groups
  | 'assassination'   // remove foreign leader
  | 'sabotage'        // destroy infrastructure/military
  | 'disinformation'  // spread propaganda in target country
  | 'recruit_agent'   // build spy network in target

export type EspionageMissionStatus = 'planning' | 'active' | 'success' | 'failed' | 'blown'

export interface EspionageMission {
  id: string
  type: EspionageMissionType
  targetIso: string          // ISO A3 of target country
  status: EspionageMissionStatus
  startDate: string
  endDate?: string
  successChance: number      // 0–100
  description: string
  outcome?: string
}

export interface EspionageState {
  agencyBudget: number       // annual budget in USD
  agencyTier: number         // 1–5 (tier 1 = global reach like CIA/Mossad)
  operativeCount: number     // number of trained operatives
  networkStrength: Record<string, number>  // ISO A3 → 0-100 spy network penetration
  activeMissions: EspionageMission[]
  completedMissions: EspionageMission[]
  detectedBy: string[]       // ISO A3 of countries that have identified you as a threat
  counterIntelLevel: number  // 0–100 domestic counter-intelligence
}
