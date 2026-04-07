import type { DisasterEvent, NewsItem, NewsCategory, NewsImportance, TechId, WorldEvent, WorldTickEvent } from './types.js'
import { MODERN_COUNTRY_DATA } from './countryData.js'
import { getEraTemplate } from './newsTemplates.js'

// ── Country name lookup ───────────────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  USA: 'the United States', CHN: 'China', RUS: 'Russia', GBR: 'the United Kingdom',
  FRA: 'France', DEU: 'Germany', JPN: 'Japan', KOR: 'South Korea', IND: 'India',
  PAK: 'Pakistan', IRN: 'Iran', TUR: 'Turkey', BRA: 'Brazil', AUS: 'Australia',
  CAN: 'Canada', ISR: 'Israel', SAU: 'Saudi Arabia', EGY: 'Egypt', NGA: 'Nigeria',
  ZAF: 'South Africa', ARG: 'Argentina', MEX: 'Mexico', IDN: 'Indonesia',
  VNM: 'Vietnam', POL: 'Poland', UKR: 'Ukraine', NLD: 'Netherlands',
  SWE: 'Sweden', NOR: 'Norway', CHE: 'Switzerland', ARE: 'the UAE',
  // Ancient polities
  OTT: 'the Ottoman Empire', FRA_OTT: 'France', ESP: 'Spain', ENG: 'England',
  HAB: 'the Habsburgs', MUG: 'the Mughal Empire', VNC: 'Venice', POR: 'Portugal',
  MOR: 'Morocco', SON: 'Songhai',
  // Cold war
  PRK: 'North Korea', TWN: 'Taiwan', GRC: 'Greece', PSE: 'Palestine',
  KHM: 'Cambodia', LAO: 'Laos',
}

export function countryName(iso: string): string {
  return COUNTRY_NAMES[iso] ?? MODERN_COUNTRY_DATA[iso]?.name ?? iso
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ── Disaster news ─────────────────────────────────────────────────────────────
const DISASTER_CATEGORY: Record<string, NewsCategory> = {
  earthquake: 'disaster', flood: 'disaster', drought: 'disaster',
  hurricane: 'disaster', wildfire: 'disaster', tsunami: 'disaster',
  pandemic: 'disaster', unrest: 'politics', rebellion: 'politics',
}

export function newsFromDisaster(d: DisasterEvent): NewsItem {
  const cat = DISASTER_CATEGORY[d.type] ?? 'disaster'
  const importance: NewsImportance = ['tsunami', 'pandemic', 'rebellion'].includes(d.type) ? 'breaking' : 'major'
  const lossStr = d.gdpLoss >= 1e12 ? `$${(d.gdpLoss / 1e12).toFixed(1)}T`
    : d.gdpLoss >= 1e9 ? `$${(d.gdpLoss / 1e9).toFixed(0)}B`
    : `$${(d.gdpLoss / 1e6).toFixed(0)}M`
  return {
    id: uid('news-dis'),
    date: d.date,
    headline: `${d.name} Strikes ${countryName(d.affected)}`,
    body: `Estimated economic damage: ${lossStr}. Authorities are responding to the crisis.`,
    category: cat,
    importance,
    country: d.affected,
  }
}

// ── Tech unlock news ──────────────────────────────────────────────────────────
const TECH_VERBS: Partial<Record<TechId, string>> = {
  nuclear_fission:   'Successfully Tests Nuclear Device',
  nuclear_fusion:    'Achieves Nuclear Fusion Milestone',
  space_launch:      'Launches First Rocket into Orbit',
  satellite_network: 'Deploys Satellite Constellation',
  moon_landing:      'Lands Crew on the Moon',
  ai_research:       'Unveils Breakthrough in Artificial Intelligence',
  stealth_tech:      'Confirms Development of Stealth Aircraft',
  hypersonics:       'Tests Hypersonic Weapons System',
  computing:         'Builds Advanced Computing Infrastructure',
  semiconductors:    'Establishes Domestic Semiconductor Industry',
  photolithography:  'Masters Advanced Chip Manufacturing',
  biotech:           'Announces Biotechnology Research Programme',
  renewable_energy:  'Completes National Renewable Energy Grid',
}

export function newsFromTechUnlock(techId: TechId, techName: string, date: string, countryId: string): NewsItem {
  const verb = TECH_VERBS[techId] ?? `Achieves ${techName} Capability`
  const importance: NewsImportance =
    ['nuclear_fission', 'nuclear_fusion', 'moon_landing', 'space_launch'].includes(techId)
      ? 'breaking' : 'major'
  return {
    id: uid('news-tech'),
    date,
    headline: `${countryName(countryId)} ${verb}`,
    body: `A major technological milestone has been reached, with significant implications for national prestige and capability.`,
    category: 'science',
    importance,
    country: countryId,
  }
}

// ── GDP / economy news ────────────────────────────────────────────────────────
export function newsFromGdpGrowth(countryId: string, gdpBillions: number, rate: number, date: string): NewsItem | null {
  if (Math.abs(rate) < 0.04) return null // only noteworthy swings
  const growing = rate > 0
  const rateStr = `${(Math.abs(rate) * 100).toFixed(1)}%`
  const gdpStr = gdpBillions >= 1000
    ? `$${(gdpBillions / 1000).toFixed(1)}T`
    : `$${gdpBillions.toFixed(0)}B`
  return {
    id: uid('news-gdp'),
    date,
    headline: growing
      ? `${countryName(countryId)} Economy Grows ${rateStr} Amid Investment Surge`
      : `${countryName(countryId)} Economy Contracts ${rateStr} as Conditions Deteriorate`,
    body: `GDP now stands at ${gdpStr}. ${growing ? 'Analysts cite strong trade and technology sectors.' : 'The government faces pressure to implement stimulus measures.'}`,
    category: 'economy',
    importance: rate > 0.08 || rate < -0.05 ? 'major' : 'minor',
    country: countryId,
  }
}

// ── Stability / politics news ─────────────────────────────────────────────────
export function newsFromStabilityEvent(type: 'rebellion' | 'unrest', countryId: string, date: string): NewsItem {
  if (type === 'rebellion') {
    return {
      id: uid('news-pol'),
      date,
      headline: `Armed Rebellion Erupts in ${countryName(countryId)}`,
      body: 'Separatist forces have seized territory in outlying regions. The government has declared a state of emergency.',
      category: 'politics',
      importance: 'breaking',
      country: countryId,
    }
  }
  return {
    id: uid('news-pol'),
    date,
    headline: `Mass Protests Shake ${countryName(countryId)} Government`,
    body: 'Tens of thousands have taken to the streets demanding political change. Stability indices are falling.',
    category: 'politics',
    importance: 'major',
    country: countryId,
  }
}

// ── Action result news ────────────────────────────────────────────────────────
export function newsFromActionResult(
  summary: string,
  date: string,
  countryId: string,
  outcome: 'success' | 'partial' | 'failure',
  tags: string[],
): NewsItem {
  const cat: NewsCategory = tags.includes('military') ? 'military'
    : tags.includes('diplomacy') ? 'diplomacy'
    : tags.includes('economy') ? 'economy'
    : tags.includes('science') ? 'science'
    : 'world'
  const importance: NewsImportance = outcome === 'failure' ? 'minor'
    : tags.some(t => ['military', 'nuclear', 'war'].includes(t)) ? 'breaking' : 'major'
  return {
    id: uid('news-act'),
    date,
    headline: summary,
    category: cat,
    importance,
    country: countryId,
  }
}

// ── World event news ──────────────────────────────────────────────────────────
export function newsFromWorldEvent(event: WorldEvent, date: string): NewsItem {
  return {
    id: uid('news-world'),
    date,
    headline: event.headline,
    body: event.narrative,
    category: 'world',
    importance: 'major',
    country: event.affectedCountry,
  }
}

// ── World tick event news ─────────────────────────────────────────────────
export function newsFromWorldTickEvent(event: WorldTickEvent, era?: string): NewsItem {
  let headline = event.headline
  if (era) {
    const templates = getEraTemplate(era, event.type)
    if (templates.length > 0) {
      const tpl = templates[Math.floor(Math.random() * templates.length)]
      headline = tpl
        .replace('{primary}', countryName(event.primaryCountry ?? 'Unknown'))
        .replace('{target}', countryName(event.targetCountry ?? 'Unknown'))
    }
  }
  return {
    id: event.id.replace('wt', 'news-wt'),
    date: event.date,
    headline,
    body: event.body,
    category: event.category,
    importance: event.importance,
    country: event.primaryCountry,
  }
}

// ── Annexation news ───────────────────────────────────────────────────────────
export function newsFromAnnex(annexingCountry: string, annexedCountry: string, date: string): NewsItem {
  return {
    id: uid('news-annex'),
    date,
    headline: `${countryName(annexingCountry)} Annexes ${countryName(annexedCountry)}`,
    body: 'The international community has expressed mixed reactions to the territorial expansion.',
    category: 'military',
    importance: 'breaking',
    country: annexingCountry,
  }
}
