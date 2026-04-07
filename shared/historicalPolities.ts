import type { CountryPersonality } from './types.js'

export type CivTier = 1 | 2 | 3 | 4 | 5 | 6

export interface HistoricalPolityData {
  name: string
  population: number
  gdp: number
  military: number
  tier: CivTier
  governmentType: string
  bonusTechs: string[]
  missingTechs: string[]
  personality: CountryPersonality
  fillColour?: string
}

/** Slug-ifies a polity name into the deterministic polity ID format. */
export function polityIdFor(eraId: string, name: string): string {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${eraId}:${slug}`
}

/** Tier defaults — each tier inherits all techs from lower tiers PLUS its own. */
export const TIER_DEFAULTS: Record<CivTier, string[]> = {
  1: [
    'stoneworking', 'fire_use', 'basic_weapons',
  ],
  2: [
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
  ],
  3: [
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
    'iron_working', 'philosophy', 'mathematics', 'currency', 'architecture', 'writing', 'sailing',
  ],
  4: [
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
    'iron_working', 'philosophy', 'mathematics', 'currency', 'architecture', 'writing', 'sailing',
    'city_planning', 'professional_army', 'road_network', 'imperial_administration', 'advanced_metallurgy', 'masonry',
  ],
  5: [
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
    'iron_working', 'philosophy', 'mathematics', 'currency', 'architecture', 'writing', 'sailing',
    'city_planning', 'professional_army', 'road_network', 'imperial_administration', 'advanced_metallurgy', 'masonry',
    'gunpowder', 'printing_press', 'banking', 'naval_exploration', 'cartography',
  ],
  6: [
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
    'iron_working', 'philosophy', 'mathematics', 'currency', 'architecture', 'writing', 'sailing',
    'city_planning', 'professional_army', 'road_network', 'imperial_administration', 'advanced_metallurgy', 'masonry',
    'gunpowder', 'printing_press', 'banking', 'naval_exploration', 'cartography',
    'steam_power', 'railways', 'factory_system', 'telegraph', 'industrial_chemistry',
  ],
}

/** Hand-tuned colours for major historical empires. */
export const MAJOR_POLITY_COLOURS: Record<string, string> = {
  'bronze_age:egypt':                '#e6c674',
  'bronze_age:hittites':             '#a83232',
  'bronze_age:babylon':              '#d4a017',
  'bronze_age:indus_valley':         '#c97b3c',
  'classical_greek:athens':          '#3a72b8',
  'classical_greek:sparta':          '#9b1f1f',
  'classical_greek:persia':          '#6a3a8e',
  'classical_greek:carthage':        '#7c4a14',
  'alexander:macedon':               '#1a5fa8',
  'qin_expansion:qin':               '#8a1c1c',
  'qin_expansion:mauryan':           '#d68f3a',
  'punic_wars:rome':                 '#7c1a1a',
  'punic_wars:carthage':             '#7c4a14',
  'punic_wars:seleucid':             '#5e3a8a',
  'roman_peak:roman_empire':         '#7c1a1a',
  'roman_peak:han_china':            '#c08a2a',
  'roman_peak:parthia':              '#5e3a8a',
  'late_antiquity:sassanid':         '#6a3a8e',
  'late_antiquity:gupta':            '#d68f3a',
  'late_antiquity:byzantine':        '#7c1a44',
  'tang_abbasid:tang':               '#c0382a',
  'tang_abbasid:abbasid':            '#1a6e3a',
  'tang_abbasid:carolingian':        '#3a4a8e',
  'high_medieval:mongol':            '#7c4a14',
  'high_medieval:song':              '#b8553a',
  'high_medieval:mamluk':            '#1a8e6e',
  'age_of_exploration:ming':         '#c0382a',
  'age_of_exploration:aztec':        '#3a8e44',
  'age_of_exploration:inca':         '#d68f3a',
  'ottoman_classical:ottoman':       '#0a6e3a',
  'ottoman_classical:habsburg':      '#7c1a44',
  'ottoman_classical:mughal':        '#3a8e8e',
  'ottoman_classical:safavid':       '#5e3a8a',
  'enlightenment:bourbon_france':    '#1a3a8e',
  'enlightenment:qing':              '#c0382a',
  'enlightenment:russia':            '#3a4a8e',
  'industrial_dawn:british_empire':  '#7c1a1a',
  'industrial_dawn:germany':         '#3a3a3a',
  'industrial_dawn:meiji_japan':     '#c0382a',
}

export const HISTORICAL_POLITIES: Record<string, HistoricalPolityData> = {
  // ── Bronze Age (1500 BCE) ──
  'bronze_age:egypt': {
    name: 'New Kingdom Egypt', population: 4_500_000, gdp: 8_000_000_000, military: 70, tier: 2,
    governmentType: 'monarchy',
    bonusTechs: ['monumental_architecture', 'irrigation', 'writing'],
    missingTechs: [],
    personality: { aggression: 55, diplomacy: 55, economicFocus: 65, stability: 75, unpredictability: 8 },
  },
  'bronze_age:hittites': {
    name: 'Hittite Empire', population: 2_500_000, gdp: 4_000_000_000, military: 75, tier: 2,
    governmentType: 'monarchy',
    bonusTechs: ['advanced_metallurgy', 'professional_army'],
    missingTechs: [],
    personality: { aggression: 75, diplomacy: 50, economicFocus: 45, stability: 60, unpredictability: 12 },
  },
  'bronze_age:babylon': {
    name: 'Babylonian Kingdom', population: 2_000_000, gdp: 3_500_000_000, military: 60, tier: 2,
    governmentType: 'monarchy',
    bonusTechs: ['mathematics', 'astronomy', 'writing'],
    missingTechs: [],
    personality: { aggression: 50, diplomacy: 65, economicFocus: 70, stability: 65, unpredictability: 10 },
  },
  'bronze_age:indus_valley': {
    name: 'Indus Valley Civilisation', population: 5_000_000, gdp: 6_000_000_000, military: 40, tier: 2,
    governmentType: 'oligarchy',
    bonusTechs: ['city_planning', 'sanitation'],
    missingTechs: ['professional_army'],
    personality: { aggression: 25, diplomacy: 70, economicFocus: 80, stability: 75, unpredictability: 6 },
  },
  // ── Classical Greek (431 BCE) ──
  'classical_greek:athens': {
    name: 'Athens', population: 250_000, gdp: 800_000_000, military: 65, tier: 3,
    governmentType: 'democracy',
    bonusTechs: ['philosophy', 'democracy', 'naval_warfare', 'theatre'],
    missingTechs: [],
    personality: { aggression: 65, diplomacy: 80, economicFocus: 75, stability: 70, unpredictability: 12 },
  },
  'classical_greek:sparta': {
    name: 'Sparta', population: 150_000, gdp: 300_000_000, military: 95, tier: 3,
    governmentType: 'oligarchy',
    bonusTechs: ['professional_army', 'phalanx_warfare'],
    missingTechs: ['philosophy', 'theatre'],
    personality: { aggression: 90, diplomacy: 30, economicFocus: 25, stability: 85, unpredictability: 8 },
  },
  'classical_greek:persia': {
    name: 'Achaemenid Persia', population: 17_000_000, gdp: 12_000_000_000, military: 80, tier: 4,
    governmentType: 'monarchy',
    bonusTechs: ['imperial_administration', 'road_network', 'cavalry'],
    missingTechs: [],
    personality: { aggression: 60, diplomacy: 70, economicFocus: 65, stability: 70, unpredictability: 10 },
  },
  'classical_greek:carthage': {
    name: 'Carthage', population: 1_500_000, gdp: 3_500_000_000, military: 70, tier: 3,
    governmentType: 'oligarchy',
    bonusTechs: ['naval_warfare', 'merchant_guilds', 'colonisation'],
    missingTechs: [],
    personality: { aggression: 55, diplomacy: 60, economicFocus: 90, stability: 65, unpredictability: 12 },
  },
  // ── Roman Peak (117 CE) ──
  'roman_peak:roman_empire': {
    name: 'Roman Empire', population: 60_000_000, gdp: 45_000_000_000, military: 95, tier: 4,
    governmentType: 'monarchy',
    bonusTechs: ['professional_army', 'road_network', 'aqueducts', 'imperial_law', 'concrete'],
    missingTechs: [],
    personality: { aggression: 70, diplomacy: 60, economicFocus: 70, stability: 75, unpredictability: 8 },
  },
  'roman_peak:han_china': {
    name: 'Han Empire', population: 60_000_000, gdp: 50_000_000_000, military: 90, tier: 4,
    governmentType: 'monarchy',
    bonusTechs: ['paper_making', 'imperial_administration', 'silk_trade', 'crossbow'],
    missingTechs: [],
    personality: { aggression: 55, diplomacy: 65, economicFocus: 80, stability: 80, unpredictability: 6 },
  },
  'roman_peak:parthia': {
    name: 'Parthian Empire', population: 8_000_000, gdp: 12_000_000_000, military: 75, tier: 4,
    governmentType: 'monarchy',
    bonusTechs: ['cataphract', 'horse_archery', 'silk_trade'],
    missingTechs: [],
    personality: { aggression: 65, diplomacy: 50, economicFocus: 60, stability: 60, unpredictability: 14 },
  },
  // ── Tang & Abbasid (800 CE) ──
  'tang_abbasid:tang': {
    name: 'Tang Dynasty', population: 50_000_000, gdp: 55_000_000_000, military: 85, tier: 5,
    governmentType: 'monarchy',
    bonusTechs: ['gunpowder', 'paper_money', 'silk_trade', 'civil_service_exam', 'porcelain'],
    missingTechs: [],
    personality: { aggression: 50, diplomacy: 75, economicFocus: 85, stability: 80, unpredictability: 8 },
  },
  'tang_abbasid:abbasid': {
    name: 'Abbasid Caliphate', population: 30_000_000, gdp: 40_000_000_000, military: 80, tier: 5,
    governmentType: 'theocracy',
    bonusTechs: ['mathematics', 'astronomy', 'medicine', 'banking', 'paper_making'],
    missingTechs: [],
    personality: { aggression: 55, diplomacy: 70, economicFocus: 80, stability: 70, unpredictability: 10 },
  },
  // ── Ottoman Classical (1530 CE) ──
  'ottoman_classical:ottoman': {
    name: 'Ottoman Empire', population: 25_000_000, gdp: 50_000_000_000, military: 95, tier: 5,
    governmentType: 'monarchy',
    bonusTechs: ['city_planning', 'janissary_corps', 'gunpowder_artillery', 'naval_warfare', 'cartography'],
    missingTechs: [],
    personality: { aggression: 75, diplomacy: 65, economicFocus: 70, stability: 80, unpredictability: 10 },
  },
  'ottoman_classical:habsburg': {
    name: 'Habsburg Empire', population: 22_000_000, gdp: 45_000_000_000, military: 80, tier: 5,
    governmentType: 'monarchy',
    bonusTechs: ['printing_press', 'banking', 'colonial_administration'],
    missingTechs: [],
    personality: { aggression: 60, diplomacy: 75, economicFocus: 70, stability: 65, unpredictability: 12 },
  },
  'ottoman_classical:mughal': {
    name: 'Mughal Empire', population: 100_000_000, gdp: 90_000_000_000, military: 75, tier: 5,
    governmentType: 'monarchy',
    bonusTechs: ['city_planning', 'cotton_textiles', 'banking'],
    missingTechs: [],
    personality: { aggression: 50, diplomacy: 65, economicFocus: 90, stability: 70, unpredictability: 10 },
  },
  // ── Industrial Dawn (1880 CE) ──
  'industrial_dawn:british_empire': {
    name: 'British Empire', population: 35_000_000, gdp: 200_000_000_000, military: 95, tier: 6,
    governmentType: 'monarchy',
    bonusTechs: ['railways', 'naval_dominance', 'factory_system', 'telegraph', 'electricity'],
    missingTechs: [],
    personality: { aggression: 60, diplomacy: 80, economicFocus: 90, stability: 85, unpredictability: 6 },
  },
  'industrial_dawn:germany': {
    name: 'German Empire', population: 45_000_000, gdp: 180_000_000_000, military: 90, tier: 6,
    governmentType: 'monarchy',
    bonusTechs: ['steel_production', 'chemistry', 'railways', 'electricity'],
    missingTechs: [],
    personality: { aggression: 70, diplomacy: 60, economicFocus: 85, stability: 80, unpredictability: 12 },
  },
  'industrial_dawn:meiji_japan': {
    name: 'Empire of Japan', population: 38_000_000, gdp: 60_000_000_000, military: 75, tier: 6,
    governmentType: 'monarchy',
    bonusTechs: ['railways', 'factory_system', 'naval_dominance'],
    missingTechs: [],
    personality: { aggression: 70, diplomacy: 55, economicFocus: 80, stability: 85, unpredictability: 14 },
  },
  // ── Additional polities to reach 22+ ──
  'roman_peak:kushan': {
    name: 'Kushan Empire', population: 7_000_000, gdp: 9_000_000_000, military: 65, tier: 4,
    governmentType: 'monarchy',
    bonusTechs: ['silk_trade', 'cavalry'],
    missingTechs: [],
    personality: { aggression: 55, diplomacy: 65, economicFocus: 75, stability: 65, unpredictability: 12 },
  },
  'tang_abbasid:carolingian': {
    name: 'Carolingian Empire', population: 12_000_000, gdp: 8_000_000_000, military: 70, tier: 4,
    governmentType: 'monarchy',
    bonusTechs: ['feudalism', 'heavy_cavalry'],
    missingTechs: [],
    personality: { aggression: 65, diplomacy: 55, economicFocus: 50, stability: 60, unpredictability: 12 },
  },
  'ottoman_classical:safavid': {
    name: 'Safavid Persia', population: 8_000_000, gdp: 18_000_000_000, military: 75, tier: 5,
    governmentType: 'theocracy',
    bonusTechs: ['gunpowder_artillery', 'silk_trade'],
    missingTechs: [],
    personality: { aggression: 60, diplomacy: 55, economicFocus: 70, stability: 65, unpredictability: 12 },
  },
}

/** Returns the tier of a known polity, or a tier inferred from its era. */
export function resolvePolityTier(polityId: string): CivTier {
  const known = HISTORICAL_POLITIES[polityId]
  if (known) return known.tier
  const era = polityId.split(':')[0]
  switch (era) {
    case 'bronze_age': return 2
    case 'classical_greek':
    case 'alexander':
    case 'qin_expansion':
    case 'punic_wars': return 3
    case 'roman_peak':
    case 'late_antiquity': return 4
    case 'tang_abbasid':
    case 'high_medieval':
    case 'age_of_exploration': return 4
    case 'ottoman_classical':
    case 'enlightenment': return 5
    case 'industrial_dawn':
    case 'great_war':
    case 'interwar': return 6
    default: return 3
  }
}

function djb2(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  return h
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const colour = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * colour).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function generatePolityColour(name: string, era: string): string {
  const id = polityIdFor(era, name)
  if (MAJOR_POLITY_COLOURS[id]) return MAJOR_POLITY_COLOURS[id]
  const hash = djb2(`${era}:${name}`)
  const hue = hash % 360
  const sat = 55 + ((hash >> 8) % 20)
  const light = 45 + ((hash >> 16) % 15)
  return hslToHex(hue, sat, light)
}
