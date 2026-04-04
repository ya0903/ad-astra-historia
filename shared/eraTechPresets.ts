import type { Era, TechId } from './types.js'

// Techs that are pre-unlocked for ALL countries in a given era
// (universal baseline — every country has this foundation)
const ERA_UNIVERSAL_UNLOCKS: Record<Era, TechId[]> = {
  greek:   [],
  roman:   ['bronze_working', 'iron_working'],
  ottoman: ['bronze_working', 'iron_working', 'steel_forging', 'hoplite_warfare', 'cavalry', 'naval_warfare', 'siege_weapons', 'fortifications'],
  '1945':  ['basic_industry'],
  '1960s': ['basic_industry'],
  '1990s': ['basic_industry', 'advanced_manufacturing'],
  '2010s': ['basic_industry', 'advanced_manufacturing'],
  modern:  ['basic_industry', 'advanced_manufacturing'],
}

// Country-specific additional unlocks per era (ISO A3 or polity code → TechId[])
// These reflect real-world capabilities at the start of each era
const ERA_COUNTRY_UNLOCKS: Partial<Record<Era, Record<string, TechId[]>>> = {
  '1945': {
    USA: ['nuclear_fission', 'space_launch', 'photolithography'],
    RUS: ['nuclear_fission'],
    GBR: ['nuclear_fission'],
    FRA: [],
    DEU: [],
    JPN: [],
  },
  '1960s': {
    USA: ['nuclear_fission', 'space_launch', 'photolithography', 'satellite_network', 'moon_landing'],
    RUS: ['nuclear_fission', 'space_launch', 'satellite_network'],
    GBR: ['nuclear_fission'],
    FRA: ['nuclear_fission'],
    CHN: ['nuclear_fission'],
    DEU: [],
    JPN: [],
    IND: [],
    PAK: [],
  },
  '1990s': {
    USA: ['nuclear_fission', 'nuclear_fusion', 'space_launch', 'satellite_network', 'moon_landing', 'photolithography', 'semiconductors', 'computing', 'stealth_tech'],
    RUS: ['nuclear_fission', 'space_launch', 'satellite_network', 'photolithography'],
    GBR: ['nuclear_fission', 'photolithography', 'semiconductors', 'computing'],
    FRA: ['nuclear_fission', 'photolithography', 'semiconductors'],
    CHN: ['nuclear_fission', 'space_launch'],
    DEU: ['photolithography', 'semiconductors', 'computing'],
    JPN: ['photolithography', 'semiconductors', 'computing'],
    KOR: ['photolithography', 'semiconductors'],
    IND: ['nuclear_fission'],
    PAK: ['nuclear_fission'],
    ISR: ['nuclear_fission'],
  },
  '2010s': {
    USA: ['nuclear_fission', 'space_launch', 'satellite_network', 'moon_landing', 'photolithography', 'semiconductors', 'computing', 'ai_research', 'stealth_tech', 'hypersonics', 'renewable_energy', 'biotech'],
    CHN: ['nuclear_fission', 'space_launch', 'satellite_network', 'photolithography', 'semiconductors', 'computing', 'ai_research', 'renewable_energy'],
    RUS: ['nuclear_fission', 'space_launch', 'satellite_network', 'photolithography', 'computing', 'hypersonics'],
    GBR: ['nuclear_fission', 'photolithography', 'semiconductors', 'computing', 'ai_research', 'renewable_energy', 'biotech'],
    FRA: ['nuclear_fission', 'photolithography', 'semiconductors', 'computing', 'renewable_energy'],
    DEU: ['photolithography', 'semiconductors', 'computing', 'renewable_energy', 'biotech'],
    JPN: ['photolithography', 'semiconductors', 'computing', 'ai_research', 'renewable_energy', 'biotech'],
    KOR: ['photolithography', 'semiconductors', 'computing', 'ai_research', 'renewable_energy'],
    IND: ['nuclear_fission', 'space_launch', 'computing', 'renewable_energy'],
    PAK: ['nuclear_fission'],
    ISR: ['nuclear_fission', 'computing', 'ai_research'],
    IRN: ['nuclear_fission'],
    SAU: ['renewable_energy'],
    AUS: ['computing', 'renewable_energy'],
    CAN: ['nuclear_fission', 'computing', 'renewable_energy'],
    TUR: ['computing'],
    BRA: ['space_launch', 'computing'],
    ZAF: ['nuclear_fission'],
    NGA: [],
    EGY: [],
    VNM: [],
    IDN: ['computing'],
  },
  modern: {
    USA: ['nuclear_fission', 'space_launch', 'satellite_network', 'moon_landing', 'photolithography', 'semiconductors', 'computing', 'ai_research', 'stealth_tech', 'hypersonics', 'renewable_energy', 'biotech'],
    CHN: ['nuclear_fission', 'space_launch', 'satellite_network', 'photolithography', 'semiconductors', 'computing', 'ai_research', 'stealth_tech', 'hypersonics', 'renewable_energy', 'biotech'],
    RUS: ['nuclear_fission', 'space_launch', 'satellite_network', 'photolithography', 'computing', 'hypersonics', 'stealth_tech'],
    GBR: ['nuclear_fission', 'photolithography', 'semiconductors', 'computing', 'ai_research', 'renewable_energy', 'biotech'],
    FRA: ['nuclear_fission', 'photolithography', 'semiconductors', 'computing', 'renewable_energy', 'biotech'],
    DEU: ['photolithography', 'semiconductors', 'computing', 'ai_research', 'renewable_energy', 'biotech'],
    JPN: ['photolithography', 'semiconductors', 'computing', 'ai_research', 'renewable_energy', 'biotech'],
    KOR: ['photolithography', 'semiconductors', 'computing', 'ai_research', 'renewable_energy'],
    IND: ['nuclear_fission', 'space_launch', 'computing', 'renewable_energy', 'biotech'],
    PAK: ['nuclear_fission', 'computing'],
    ISR: ['nuclear_fission', 'computing', 'ai_research', 'semiconductors'],
    IRN: ['nuclear_fission', 'computing'],
    SAU: ['renewable_energy', 'computing'],
    TUR: ['computing', 'renewable_energy'],
    AUS: ['computing', 'renewable_energy', 'ai_research'],
    CAN: ['nuclear_fission', 'computing', 'renewable_energy', 'ai_research'],
    BRA: ['space_launch', 'computing', 'renewable_energy'],
    NGA: ['computing'],
    EGY: ['computing'],
    IDN: ['computing', 'renewable_energy'],
    VNM: ['computing'],
    ZAF: ['nuclear_fission', 'computing'],
    POL: ['computing', 'renewable_energy'],
    UKR: ['nuclear_fission', 'computing'],
    ARE: ['renewable_energy', 'computing'],
    CHE: ['computing', 'ai_research', 'biotech'],
    SWE: ['computing', 'ai_research', 'renewable_energy'],
    NOR: ['computing', 'renewable_energy'],
    NLD: ['computing', 'ai_research', 'semiconductors'],
  },
  // Ancient eras — handled by era_universal
  greek:   {},
  roman:   {},
  ottoman: {
    OTT: ['iron_working', 'steel_forging', 'hoplite_warfare', 'cavalry', 'heavy_cavalry', 'naval_warfare', 'siege_weapons', 'trebuchet', 'professional_army', 'fortifications', 'longbow', 'crossbow', 'plate_armour'],
    FRA: ['iron_working', 'steel_forging', 'cavalry', 'heavy_cavalry', 'professional_army', 'fortifications', 'crossbow'],
    ESP: ['iron_working', 'steel_forging', 'cavalry', 'heavy_cavalry', 'naval_warfare', 'professional_army', 'fortifications'],
    ENG: ['iron_working', 'steel_forging', 'cavalry', 'naval_warfare', 'longbow', 'fortifications'],
    HAB: ['iron_working', 'steel_forging', 'heavy_cavalry', 'professional_army', 'fortifications'],
    MUG: ['iron_working', 'steel_forging', 'cavalry', 'heavy_cavalry', 'professional_army'],
  },
}

/**
 * Returns the list of tech IDs that should be pre-unlocked for a country
 * when starting a new game in a given era.
 */
export function getEraStartUnlocks(era: Era, countryId: string): TechId[] {
  const universal = ERA_UNIVERSAL_UNLOCKS[era] ?? []
  const countrySpecific = ERA_COUNTRY_UNLOCKS[era]?.[countryId] ?? []
  // Deduplicate
  return [...new Set([...universal, ...countrySpecific])] as TechId[]
}
