export type Era =
  // Historical
  | 'bronze_age' | 'classical_greek' | 'alexander' | 'qin_expansion'
  | 'punic_wars' | 'roman_peak' | 'late_antiquity' | 'tang_abbasid'
  | 'high_medieval' | 'age_of_exploration' | 'ottoman_classical'
  | 'enlightenment' | 'industrial_dawn' | 'great_war' | 'interwar'
  // Modern
  | '1945' | '1960s' | '1990s' | '2010s' | 'modern'
  // Legacy (kept for save-game compatibility — will be migrated to historical IDs)
  | 'greek' | 'roman' | 'ottoman' | 'abbasid' | 'tang' | 'aztec' | 'songhai' | 'sengoku'
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
  /** Smart city flag — cities with this set render in cyan. Only meaningful for type: 'city' | 'capital'. */
  is_smart?: boolean
}

export interface RailStation {
  id: string
  lat: number
  lng: number
  name: string
  level: number          // 1-5
  city?: string          // snapped city name (if any)
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
  stations?: RailStation[]        // stops along the line (in order)
  lengthKm?: number               // total length in km, computed at creation
  underConstruction?: boolean     // true while in build queue, false/undefined when complete
  buildProjectId?: string         // id of the build queue entry (set during construction)
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
  /** Total population. Optional — seeded from countryData on first year tick. */
  population?: number
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

/**
 * Upfront cost (USD) to begin construction. Pulled from player debt when queued.
 * Real-world reference values where available.
 */
export const BUILD_COSTS: Record<InfrastructureType, number> = {
  // Cities / civic
  city: 50_000_000_000,            // $50B — major new city
  capital: 100_000_000_000,        // $100B — purpose-built capital
  embassy: 200_000_000,            // $200M
  stadium: 1_500_000_000,          // $1.5B
  arts_centre: 500_000_000,        // $500M
  film_studio: 200_000_000,        // $200M
  emergency_services: 300_000_000, // $300M
  // Transport
  port: 5_000_000_000,             // $5B — major deepwater port
  airport: 8_000_000_000,          // $8B — international airport
  // Energy
  solar_farm: 1_000_000_000,       // $1B — utility scale
  wind_farm: 1_500_000_000,        // $1.5B — offshore wind
  hydro_dam: 15_000_000_000,       // $15B — large hydro
  fossil_fuel_plant: 3_000_000_000, // $3B — combined cycle gas
  nuclear_plant: 25_000_000_000,   // $25B — modern reactor
  // Military
  military_base: 2_000_000_000,    // $2B
  nuclear_silo: 5_000_000_000,     // $5B
  defence_system: 4_000_000_000,   // $4B — missile defence
  // Knowledge / tech
  university: 2_500_000_000,       // $2.5B — research university
  research_centre: 1_500_000_000,  // $1.5B
  intelligence_agency: 1_000_000_000, // $1B
  telecom_node: 500_000_000,       // $500M
  data_centre: 1_500_000_000,      // $1.5B — hyperscale
  // Economy
  financial_institution: 800_000_000, // $800M
  industrial_zone: 4_000_000_000,  // $4B
  desalination_plant: 1_500_000_000, // $1.5B
  // Rail
  rail_line: 8_000_000_000,        // $8B — typical national rail
  high_speed_rail: 25_000_000_000, // $25B — HSR like UK HS2
}

/**
 * Monthly GDP income (USD) generated by each infrastructure once it's complete.
 * This is a recurring stream — applied every month in advanceDate, NOT a
 * one-time boost. Over a few years this compounds to pay back the build cost
 * and then keeps contributing forever. Scaled by the infrastructure's level.
 */
export const BUILD_MONTHLY_INCOME: Record<InfrastructureType, number> = {
  // Cities / civic
  city: 500_000_000,              // $500M/mo = $6B/yr — major urban economy
  capital: 800_000_000,
  embassy: 3_000_000,             // $3M/mo — trade facilitation, minor
  stadium: 15_000_000,            // ticketing, events
  arts_centre: 8_000_000,
  film_studio: 40_000_000,        // film is profitable
  emergency_services: 5_000_000,  // mostly cost-saving (prevents disasters)
  // Transport — high recurring revenue
  port: 120_000_000,              // port fees + trade flow
  airport: 180_000_000,           // passenger + cargo fees
  // Energy
  solar_farm: 15_000_000,         // electricity sales
  wind_farm: 20_000_000,
  hydro_dam: 100_000_000,         // cheap baseload + flood control
  fossil_fuel_plant: 40_000_000,
  nuclear_plant: 150_000_000,     // nuclear = massive energy replaces imports
  // Military — limited GDP value
  military_base: 10_000_000,
  nuclear_silo: 5_000_000,        // pure consumption
  defence_system: 8_000_000,
  // Knowledge / tech
  university: 40_000_000,         // skilled workforce + R&D spin-offs
  research_centre: 25_000_000,
  intelligence_agency: 5_000_000,
  telecom_node: 12_000_000,
  data_centre: 60_000_000,        // cloud revenue
  // Economy
  financial_institution: 30_000_000,
  industrial_zone: 100_000_000,   // exports + employment
  desalination_plant: 20_000_000, // water services
  // Rail — income now comes from stations, not the line itself
  rail_line: 0,
  high_speed_rail: 0,
}

/**
 * Max level per infrastructure type — how much you can reasonably upgrade it.
 * Each level represents real-world expansions / modernisations.
 */
export const BUILD_MAX_LEVEL: Record<InfrastructureType, number> = {
  // Cities can grow a lot
  city: 10,
  capital: 10,
  // Small / fixed facilities — limited upgrade potential
  embassy: 3,                     // basic → expanded → full consulate network
  stadium: 3,                     // expansion/renovation
  arts_centre: 3,
  film_studio: 4,                 // studio lot expansions
  emergency_services: 5,
  // Ports/airports can expand multiple terminals
  port: 6,                        // new berths, new terminals
  airport: 6,                     // runways, terminals
  // Energy — add more generation units
  solar_farm: 8,
  wind_farm: 8,
  hydro_dam: 4,                   // geography limited
  fossil_fuel_plant: 5,
  nuclear_plant: 6,               // additional reactors
  // Military
  military_base: 6,
  nuclear_silo: 4,
  defence_system: 6,              // more interceptors, better radar
  // Knowledge
  university: 8,                  // more faculties
  research_centre: 6,
  intelligence_agency: 5,
  telecom_node: 5,
  data_centre: 8,                 // hyperscale expansion
  // Economy
  financial_institution: 6,
  industrial_zone: 8,             // more factories
  desalination_plant: 5,
  // Rail
  rail_line: 5,                   // double-track, electrification
  high_speed_rail: 4,             // new routes, faster trains
}

export interface PendingPlacement {
  id: string
  type: InfrastructureType
  name: string
  city?: string
  countryId: string
  targetLevel: number
  date: string // when queued
  /** When true, resolving this placement drops a smart city directly into
   *  infrastructureMap (no build queue). Used by smartCity:{target:'new_place'}. */
  isSmartCity?: boolean
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
  // Level semantics — startLevel = current level before this project; targetLevel
  // = level after completion. For brand-new builds, startLevel=0 and targetLevel=1
  // (or higher if the AI chose to skip levels — costs scale exponentially).
  // For upgrades to existing infrastructure, startLevel=existing.level.
  startLevel?: number
  targetLevel?: number
  existingInfraId?: string       // id of the infrastructure being upgraded (if any)
  // Rail-specific fields — only set for rail_line / high_speed_rail types
  fromCity?: string
  toCity?: string
  fromCoords?: [number, number]
  toCoords?: [number, number]
  cities?: string[]              // all stops for multi-city rail routes
  waypoints?: [number, number][] // resolved coords for all cities in order
  // Pending rail line — when this build completes, this RailLine is committed
  // to state.railLines. Used for player-drawn rail lines that need a build period.
  pendingRailLine?: Omit<RailLine, 'id' | 'countryId'>
  // Pending station upgrade — when this build completes, the named station's
  // level is raised to targetLevel.
  pendingStationUpgrade?: {
    stationName: string
    targetLevel: number
  }
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
  // ── Expansion: new modern nodes ───────────────────────────────────────────
  // Military
  | 'aircraft_carriers' | 'special_forces' | 'chemical_weapons' | 'autonomous_weapons'
  // Science
  | 'gene_editing' | 'neural_interfaces' | 'asteroid_mining' | 'fusion_power'
  | 'quantum_internet' | 'synthetic_biology' | 'brain_computer'
  // Economy
  | 'global_supply_chains' | 'free_trade_zones' | 'green_economy' | 'space_commerce'
  // Government
  | 'propaganda_network' | 'digital_id' | 'federal_devolution'
  | 'international_courts' | 'cyber_defence_agency'
  // Society
  | 'universal_basic_income' | 'cultural_exports' | 'immigration_policy'
  // Infrastructure
  | 'desalination' | 'space_elevator' | 'hyperloop' | 'vertical_farming'
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

// ── World Tick Simulation Types ─────────────────────────────────────────────

export interface CountryPersonality {
  aggression: number       // 0-100
  diplomacy: number        // 0-100
  economicFocus: number    // 0-100
  stability: number        // 0-100
  unpredictability: number // 0-20
}

export type WorldTickEventType =
  | 'alliance_proposed' | 'alliance_formed' | 'alliance_dissolved'
  | 'trade_deal_proposed' | 'trade_deal_signed' | 'trade_deal_collapsed'
  | 'peace_talks_initiated' | 'peace_treaty_signed'
  | 'diplomatic_incident' | 'embassy_recalled' | 'sanctions_imposed' | 'sanctions_lifted'
  | 'territorial_claim' | 'military_mobilisation' | 'border_skirmish'
  | 'war_declared' | 'ceasefire' | 'arms_deal'
  | 'military_exercise' | 'naval_standoff'
  | 'coup_attempt' | 'coup_success' | 'election_held'
  | 'protests_erupt' | 'reform_passed' | 'crackdown'
  | 'economic_crisis' | 'economic_boom'
  | 'separatist_movement' | 'leadership_change'
  | 'unexpected_ultimatum' | 'surprise_summit' | 'defection'
  | 'intelligence_leak' | 'humanitarian_crisis'

export interface WorldTickEvent {
  id: string
  type: WorldTickEventType
  date: string
  primaryCountry: string
  targetCountry?: string
  headline: string
  body?: string
  category: NewsCategory
  importance: NewsImportance
  relationsDelta?: Record<string, number>
  statChanges?: Array<{
    country: string
    field: string
    delta: number
  }>
  chainProbabilities?: Array<{
    eventType: WorldTickEventType
    probability: number
    targetCountry?: string
  }>
}

export type NewsCategory = 'economy' | 'military' | 'diplomacy' | 'science' | 'disaster' | 'politics' | 'world' | 'culture' | 'infrastructure' | 'government'
export type NewsImportance = 'breaking' | 'major' | 'minor'

/** A natural resource that has been nationalised by the player country. */
export interface NationalisedResource {
  /** Resource type — e.g. 'oil', 'copper', 'lithium' */
  type: string
  /** Abundance score inherited from COUNTRY_RESOURCES at nationalisation time */
  abundance: number
  /** 1-10 — higher = bigger extraction operation + more cost */
  extractionLevel: number
  /** If true, surplus is sold internationally (doubles income but costs relations) */
  exportsAllowed: boolean
  /** ISO date when nationalised */
  nationalisedDate: string
}

/** A single diplomatic chat message between the player and a foreign country. */
export interface DiplomaticChatMessage {
  role: 'player' | 'country'
  content: string
  date: string
}

/** Incoming diplomatic proposal directed at the player country. */
export interface DiplomaticProposal {
  id: string
  date: string                                 // YYYY-MM-DD when received
  fromCountry: string                          // ISO_A3 of proposing country
  type: 'trade_deal' | 'alliance' | 'arms_deal' | 'peace_talks' | 'summit' | 'sanctions_threat' | 'call_to_arms'
  message: string                              // human-readable proposal text
  status: 'pending' | 'accepted' | 'declined'
  againstIso?: string                          // for call_to_arms: ISO_A3 of the enemy the ally is asking help against
}

export interface NewsItem {
  id: string
  date: string                  // YYYY-MM-DD
  headline: string
  body?: string                 // optional 1-2 sentence detail
  category: NewsCategory
  importance: NewsImportance
  country?: string              // ISO_A3 of primary country
  internal?: boolean            // if true, not shown in public news panel
}

export interface FollowUp {
  id: string
  label: string              // e.g. "Threaten war"
  tone: 'aggressive' | 'diplomatic' | 'conciliatory' | 'neutral'
  hint: string               // preview/tooltip
}

export interface ActionResult {
  actionId: string
  followUps?: FollowUp[]
  outcome: 'success' | 'partial' | 'failure'
  failureReason?: string        // required when outcome is partial or failure
  summary: string
  fullNarrative: string
  worldReaction: string
  statDeltas: Record<string, number>
  societyDeltas?: {
    educationIndex?: number
    happinessIndex?: number
    inequalityIndex?: number
    urbanisationRate?: number
  }
  tags: string[]
  countryReactions?: Array<{ country: string; stance: 'positive' | 'negative' | 'neutral'; quote: string }>
  domesticReaction?: string
  empireName?: string          // if conquest/expansion occurred, suggest a new empire name
  annexedCountry?: string      // ISO_A3 of entire sovereign country brought under control
  transferTo?: string          // ISO_A3 of the country that RECEIVES the annexed land. Omit or set to the player's own ISO → player gains it. Set to any other ISO → that third country gains it (e.g. "Saudi Arabia conquers Iran" → annexedCountry="IRN", transferTo="SAU").
  annexedRegion?: string       // province/state name when taking sub-national territory (e.g. "Kashmir", "Crimea")
  focusIso?: string            // ISO_A3 to fly map camera to
  nationaliseResource?: {      // when action nationalises a natural resource
    type: string               // 'oil', 'copper', 'lithium', etc.
    extractionLevel?: number   // 1-10 — default 3 if unset
    exportsAllowed?: boolean   // default true
  }
  upgradeRailStation?: {       // upgrade an existing rail station's level
    stationName: string        // station name to match (e.g. "Karachi Central")
    targetLevel: number        // 1-5
  }
  buildProject?: { type: InfrastructureType; name: string; city?: string; fromCity?: string; toCity?: string; cities?: string[]; hostCountry?: string; targetLevel?: number }  // single build (legacy)
  buildProjects?: Array<{ type: InfrastructureType; name: string; city?: string; fromCity?: string; toCity?: string; cities?: string[]; hostCountry?: string; targetLevel?: number }> // multiple builds from one action
  nuclearStrike?: string[]     // ISO_A3 list of countries hit by nuclear strike
  bombardment?: string[]       // ISO_A3 list of countries heavily bombed/damaged
  foundColony?: {              // Moon or Mars colony founded by this action
    planet: 'moon' | 'mars'
    name: string               // specific base name (e.g. "Chang'e Base Alpha")
    lat: number                // -90 to 90
    lng: number                // -180 to 180
  }
  smartCity?: {                // Smart-city initiative — three flavours
    target: 'all_major' | 'existing_pick' | 'new_place'
    name?: string              // For 'new_place' (name of the new city) or 'existing_pick' (existing city to match)
    countryId?: string         // For 'all_major', ISO_A3 to scope to (defaults to player's country)
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
  /** Currency display mode — coin (ancient), paper (post-banking), or fiat (industrial+) */
  currencyMode?: 'coin' | 'paper' | 'fiat'
  currentDate: string
  playerCountryId: string
  saveSlot?: string            // unique save filename for this playthrough — set at game creation
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
  // Pending placements — builds where the AI named a specific city we
  // don't know. The UI prompts the player to click on the map to place them.
  pendingPlacements: PendingPlacement[]
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
  // ── World simulation ──────────────────────────────────────────────────────
  worldRelations?: Record<string, number>  // "ISO-ISO" → opinion (-100 to +100)
  // Nationalised natural resources — each generates monthly income
  nationalisedResources?: NationalisedResource[]
  // Diplomatic inbox — incoming proposals from other countries that the player can accept/decline
  diplomaticInbox?: DiplomaticProposal[]
  // Diplomatic chat history — keyed by foreign country name (matches what UI uses)
  diplomaticChats?: Record<string, DiplomaticChatMessage[]>
  // Foreign conquests — countries annexed by a non-player state. Each entry
  // maps a conquered iso to its new owner iso. Drives alternate fill colour
  // and label remap in CountryLayer.
  foreignAnnexations?: Array<{ iso: string; newOwner: string }>
  // Custom display names for conquered territory — keyed by the conquered
  // country's original ISO_A3. Used by the label overlay so the player can
  // rename absorbed land (e.g. "Holy Land" instead of "Israel").
  territoryNames?: Record<string, string>
  // War damage accumulated per enemy (scaled numeric value). Used to drive
  // the surrender threshold. Replaces the older 'bombed' | 'nuked' flag
  // (warDamage) which stays as a visual indicator only.
  warDamageScore?: Record<string, number>
  // Cumulative deaths caused to each country by player actions. Displayed
  // on the country card; also affects international relations.
  deathToll?: Record<string, number>
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

export interface IntelAgency {
  id: string
  name: string
  ownerIso: string
  founded: string
  funding: number      // 0-100
  corruption: number   // 0-100
  efficiency: number   // 0-100
  rank: 'local' | 'regional' | 'global'
  successfulMissions: number
  failedMissions: number
  fundingHighSince?: string
}

export type IntelMissionType =
  | 'infiltration' | 'sabotage' | 'assassination'
  | 'cyber' | 'surveillance' | 'extraction' | 'propaganda'

export interface IntelMission {
  id: string
  agencyId: string
  type: IntelMissionType
  targetIso?: string
  targetName?: string
  startDate: string
  weeksRemaining: number
  totalWeeks: number
  difficulty: number    // 1-10
}

export interface EspionageState {
  agencies: IntelAgency[]
  activeMissions: IntelMission[]
  counterIntelLevel: number
  // ── Legacy fields kept optional for save-file back-compat ──
  agencyBudget?: number
  agencyTier?: number
  operativeCount?: number
  networkStrength?: Record<string, number>
  completedMissions?: EspionageMission[]
  detectedBy?: string[]
}
