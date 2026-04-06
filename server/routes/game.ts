import { Router } from 'express'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { ERA_START_DATES, getCountryColour } from '@ad-astra/shared/countries'
import type { Era, EraStartConditions, Country, CountryStats, CountrySectors, PassageStatus } from '@ad-astra/shared/types'
import { ERA_DISPUTES, ERA_NON_STATE_ACTORS } from '@ad-astra/shared/eraConflicts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ERAS_DIR = join(__dirname, '../../shared/eras')

const VALID_ERAS: Era[] = ['1945', '1960s', '1990s', '2010s', 'modern', 'greek', 'roman', 'ottoman']

function isValidEra(era: string): era is Era {
  return VALID_ERAS.includes(era as Era)
}

function getEraFilePath(era: Era): string {
  return join(ERAS_DIR, `${era}.geojson`)
}

// ── Realistic base stats by polity/ISO code ───────────────────────────────
// military 0–100, techLevel 0–100, stability 0–100, softPower 0–100, culturalReach 0–100
// These override the flat defaults so countries start differentiated.
const POLITY_BASE_STATS: Record<string, { military: number; techLevel: number; stability: number; softPower: number; culturalReach: number }> = {
  // ── Ottoman era polities (1520 CE) ─────────────────────────────────────
  OTT: { military:85, techLevel:55, stability:72, softPower:60, culturalReach:65 },
  SAF: { military:75, techLevel:52, stability:58, softPower:55, culturalReach:55 },
  HAB: { military:70, techLevel:65, stability:52, softPower:52, culturalReach:50 },
  HRE: { military:58, techLevel:62, stability:38, softPower:45, culturalReach:48 },
  FRA_OTT: { military:65, techLevel:62, stability:65, softPower:68, culturalReach:65 },  // Ottoman-era France (Kingdom of France)
  ENG: { military:50, techLevel:57, stability:70, softPower:42, culturalReach:40 },
  PLT: { military:68, techLevel:48, stability:58, softPower:38, culturalReach:35 },
  ESP: { military:80, techLevel:60, stability:62, softPower:58, culturalReach:55 },
  POR: { military:52, techLevel:68, stability:70, softPower:52, culturalReach:58 },
  MUS: { military:58, techLevel:38, stability:60, softPower:28, culturalReach:25 },
  MUG: { military:82, techLevel:55, stability:62, softPower:62, culturalReach:60 },
  SON: { military:60, techLevel:33, stability:55, softPower:32, culturalReach:28 },
  VNC: { military:48, techLevel:72, stability:75, softPower:75, culturalReach:72 },
  MOR: { military:52, techLevel:43, stability:58, softPower:35, culturalReach:32 },
  ETI: { military:55, techLevel:38, stability:65, softPower:38, culturalReach:35 },
  ACH: { military:48, techLevel:42, stability:52, softPower:32, culturalReach:28 },
  ARA: { military:42, techLevel:38, stability:42, softPower:48, culturalReach:45 },
  NUB: { military:38, techLevel:32, stability:55, softPower:28, culturalReach:25 },
  EUN: { military:62, techLevel:48, stability:48, softPower:42, culturalReach:40 },
  // ── Greek era polities (431 BCE) ──────────────────────────────────────
  ATH: { military:70, techLevel:78, stability:52, softPower:88, culturalReach:80 },
  SPA: { military:92, techLevel:38, stability:65, softPower:35, culturalReach:30 },
  MAC: { military:58, techLevel:45, stability:68, softPower:35, culturalReach:30 },
  THE: { military:65, techLevel:52, stability:58, softPower:45, culturalReach:40 },
  EPI: { military:48, techLevel:38, stability:62, softPower:28, culturalReach:22 },
  ILY: { military:45, techLevel:25, stability:48, softPower:18, culturalReach:15 },
  ITL: { military:50, techLevel:32, stability:38, softPower:22, culturalReach:18 },
  SRC: { military:60, techLevel:58, stability:65, softPower:52, culturalReach:48 },
  KMT: { military:65, techLevel:68, stability:70, softPower:78, culturalReach:72 },
  CAR: { military:72, techLevel:62, stability:65, softPower:55, culturalReach:50 },
  CEL: { military:62, techLevel:28, stability:38, softPower:18, culturalReach:15 },
  SCY: { military:68, techLevel:22, stability:42, softPower:14, culturalReach:12 },
  TRH: { military:44, techLevel:42, stability:48, softPower:38, culturalReach:35 },
  // ── Roman era polities (117 CE) ──────────────────────────────────────
  ROM: { military:95, techLevel:82, stability:62, softPower:92, culturalReach:90 },
  PAR: { military:76, techLevel:65, stability:58, softPower:60, culturalReach:55 },
  KUS: { military:65, techLevel:58, stability:65, softPower:52, culturalReach:48 },
  DEC: { military:55, techLevel:52, stability:58, softPower:45, culturalReach:42 },
  GER: { military:62, techLevel:22, stability:32, softPower:18, culturalReach:15 },
  SAR: { military:60, techLevel:18, stability:32, softPower:14, culturalReach:12 },
  AXU: { military:55, techLevel:45, stability:65, softPower:45, culturalReach:40 },
  ARK: { military:50, techLevel:42, stability:55, softPower:38, culturalReach:35 },
  // ── Major modern countries ─────────────────────────────────────────────
  USA: { military:100, techLevel:95, stability:78, softPower:95, culturalReach:98 },
  CHN: { military:88, techLevel:78, stability:68, softPower:65, culturalReach:72 },
  RUS: { military:82, techLevel:72, stability:55, softPower:58, culturalReach:62 },
  GBR: { military:68, techLevel:88, stability:80, softPower:88, culturalReach:90 },
  FRA: { military:67, techLevel:86, stability:72, softPower:90, culturalReach:88 },
  DEU: { military:62, techLevel:92, stability:85, softPower:82, culturalReach:82 },
  JPN: { military:55, techLevel:94, stability:88, softPower:80, culturalReach:78 },
  IND: { military:72, techLevel:65, stability:62, softPower:62, culturalReach:70 },
  ISR: { military:76, techLevel:88, stability:62, softPower:52, culturalReach:48 },
  KOR: { military:65, techLevel:92, stability:80, softPower:75, culturalReach:72 },
  SAU: { military:65, techLevel:60, stability:68, softPower:58, culturalReach:52 },
  IRN: { military:68, techLevel:62, stability:52, softPower:52, culturalReach:55 },
  TUR: { military:70, techLevel:65, stability:55, softPower:60, culturalReach:58 },
  BRA: { military:55, techLevel:60, stability:58, softPower:62, culturalReach:65 },
  PAK: { military:65, techLevel:45, stability:45, softPower:38, culturalReach:40 },
  NGA: { military:52, techLevel:38, stability:42, softPower:42, culturalReach:48 },
  EGY: { military:60, techLevel:48, stability:55, softPower:52, culturalReach:58 },
  ZAF: { military:48, techLevel:58, stability:55, softPower:52, culturalReach:52 },
  ARG: { military:42, techLevel:62, stability:48, softPower:52, culturalReach:55 },
  MEX: { military:42, techLevel:55, stability:48, softPower:55, culturalReach:60 },
  IDN: { military:55, techLevel:52, stability:60, softPower:45, culturalReach:52 },
  AUS: { military:52, techLevel:85, stability:88, softPower:72, culturalReach:68 },
  CAN: { military:48, techLevel:85, stability:90, softPower:75, culturalReach:70 },
  NLD: { military:42, techLevel:88, stability:90, softPower:72, culturalReach:68 },
  SWE: { military:42, techLevel:90, stability:92, softPower:75, culturalReach:68 },
  NOR: { military:42, techLevel:88, stability:95, softPower:72, culturalReach:62 },
  CHE: { military:35, techLevel:92, stability:96, softPower:78, culturalReach:65 },
  POL: { military:58, techLevel:72, stability:75, softPower:55, culturalReach:52 },
  UKR: { military:65, techLevel:65, stability:42, softPower:42, culturalReach:45 },
  VNM: { military:58, techLevel:55, stability:68, softPower:38, culturalReach:40 },
  THA: { military:52, techLevel:58, stability:58, softPower:48, culturalReach:52 },
  MYS: { military:45, techLevel:62, stability:68, softPower:45, culturalReach:48 },
  SGP: { military:48, techLevel:90, stability:92, softPower:72, culturalReach:65 },
  IRQ: { military:45, techLevel:38, stability:28, softPower:28, culturalReach:35 },
  SYR: { military:38, techLevel:35, stability:18, softPower:22, culturalReach:30 },
  AFG: { military:32, techLevel:22, stability:20, softPower:15, culturalReach:18 },
  PRK: { military:62, techLevel:42, stability:55, softPower:15, culturalReach:12 },
  CUB: { military:38, techLevel:52, stability:62, softPower:42, culturalReach:45 },
  VEN: { military:38, techLevel:42, stability:28, softPower:32, culturalReach:38 },
  // ── Abbasid era polities ──────────────────────────────────────────────────
  ABB: { military:88, techLevel:82, stability:62, softPower:90, culturalReach:88 },
  BYZ: { military:78, techLevel:78, stability:65, softPower:75, culturalReach:80 },
  FRK: { military:82, techLevel:55, stability:60, softPower:58, culturalReach:60 },
  UMA: { military:68, techLevel:65, stability:55, softPower:72, culturalReach:70 },
  SAM: { military:65, techLevel:72, stability:62, softPower:68, culturalReach:72 },
  KHZ: { military:62, techLevel:38, stability:52, softPower:32, culturalReach:28 },
  BUL: { military:65, techLevel:42, stability:55, softPower:35, culturalReach:32 },
  IDR: { military:48, techLevel:45, stability:58, softPower:40, culturalReach:38 },
  PRH: { military:68, techLevel:50, stability:55, softPower:48, culturalReach:52 },
  PAL: { military:55, techLevel:58, stability:60, softPower:55, culturalReach:58 },
  // ── Tang era polities ─────────────────────────────────────────────────────
  TNG: { military:90, techLevel:85, stability:68, softPower:88, culturalReach:90 },
  TIB: { military:78, techLevel:42, stability:58, softPower:38, culturalReach:35 },
  GOK: { military:72, techLevel:32, stability:45, softPower:28, culturalReach:25 },
  SLL: { military:60, techLevel:55, stability:70, softPower:55, culturalReach:52 },
  NAR: { military:52, techLevel:60, stability:72, softPower:62, culturalReach:58 },
  NNZ: { military:58, techLevel:40, stability:55, softPower:35, culturalReach:32 },
  KHR: { military:65, techLevel:52, stability:60, softPower:55, culturalReach:52 },
  CLK: { military:68, techLevel:58, stability:58, softPower:55, culturalReach:55 },
  // ── Aztec era polities ────────────────────────────────────────────────────
  AZT: { military:85, techLevel:55, stability:62, softPower:68, culturalReach:65 },
  TLX: { military:65, techLevel:48, stability:72, softPower:42, culturalReach:38 },
  MYA: { military:55, techLevel:58, stability:48, softPower:62, culturalReach:60 },
  INC: { military:80, techLevel:58, stability:68, softPower:65, culturalReach:62 },
  TUP: { military:40, techLevel:25, stability:45, softPower:20, culturalReach:18 },
  NAH: { military:45, techLevel:30, stability:40, softPower:25, culturalReach:22 },
  MIX: { military:50, techLevel:42, stability:50, softPower:38, culturalReach:35 },
  CRB: { military:30, techLevel:20, stability:42, softPower:18, culturalReach:15 },
  // ── Songhai era polities ──────────────────────────────────────────────────
  SGH: { military:80, techLevel:50, stability:62, softPower:72, culturalReach:70 },
  MLR: { military:52, techLevel:48, stability:45, softPower:62, culturalReach:60 },
  KNB: { military:65, techLevel:40, stability:55, softPower:42, culturalReach:40 },
  KNG: { military:58, techLevel:38, stability:62, softPower:45, culturalReach:42 },
  ZIM: { military:55, techLevel:42, stability:58, softPower:40, culturalReach:38 },
  YOR: { military:60, techLevel:42, stability:55, softPower:48, culturalReach:45 },
  AKN: { military:55, techLevel:38, stability:58, softPower:42, culturalReach:40 },
  ETH: { military:65, techLevel:45, stability:65, softPower:52, culturalReach:50 },
  BNI: { military:60, techLevel:45, stability:60, softPower:52, culturalReach:50 },
  // ── Sengoku era polities ──────────────────────────────────────────────────
  ODA: { military:88, techLevel:65, stability:55, softPower:60, culturalReach:55 },
  TAK: { military:85, techLevel:58, stability:62, softPower:48, culturalReach:45 },
  UES: { military:82, techLevel:55, stability:65, softPower:45, culturalReach:42 },
  MOT: { military:75, techLevel:58, stability:60, softPower:42, culturalReach:40 },
  SHI: { military:78, techLevel:52, stability:62, softPower:38, culturalReach:35 },
  HOJ: { military:72, techLevel:55, stability:65, softPower:40, culturalReach:38 },
  DAT: { military:70, techLevel:52, stability:60, softPower:38, culturalReach:35 },
  IMA: { military:65, techLevel:50, stability:58, softPower:38, culturalReach:35 },
  CHO: { military:68, techLevel:48, stability:60, softPower:35, culturalReach:32 },
  ASH: { military:42, techLevel:60, stability:35, softPower:65, culturalReach:70 },
  JOS: { military:58, techLevel:65, stability:72, softPower:60, culturalReach:62 },
  MIN: { military:85, techLevel:78, stability:65, softPower:80, culturalReach:85 },
}

/** Derive base stats for countries not in the lookup table, based on GDP tier. */
function deriveStats(gdp: number): { military: number; techLevel: number; stability: number; softPower: number; culturalReach: number } {
  // GDP in USD. Use log-scale to spread values.
  const gdpT = gdp / 1e12  // trillions
  const tech = Math.min(75, Math.round(10 + Math.sqrt(gdpT) * 45))
  const mil  = Math.min(70, Math.round(5 + Math.sqrt(gdpT) * 40))
  const soft = Math.min(65, Math.round(5 + Math.sqrt(gdpT) * 35))
  return { military: mil, techLevel: tech, stability: 60, softPower: soft, culturalReach: soft - 5 }
}

function defaultStats(gdp: number, isoA3?: string): CountryStats {
  const base = (isoA3 && POLITY_BASE_STATS[isoA3]) ? POLITY_BASE_STATS[isoA3] : deriveStats(gdp)
  return {
    gdp,
    military: base.military,
    researchPoints: 0,
    approval: 50,
    softPower: base.softPower,
    techLevel: base.techLevel,
    culturalReach: base.culturalReach,
    stability: base.stability,
  }
}

function defaultSectors(): CountrySectors {
  return {
    defence: 0,
    technology: 0,
    manufacturing: 0,
    space: 0,
    pharmaceuticals: 0,
    agriculture: 0,
    finance: 0,
    infrastructure: 0,
  }
}

interface GeoJSONProperties {
  ISO_A3?: string
  ADM0_A3?: string
  ADMIN?: string
  NAME?: string
  POP_EST?: number
  GDP_MD?: number
  // Natural Earth admin-1 lowercase fields
  name?: string
  adm0_a3?: string
  // Ancient province annotation fields
  modernName?: string
  ancientName?: string
  polityId?: string
  adminType?: string
  [key: string]: unknown  // allow arbitrary extra properties
}

interface GeoJSONFeatureCollection {
  type: string
  features: Array<{ properties: GeoJSONProperties }>
}

function buildCountriesFromGeoJSON(geojson: GeoJSONFeatureCollection): Record<string, Country> {
  const countries: Record<string, Country> = {}

  for (const feature of geojson.features) {
    const props = feature.properties
    const isoA3 = props.ISO_A3 ?? props.ADM0_A3 ?? '-99'

    if (isoA3 === '-99' || !isoA3) continue

    const name = props.ADMIN ?? props.NAME ?? isoA3
    const gdp = props.GDP_MD != null ? props.GDP_MD * 1_000_000 : 0

    countries[isoA3] = {
      id: isoA3,
      name,
      colour: getCountryColour(isoA3),
      capitalCity: '',
      majorCities: [],
      stats: defaultStats(gdp, isoA3),
      sectors: defaultSectors(),
      infrastructure: [],
      relations: {},
      organisations: [],
      nationalisedAssets: [],
      laws: [],
    }
  }

  return countries
}

function buildStrategicPassages(era: Era): Record<string, PassageStatus> {
  const open: PassageStatus = 'open'
  const ancientEras: Era[] = ['greek', 'roman', 'ottoman']
  if (ancientEras.includes(era)) {
    return {
      bosporus: open,
      gibraltar: open,
      'bab-el-mandeb': open,
      hormuz: open,
      ...(era === 'ottoman' ? { 'red-sea': open } : {}),
    }
  }
  return {
    hormuz: open,
    malacca: open,
    suez: open,
    panama: open,
    bosporus: open,
    gibraltar: open,
    'bab-el-mandeb': open,
  }
}

function readEraFile(filePath: string): { data: GeoJSONFeatureCollection } | { notFound: true } | { error: true } {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    return { data: JSON.parse(raw) as GeoJSONFeatureCollection }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { notFound: true }
    }
    return { error: true }
  }
}

// ── Ancient era country-to-polity mappings ────────────────────────────────────
// Each entry maps a modern ISO_A3 code → the ancient polity code that controlled
// that territory. Countries absent from the map are excluded from the era borders
// (they lie outside the known/playable world for that era).

const OTTOMAN_MAP: Record<string, string> = {
  // Ottoman Empire (core + provinces)
  TUR:'OTT', GRC:'OTT', BGR:'OTT', ROU:'OTT', SRB:'OTT', BIH:'OTT', MNE:'OTT',
  ALB:'OTT', MKD:'OTT', XKX:'OTT', CYP:'OTT', EGY:'OTT', LBY:'OTT', TUN:'OTT',
  DZA:'OTT', SYR:'OTT', LBN:'OTT', ISR:'OTT', PSE:'OTT', JOR:'OTT', IRQ:'OTT',
  KWT:'OTT',
  // Safavid Persia
  IRN:'SAF', AZE:'SAF', ARM:'SAF', GEO:'SAF', TKM:'SAF', UZB:'SAF', TJK:'SAF', KGZ:'SAF',
  // Habsburg Empire
  AUT:'HAB', HUN:'HAB', SVN:'HAB', CZE:'HAB', SVK:'HAB', HRV:'HAB', LIE:'HAB',
  // Holy Roman Empire (north German states, Low Countries, Switzerland)
  DEU:'HRE', NLD:'HRE', BEL:'HRE', LUX:'HRE', CHE:'HRE',
  // France
  FRA:'FRA', MCO:'FRA', AND:'FRA',
  // England (Tudors)
  GBR:'ENG', IRL:'ENG',
  // Poland-Lithuania
  POL:'PLT', LTU:'PLT', LVA:'PLT', EST:'PLT', BLR:'PLT', UKR:'PLT',
  // Portugal
  PRT:'POR',
  // Spain (Castile + Aragon)
  ESP:'ESP',
  // Denmark-Norway-Sweden (Kalmar Union / early separate)
  DNK:'EUN', NOR:'EUN', SWE:'EUN',
  // Morocco
  MAR:'MOR', ESH:'MOR',
  // Muscovy
  RUS:'MUS', FIN:'MUS', KAZ:'MUS',
  // Mughal Empire
  IND:'MUG', PAK:'MUG', BGD:'MUG', NPL:'MUG', BTN:'MUG', AFG:'MUG',
  // Songhai
  MLI:'SON', NER:'SON', BFA:'SON', SEN:'SON', GMB:'SON', GNB:'SON', GIN:'SON',
  // Ethiopia (Solomonid)
  ETH:'ETI', ERI:'ETI', DJI:'ETI', SOM:'ETI',
  // Nubia / Funj Sultanate
  SDN:'NUB', SSD:'NUB', CAF:'NUB',
  // Arabia
  SAU:'ARA', YEM:'ARA', OMN:'ARA', ARE:'ARA', QAT:'ARA', BHR:'ARA',
  // Venice + Italian states
  ITA:'VNC', SMR:'VNC', VAT:'VNC', MLT:'VNC',
  // Aceh Sultanate
  IDN:'ACH', MYS:'ACH', BRN:'ACH', SGP:'ACH',
}

const ROMAN_MAP: Record<string, string> = {
  // Roman Empire at maximum (Trajan, 117 CE)
  ITA:'ROM', SMR:'ROM', VAT:'ROM', MLT:'ROM',
  FRA:'ROM', MCO:'ROM', BEL:'ROM', NLD:'ROM', LUX:'ROM',
  ESP:'ROM', PRT:'ROM', AND:'ROM', GIB:'ROM',
  GBR:'ROM', // Britannia
  CHE:'ROM', AUT:'ROM', CZE:'ROM', SVK:'ROM', HUN:'ROM', SVN:'ROM', HRV:'ROM',
  BIH:'ROM', SRB:'ROM', MNE:'ROM', MKD:'ROM', ALB:'ROM', GRC:'ROM', BGR:'ROM',
  ROU:'ROM', MDA:'ROM', CYP:'ROM',
  TUR:'ROM', ARM:'ROM', GEO:'ROM',
  SYR:'ROM', LBN:'ROM', ISR:'ROM', PSE:'ROM', JOR:'ROM', IRQ:'ROM',
  EGY:'ROM', LBY:'ROM', TUN:'ROM', DZA:'ROM', MAR:'ROM',
  // Parthian Empire
  IRN:'PAR', AZE:'PAR', TKM:'PAR', AFG:'PAR', UZB:'PAR', TJK:'PAR',
  // Kushan Empire
  PAK:'KUS', NPL:'KUS', BTN:'KUS',
  // Deccan kingdoms
  IND:'DEC',
  // Germanic tribes
  DEU:'GER', POL:'GER', BLR:'GER', LTU:'GER', LVA:'GER', EST:'GER',
  FIN:'GER', DNK:'GER', NOR:'GER', SWE:'GER',
  // Sarmatia/Scythia
  RUS:'SAR', UKR:'SAR', KAZ:'SAR',
  // Axum
  ETH:'AXU', ERI:'AXU', DJI:'AXU', SOM:'AXU',
  // Nubia
  SDN:'NUB', SSD:'NUB',
  // Arabia
  SAU:'ARA', YEM:'ARA', OMN:'ARA', ARE:'ARA', QAT:'ARA', BHR:'ARA', KWT:'ARA',
  // Han China (off-map but include as EUN)
  CHN:'EUN', MNG:'EUN', KOR:'EUN', JPN:'EUN',
  // India sub-continent
  KGZ:'EUN',
}

const GREEK_MAP: Record<string, string> = {
  // Athens / Delian League
  GRC:'ATH', CYP:'ATH',
  // Macedon
  MKD:'MAC', BGR:'MAC',
  // Thrace / Troy region (Anatolia west)
  TUR:'TRH',
  // Epirus
  ALB:'EPI',
  // Illyria
  MNE:'ILY', HRV:'ILY', SVN:'ILY', BIH:'ILY',
  // Italian peninsula
  ITA:'ITL', SMR:'ITL', VAT:'ITL',
  // Carthage
  TUN:'CAR', LBY:'CAR', DZA:'CAR', MAR:'CAR', ESH:'CAR', MLT:'CAR',
  // Egypt / Kemet
  EGY:'KMT',
  // Celts / Gauls
  FRA:'CEL', BEL:'CEL', NLD:'CEL', LUX:'CEL', CHE:'CEL',
  GBR:'CEL', IRL:'CEL', DNK:'CEL',
  DEU:'CEL', AUT:'CEL', CZE:'CEL', SVK:'CEL', HUN:'CEL', POL:'CEL',
  SRB:'CEL', ROU:'CEL', MDA:'CEL',
  // Scythia
  UKR:'SCY', RUS:'SCY', KAZ:'SCY',
  // Persia (Achaemenid) — label as EUN (buffer)
  IRN:'EUN', IRQ:'EUN', SYR:'EUN', LBN:'EUN', ISR:'EUN', PSE:'EUN',
  JOR:'EUN', ARM:'EUN', GEO:'EUN', AZE:'EUN', TKM:'EUN', UZB:'EUN',
  AFG:'EUN', PAK:'EUN',
  // Nubia
  SDN:'NUB', SSD:'NUB', ETH:'NUB', ERI:'NUB',
  // Arabia
  SAU:'ARA', YEM:'ARA', OMN:'ARA', ARE:'ARA', QAT:'ARA', BHR:'ARA', KWT:'ARA',
}

// ── Abbasid Caliphate (800 CE — Harun al-Rashid) ─────────────────────────────
const ABBASID_MAP: Record<string, string> = {
  // Abbasid Caliphate core
  IRQ:'ABB', SYR:'ABB', LBN:'ABB', ISR:'ABB', PSE:'ABB', JOR:'ABB',
  EGY:'ABB', KWT:'ABB', SAU:'ABB', YEM:'ABB', OMN:'ABB', ARE:'ABB', QAT:'ABB', BHR:'ABB',
  // Abbasid eastern provinces (still nominally under caliph)
  IRN:'SAM', AFG:'SAM', TKM:'SAM', UZB:'SAM', TJK:'SAM', KGZ:'SAM', KAZ:'SAM',
  // Byzantine Empire
  TUR:'BYZ', GRC:'BYZ', BGR:'BYZ', MKD:'BYZ', ALB:'BYZ', MNE:'BYZ',
  SRB:'BYZ', HRV:'BYZ', BIH:'BYZ', ROU:'BYZ', MDA:'BYZ', CYP:'BYZ',
  ARM:'BYZ', GEO:'BYZ', AZE:'BYZ',
  // Frankish Empire (Charlemagne)
  FRA:'FRK', BEL:'FRK', NLD:'FRK', LUX:'FRK', DEU:'FRK', CHE:'FRK',
  AUT:'FRK', CZE:'FRK', SVK:'FRK', HUN:'FRK', SVN:'FRK',
  // Umayyad Al-Andalus
  ESP:'UMA', PRT:'UMA', AND:'UMA', GIB:'UMA',
  // England / Anglo-Saxon kingdoms
  GBR:'FRK', IRL:'FRK',
  // Idrisid Morocco
  MAR:'IDR', ESH:'IDR',
  // North Africa (Aghlabid — nominally Abbasid)
  TUN:'ABB', LBY:'ABB', DZA:'ABB',
  // Khazar Khaganate
  UKR:'KHZ', POL:'KHZ', LTU:'KHZ', LVA:'KHZ', EST:'KHZ', FIN:'KHZ',
  // Viking Scandinavia
  DNK:'FRK', NOR:'FRK', SWE:'FRK',
  // Bulgaria
  // (already in BYZ)
  // India (Pratihara + Pala + Rashtrakuta)
  IND:'PRH', PAK:'PRH', NPL:'PRH', BTN:'PRH', BGD:'PRH',
  // East Africa
  ETH:'AXU', ERI:'AXU', DJI:'AXU', SOM:'AXU',
  // Sub-Saharan
  SDN:'NUB', SSD:'NUB',
  // Tang China (off-map) included for completeness
  RUS:'KHZ', MNG:'KHZ',
}

// ── Tang Dynasty China (700 CE — Emperor Xuanzong era) ───────────────────────
const TANG_MAP: Record<string, string> = {
  // Tang Dynasty core + territories
  CHN:'TNG', TWN:'TNG', HKG:'TNG',
  // Tang client states / tributary
  KOR:'SLL', PRK:'SLL',
  // Nara Japan
  JPN:'NAR',
  // Tibetan Empire (major rival)
  TIB:'TIB',
  // Actually TIB isn't an ISO — use Nepal and Tibet area
  NPL:'TIB', BTN:'TIB',
  // Göktürk / Uyghur Khaganate (Central Asia)
  MNG:'GOK', KAZ:'GOK', KGZ:'GOK', TJK:'GOK', TKM:'GOK', UZB:'GOK',
  // Nanzhao (Yunnan)
  VNM:'NNZ', LAO:'NNZ', THA:'NNZ', MMR:'NNZ',
  // Khmer Empire
  KHM:'KHR', MYS:'KHR', IDN:'KHR', SGP:'KHR', BRN:'KHR',
  // Chalukya + Indian kingdoms
  IND:'CLK', PAK:'CLK', BGD:'CLK', LKA:'CLK',
  // Umayyad / early Abbasid (just west)
  IRN:'ABB', AFG:'ABB', IRQ:'ABB',
  // Byzantine
  TUR:'BYZ', GRC:'BYZ', BGR:'BYZ',
}

// ── Aztec Triple Alliance (1500 CE) ──────────────────────────────────────────
const AZTEC_MAP: Record<string, string> = {
  // Aztec Triple Alliance (central Mexico)
  MEX:'AZT',
  // Tlaxcala (enclave of resistance — use Guatemala as proxy)
  GTM:'TLX', BLZ:'TLX',
  // Maya city-states (Yucatan + Central America)
  HND:'MYA', SLV:'MYA', NIC:'MYA',
  // Inca Empire (South America)
  PER:'INC', BOL:'INC', ECU:'INC', CHL:'INC', ARG:'INC', COL:'INC',
  // Tupi (Brazil)
  BRA:'TUP',
  // Other Nahua / Caribbean
  CUB:'CRB', DOM:'CRB', HTI:'CRB', JAM:'CRB', TTO:'CRB', PAN:'CRB',
  CRI:'NAH', VEN:'NAH',
  // Mixtec (Oaxaca — use separate)
  GUY:'MIX', SUR:'MIX',
}

// ── Songhai Empire (1490 CE — Sunni Ali / Askia Muhammad) ────────────────────
const SONGHAI_MAP: Record<string, string> = {
  // Songhai Empire (Niger bend)
  MLI:'SGH', NER:'SGH', BFA:'SGH', SEN:'SGH', GMB:'SGH', GNB:'SGH', GIN:'SGH',
  // Mali remnants
  MRT:'MLR',
  // Kanem-Bornu
  TCD:'KNB', CMR:'KNB', NGA:'KNB',
  // Benin Kingdom
  // (part of Nigeria — use separate entry)
  // Kongo Kingdom
  COD:'KNG', COG:'KNG', AGO:'KNG', GAB:'KNG', GNQ:'KNG',
  // Mutapa / Zimbabwe
  ZWE:'ZIM', MOZ:'ZIM', ZMB:'ZIM',
  // Ethiopian Empire (Abyssinia)
  ETH:'ETH', ERI:'ETH', DJI:'ETH', SOM:'ETH',
  // Yoruba / Oyo (use Benin/Togo as proxy)
  BEN:'YOR', TGO:'YOR',
  // Akan / Ashanti
  GHA:'AKN', CIV:'AKN', LBR:'AKN', SLE:'AKN',
  // Saadian Morocco
  MAR:'MOR', ESH:'MOR',
  // Egypt + North Africa (Mamluk — Ottoman soon to conquer)
  EGY:'MOR', TUN:'MOR', LBY:'MOR', DZA:'MOR',
  // East Africa Swahili
  TZA:'ZIM', KEN:'ZIM', UGA:'ZIM', RWA:'ZIM', BDI:'ZIM',
  // Sudan (Funj Sultanate)
  SDN:'KNB', SSD:'KNB', CAF:'KNB',
}

// ── Sengoku Japan (1560 CE) ──────────────────────────────────────────────────
const SENGOKU_MAP: Record<string, string> = {
  // Japanese clans — map all of Japan to different factions
  // (Japan has no internal ISO_A3 breakdown so we approximate)
  JPN:'ODA',
  // Joseon Korea
  KOR:'JOS', PRK:'JOS',
  // Ming Dynasty China
  CHN:'MIN', TWN:'MIN', MNG_CON:'MIN', HKG:'MIN',
  // Other regional
  MNG:'GOK',  // Mongolian steppe (Northern Yuan / Tümed)
  VNM:'MIN',  // Dai Viet (tributary of Ming)
  // Southeast Asia
  THA:'MIN',  // Ayutthaya (trade partner)
  // Briefly include Russia as expanding
  RUS:'MIN',
}

const ERA_COUNTRY_MAPS: Partial<Record<Era, Record<string, string>>> = {
  ottoman: OTTOMAN_MAP,
  roman:   ROMAN_MAP,
  greek:   GREEK_MAP,
  abbasid: ABBASID_MAP,
  tang:    TANG_MAP,
  aztec:   AZTEC_MAP,
  songhai: SONGHAI_MAP,
  sengoku: SENGOKU_MAP,
}

/**
 * Inject a fill_colour property into every GeoJSON feature so the client
 * MapLibre layer can use ['get', 'fill_colour'] without needing any JS imports
 * or match expressions. This is the authoritative colour source.
 */
function injectFillColours(geojson: GeoJSONFeatureCollection): GeoJSONFeatureCollection {
  return {
    ...geojson,
    features: geojson.features.map(f => {
      const iso = (f.properties.ISO_A3 ?? f.properties.ADM0_A3 ?? '') as string
      return {
        ...f,
        properties: { ...f.properties, fill_colour: getCountryColour(iso) },
      }
    }),
  } as unknown as GeoJSONFeatureCollection
}

function remapToAncientPolities(
  modern: GeoJSONFeatureCollection,
  mapping: Record<string, string>,
): GeoJSONFeatureCollection {
  const features: typeof modern.features = []
  for (const feature of modern.features) {
    const props = feature.properties
    // Handle ISO_A3 = '-99' (unrecognised territories in Natural Earth)
    const isoRaw = props.ISO_A3 ?? ''
    const iso = (isoRaw === '-99' || isoRaw === '') ? (props.ADM0_A3 ?? '') : isoRaw
    const polity = mapping[iso]
    if (!polity) continue  // territory outside this era's known world
    const displayName = POLITY_NAMES[polity] ?? polity
    features.push({
      ...feature,
      properties: { ...props, ISO_A3: polity, ADM0_A3: polity, ADMIN: displayName, NAME: displayName },
    })
  }
  return { type: 'FeatureCollection', features } as unknown as GeoJSONFeatureCollection
}

// Polity display names used in rendered ancient borders
const POLITY_NAMES: Record<string, string> = {
  // Greek
  ATH:'Athens', SPA:'Sparta', THE:'Thebes', MAC:'Macedon', EPI:'Epirus',
  THS:'Thessaly', ACH:'Achaea', ILY:'Illyria', TRH:'Anatolia', CRT:'Crete',
  ITL:'Italian Peoples', SRC:'Syracuse', KMT:'Egypt', CAR:'Carthage',
  CEL:'Celtic Gaul', SCY:'Scythia', NUB:'Nubia', ARA:'Arabia', EUN:'Persia',
  // Roman
  ROM:'Roman Empire', PAR:'Parthian Empire', KUS:'Kushan Empire',
  DEC:'Deccan Kingdoms', GER:'Germania', SAR:'Sarmatia', AXU:'Axum', ARK:'Armenia',
  // Ottoman
  OTT:'Ottoman Empire', SAF:'Safavid Persia', HAB:'Habsburg Empire',
  HRE:'Holy Roman Empire', FRA:'France', ENG:'England', PLT:'Poland-Lithuania',
  POR:'Portugal', ESP:'Spain', VNC:'Venice', MUS:'Muscovy',
  MUG:'Mughal Empire', SON:'Songhai', MOR:'Morocco', ETI:'Ethiopia',
  // Abbasid
  ABB:'Abbasid Caliphate', BYZ:'Byzantine Empire', FRK:'Frankish Empire',
  UMA:'Umayyad Al-Andalus', SAM:'Samanid Persia', KHZ:'Khazar Khaganate',
  BUL:'Bulgarian Empire', IDR:'Idrisid Morocco', PRH:'Pratihara India',
  PAL:'Pala Bengal',
  // Tang
  TNG:'Tang Dynasty', TIB:'Tibetan Empire', GOK:'Göktürk Khaganate',
  SLL:'Unified Silla', NAR:'Nara Japan', NNZ:'Nanzhao', KHR:'Khmer Empire',
  CLK:'Chalukya India',
  // Aztec
  AZT:'Aztec Triple Alliance', TLX:'Tlaxcala', MYA:'Maya City-States',
  INC:'Inca Empire', NAH:'Nahua Peoples', MIX:'Mixtec', CRB:'Caribbean Peoples',
  TUP:'Tupi Peoples',
  // Songhai
  SGH:'Songhai Empire', MLR:'Mali Remnants', KNB:'Kanem-Bornu',
  BNI:'Benin Kingdom', KNG:'Kongo Kingdom', ZIM:'Mutapa Empire',
  YOR:'Yoruba States', AKN:'Akan Peoples', ETH:'Ethiopian Empire',
  // Sengoku
  ODA:'Oda Clan', TAK:'Takeda Clan', UES:'Uesugi Clan', MOT:'Mori Clan',
  SHI:'Shimazu Clan', HOJ:'Hojo Clan', DAT:'Date Clan', IMA:'Imagawa Clan',
  CHO:'Chosokabe', ASH:'Ashikaga Shogunate', JOS:'Joseon Korea', MIN:'Ming Dynasty',
}

export const gameRouter = Router()

// GET /api/game/borders/:era — era-specific border polygons
// For ancient eras: prefer pre-downloaded historical-basemaps render file,
// then fall back to remapped modern borders.
gameRouter.get('/borders/:era', (req, res) => {
  const { era } = req.params
  if (!isValidEra(era)) {
    res.status(400).json({ error: `Invalid era: ${era}` })
    return
  }

  const ancientEras: Era[] = ['greek', 'roman', 'ottoman']
  if (ancientEras.includes(era as Era)) {
    // 1. Try pre-downloaded historical-basemaps render file
    const renderPath = join(ERAS_DIR, `${era}_render.geojson`)
    const renderResult = readEraFile(renderPath)
    if ('data' in renderResult) {
      res.json(injectFillColours(renderResult.data))
      return
    }

    // 2. Fall back to remapping modern borders
    const polityMap = ERA_COUNTRY_MAPS[era as Era]
    if (polityMap) {
      const bordersPath = join(ERAS_DIR, 'borders.geojson')
      const modernResult = readEraFile(bordersPath)
      const source = 'data' in modernResult ? modernResult
        : readEraFile(join(ERAS_DIR, 'modern.geojson'))
      if (!('data' in source)) {
        res.status(500).json({ error: 'No border data available. Run: node shared/eras/download-historical.mjs' })
        return
      }
      res.json(injectFillColours(remapToAncientPolities(source.data, polityMap)))
      return
    }
  }

  // Non-ancient eras — era-specific file
  const result = readEraFile(getEraFilePath(era))
  if ('notFound' in result) {
    res.status(404).json({ error: `Border file not found for era: ${era}` })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read era border file' })
    return
  }
  res.json(injectFillColours(result.data))
})

// GET /api/game/borders — 50m country polygons for rendering (includes small territories like Gaza)
gameRouter.get('/borders', (_req, res) => {
  const bordersPath = join(ERAS_DIR, 'borders.geojson')
  const result = readEraFile(bordersPath)
  if ('notFound' in result) {
    // Fall back to 110m if 50m not downloaded yet
    const fallback = readEraFile(join(ERAS_DIR, 'modern.geojson'))
    if ('data' in fallback) { res.json(injectFillColours(fallback.data)); return }
    res.status(404).json({ error: 'borders.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read borders file' })
    return
  }
  res.json(injectFillColours(result.data))
})

// GET /api/game/ocean — Natural Earth 110m ocean polygons (used to mask hillshade over sea)
gameRouter.get('/ocean', (_req, res) => {
  const oceanPath = join(ERAS_DIR, 'ocean.geojson')
  const result = readEraFile(oceanPath)
  if ('notFound' in result) {
    res.status(404).json({ error: 'ocean.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read ocean file' })
    return
  }
  res.json(result.data)
})

// GET /api/game/biomes — Natural Earth 10m geographic regions (deserts, forests, tundra…)
// Prefers biomes-blended.geojson (with gradient buffer rings) if available, falls back to biomes.geojson
gameRouter.get('/biomes', (_req, res) => {
  const blendedPath = join(ERAS_DIR, 'biomes-blended.geojson')
  const rawPath = join(ERAS_DIR, 'biomes.geojson')
  const biomesPath = existsSync(blendedPath) ? blendedPath : rawPath
  const result = readEraFile(biomesPath)
  if ('notFound' in result) {
    res.status(404).json({ error: 'biomes.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read biomes file' })
    return
  }
  res.json(result.data)
})

// GET /api/game/rivers — Natural Earth 50m rivers and lake centerlines
gameRouter.get('/rivers', (_req, res) => {
  const riversPath = join(ERAS_DIR, 'rivers.geojson')
  const result = readEraFile(riversPath)
  if ('notFound' in result) {
    res.status(404).json({ error: 'rivers.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read rivers file' })
    return
  }
  res.json(result.data)
})

// GET /api/game/lakes — Natural Earth 10m lakes
gameRouter.get('/lakes', (_req, res) => {
  const lakesPath = join(ERAS_DIR, 'lakes.geojson')
  const result = readEraFile(lakesPath)
  if ('notFound' in result) {
    res.status(404).json({ error: 'lakes.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read lakes file' })
    return
  }
  res.json(result.data)
})

// ── Ancient province lookup tables ───────────────────────────────────────────
// Each entry: adm0_a3 → { name, polity, adminType }
// For countries spanning multiple provinces, nameKeywords lets us sub-divide
// by matching against the admin-1 region name (partial, case-insensitive).

interface AncientProvinceInfo { name: string; polity: string; adminType: string }

// Priority list: first matching keywords entry wins; fall-through to default.
type ProvinceRule =
  | { adm0: string; keywords: string[]; name: string; polity: string; adminType: string }
  | { adm0: string; keywords?: never;   name: string; polity: string; adminType: string }

const ROMAN_PROVINCE_RULES: ProvinceRule[] = [
  // ── Iberian Peninsula ─────────────────────────────────────────────────────
  { adm0:'ESP', keywords:['Andaluc','Murcia','Extremadura','Ceuta'],      name:'Hispania Baetica',       polity:'ROM', adminType:'province' },
  { adm0:'ESP',                                                            name:'Hispania Tarraconensis', polity:'ROM', adminType:'province' },
  { adm0:'PRT',                                                            name:'Lusitania',              polity:'ROM', adminType:'province' },
  // ── Gallia (France + surrounds) ───────────────────────────────────────────
  { adm0:'FRA', keywords:['Provence','Occitanie','Auvergne','Corse'],      name:'Gallia Narbonensis',    polity:'ROM', adminType:'province' },
  { adm0:'FRA', keywords:['Hauts-de-France','Grand Est','Alsace'],         name:'Gallia Belgica',        polity:'ROM', adminType:'province' },
  { adm0:'FRA', keywords:['Nouvelle-Aquitaine'],                            name:'Gallia Aquitania',     polity:'ROM', adminType:'province' },
  { adm0:'FRA',                                                             name:'Gallia Lugdunensis',   polity:'ROM', adminType:'province' },
  { adm0:'BEL',                                                             name:'Gallia Belgica',       polity:'ROM', adminType:'province' },
  { adm0:'NLD',                                                             name:'Germania Inferior',    polity:'ROM', adminType:'province' },
  { adm0:'LUX',                                                             name:'Gallia Belgica',       polity:'ROM', adminType:'province' },
  // ── Britannia ─────────────────────────────────────────────────────────────
  { adm0:'GBR', keywords:['Scotland','Highland','Grampian','Lothian'],     name:'Caledonia (uncontrolled)', polity:'GER', adminType:'tribal' },
  { adm0:'GBR',                                                            name:'Britannia',              polity:'ROM', adminType:'province' },
  // ── Rhine / Alps ──────────────────────────────────────────────────────────
  { adm0:'DEU', keywords:['Bayern','Baden','Württemberg','Freiburg'],      name:'Raetia',                polity:'ROM', adminType:'province' },
  { adm0:'DEU', keywords:['Nordrhein','Rheinland','Saarland','Pfalz'],     name:'Germania Inferior',     polity:'ROM', adminType:'province' },
  { adm0:'DEU',                                                             name:'Germania Libera',       polity:'GER', adminType:'tribal' },
  { adm0:'CHE',                                                             name:'Raetia',                polity:'ROM', adminType:'province' },
  { adm0:'AUT',                                                             name:'Noricum',               polity:'ROM', adminType:'province' },
  // ── Danube provinces ──────────────────────────────────────────────────────
  { adm0:'HUN',                                                             name:'Pannonia',              polity:'ROM', adminType:'province' },
  { adm0:'HRV',                                                             name:'Dalmatia',              polity:'ROM', adminType:'province' },
  { adm0:'SVN',                                                             name:'Pannonia Superior',     polity:'ROM', adminType:'province' },
  { adm0:'BIH',                                                             name:'Dalmatia',              polity:'ROM', adminType:'province' },
  { adm0:'SRB', keywords:['Kosovo'],                                        name:'Moesia Superior',       polity:'ROM', adminType:'province' },
  { adm0:'SRB',                                                             name:'Moesia Superior',       polity:'ROM', adminType:'province' },
  { adm0:'ROU', keywords:['Cluj','Sibiu','Hunedoara','Braşov','Alba'],      name:'Dacia',                 polity:'ROM', adminType:'province' },
  { adm0:'ROU',                                                             name:'Moesia Inferior',       polity:'ROM', adminType:'province' },
  { adm0:'BGR',                                                             name:'Thracia / Moesia',      polity:'ROM', adminType:'province' },
  { adm0:'MKD',                                                             name:'Macedonia',             polity:'ROM', adminType:'province' },
  { adm0:'ALB',                                                             name:'Epirus Nova',           polity:'ROM', adminType:'province' },
  { adm0:'MNE',                                                             name:'Dalmatia',              polity:'ROM', adminType:'province' },
  // ── Greece ────────────────────────────────────────────────────────────────
  { adm0:'GRC', keywords:['Macedonia','Thrace'],                            name:'Macedonia',             polity:'ROM', adminType:'province' },
  { adm0:'GRC', keywords:['Epirus'],                                        name:'Epirus',                polity:'ROM', adminType:'province' },
  { adm0:'GRC',                                                             name:'Achaea',                polity:'ROM', adminType:'province' },
  { adm0:'CYP',                                                             name:'Cyprus',                polity:'ROM', adminType:'province' },
  // ── Anatolia & Levant ─────────────────────────────────────────────────────
  { adm0:'TUR', keywords:['İstanbul','Edirne','Kırklareli','Tekirdağ'],     name:'Bithynia et Pontus',    polity:'ROM', adminType:'province' },
  { adm0:'TUR', keywords:['İzmir','Manisa','Balıkesir','Bursa','Çanakkale','Aydın','Muğla','Afyon','Kütahya'], name:'Asia',  polity:'ROM', adminType:'province' },
  { adm0:'TUR', keywords:['Konya','Ankara','Eskişehir','Karaman'],          name:'Galatia',               polity:'ROM', adminType:'province' },
  { adm0:'TUR', keywords:['Adana','Mersin','Hatay','Gaziantep','Kilis'],    name:'Cilicia',               polity:'ROM', adminType:'province' },
  { adm0:'TUR', keywords:['Kayseri','Sivas','Tokat','Amasya'],              name:'Cappadocia',            polity:'ROM', adminType:'province' },
  { adm0:'TUR', keywords:['Trabzon','Rize','Giresun','Ordu','Samsun'],      name:'Pontus',                polity:'ROM', adminType:'province' },
  { adm0:'TUR', keywords:['Erzurum','Kars','Ağrı','Van'],                   name:'Armenia Minor',         polity:'ROM', adminType:'province' },
  { adm0:'TUR',                                                              name:'Lycia et Pamphylia',   polity:'ROM', adminType:'province' },
  { adm0:'SYR',                                                              name:'Syria Coele',          polity:'ROM', adminType:'province' },
  { adm0:'LBN',                                                              name:'Syria Phoenice',       polity:'ROM', adminType:'province' },
  { adm0:'ISR',                                                              name:'Judaea',               polity:'ROM', adminType:'province' },
  { adm0:'PSE',                                                              name:'Judaea',               polity:'ROM', adminType:'province' },
  { adm0:'JOR',                                                              name:'Arabia Petraea',       polity:'ROM', adminType:'province' },
  { adm0:'IRQ', keywords:['Baghdad','Wasit','Diyala','Basra'],               name:'Mesopotamia',          polity:'ROM', adminType:'province' },
  { adm0:'IRQ',                                                              name:'Mesopotamia (Parthian)', polity:'PAR', adminType:'province' },
  // ── North Africa ──────────────────────────────────────────────────────────
  { adm0:'EGY',                                                              name:'Aegyptus',             polity:'ROM', adminType:'province' },
  { adm0:'LBY',                                                              name:'Cyrenaica',            polity:'ROM', adminType:'province' },
  { adm0:'TUN',                                                              name:'Africa Proconsularis', polity:'ROM', adminType:'province' },
  { adm0:'DZA', keywords:['Constantine','Annaba','Guelma','Souk Ahras','Skikda'],  name:'Numidia',        polity:'ROM', adminType:'province' },
  { adm0:'DZA',                                                              name:'Mauretania Caesariensis', polity:'ROM', adminType:'province' },
  { adm0:'MAR',                                                              name:'Mauretania Tingitana', polity:'ROM', adminType:'province' },
  // ── Italia ────────────────────────────────────────────────────────────────
  { adm0:'ITA',                                                              name:'Italia',               polity:'ROM', adminType:'peninsula' },
  { adm0:'MLT',                                                              name:'Melita',               polity:'ROM', adminType:'province' },
  { adm0:'MCO',                                                              name:'Gallia Narbonensis',   polity:'ROM', adminType:'province' },
  { adm0:'AND',                                                              name:'Hispania Tarraconensis', polity:'ROM', adminType:'province' },
  { adm0:'SMR',                                                              name:'Italia',               polity:'ROM', adminType:'peninsula' },
  // ── Armenia ───────────────────────────────────────────────────────────────
  { adm0:'ARM',                                                              name:'Armenia',              polity:'ARK', adminType:'kingdom' },
  // ── Parthian territories ──────────────────────────────────────────────────
  { adm0:'IRN',  keywords:['Tehran','Khorasan','Isfahan','Fars','Kerman','Yazd'], name:'Parthia/Persia', polity:'PAR', adminType:'satrapy' },
  { adm0:'IRN',  keywords:['Azerbaijan','Gilan','Mazandaran'],               name:'Media Atropatene',     polity:'PAR', adminType:'satrapy' },
  { adm0:'IRN',                                                              name:'Parthian Homeland',    polity:'PAR', adminType:'satrapy' },
  { adm0:'TKM',                                                              name:'Margiana',             polity:'PAR', adminType:'satrapy' },
  // ── Kushan Empire ─────────────────────────────────────────────────────────
  { adm0:'AFG',                                                              name:'Bactria / Ariana',     polity:'KUS', adminType:'satrapy' },
  { adm0:'PAK',                                                              name:'Gandhara',             polity:'KUS', adminType:'satrapy' },
  { adm0:'IND',  keywords:['Punjab','Haryana','Rajasthan','Gujarat','Uttar'],name:'Kushan India',         polity:'KUS', adminType:'satrapy' },
  { adm0:'IND',                                                              name:'Deccan Kingdoms',      polity:'DEC', adminType:'kingdom' },
  { adm0:'UZB',                                                              name:'Sogdiana',             polity:'KUS', adminType:'satrapy' },
  { adm0:'TJK',                                                              name:'Bactria',              polity:'KUS', adminType:'satrapy' },
  // ── Axum / Nubia / Arabia ──────────────────────────────────────────────────
  { adm0:'ETH',                                                              name:'Axum',                 polity:'AXU', adminType:'kingdom' },
  { adm0:'ERI',                                                              name:'Axum',                 polity:'AXU', adminType:'kingdom' },
  { adm0:'SDN',                                                              name:'Nubia / Meroe',        polity:'NUB', adminType:'kingdom' },
  { adm0:'SAU',                                                              name:'Arabia Felix',         polity:'ARA', adminType:'kingdom' },
  { adm0:'YEM',                                                              name:'Arabia Felix',         polity:'ARA', adminType:'kingdom' },
]

const OTTOMAN_PROVINCE_RULES: ProvinceRule[] = [
  // Core Anatolian provinces
  { adm0:'TUR', keywords:['İstanbul','Edirne','Tekirdağ','Kırklareli'],     name:'Rumelia (Trakya)',     polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR', keywords:['İzmir','Manisa','Balıkesir','Bursa','Aydın','Muğla'], name:'Anadolu Eyaleti', polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR', keywords:['Konya','Karaman','Isparta','Burdur'],             name:'Karaman Eyaleti',     polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR', keywords:['Sivas','Tokat','Amasya','Çorum'],                 name:'Rum Eyaleti',         polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR', keywords:['Trabzon','Rize','Giresun','Ordu'],                name:'Trabzon Eyaleti',     polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR', keywords:['Diyarbakır','Mardin','Batman','Siirt'],           name:'Diyarbakır Eyaleti',  polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR', keywords:['Maraş','Kahramanmaraş','Adıyaman'],               name:'Dulkadirli Eyaleti',  polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR', keywords:['Adana','Mersin','Hatay','Kilis'],                 name:'Adana Eyaleti',       polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR', keywords:['Erzurum','Kars','Ağrı','Ardahan'],                name:'Erzurum Eyaleti',     polity:'OTT', adminType:'eyalet' },
  { adm0:'TUR',                                                              name:'Anadolu Eyaleti',     polity:'OTT', adminType:'eyalet' },
  // Rumelia (Balkans)
  { adm0:'GRC', keywords:['Macedonia','Thrace'],                             name:'Rumeli Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'GRC', keywords:['Peloponnese','Ionian'],                           name:'Mora Eyaleti',        polity:'OTT', adminType:'eyalet' },
  { adm0:'GRC',                                                              name:'Rumeli Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'BGR',                                                              name:'Rumeli Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'SRB',                                                              name:'Rumeli Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'BIH',                                                              name:'Bosna Eyaleti',       polity:'OTT', adminType:'eyalet' },
  { adm0:'ALB',                                                              name:'Rumeli Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'MKD',                                                              name:'Rumeli Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'MNE',                                                              name:'Rumeli Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'XKX',                                                              name:'Rumeli Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'ROU',                                                              name:'Tuna Nehri Sınırı',   polity:'OTT', adminType:'vassal' },
  { adm0:'CYP',                                                              name:'Kıbrıs (Ottoman)',    polity:'OTT', adminType:'eyalet' },
  // Arab provinces
  { adm0:'SYR',                                                              name:'Şam Eyaleti',         polity:'OTT', adminType:'eyalet' },
  { adm0:'LBN',                                                              name:'Şam Eyaleti',         polity:'OTT', adminType:'eyalet' },
  { adm0:'ISR',                                                              name:'Şam Eyaleti',         polity:'OTT', adminType:'eyalet' },
  { adm0:'PSE',                                                              name:'Şam Eyaleti',         polity:'OTT', adminType:'eyalet' },
  { adm0:'JOR',                                                              name:'Şam Eyaleti',         polity:'OTT', adminType:'eyalet' },
  { adm0:'IRQ', keywords:['Baghdad','Wasit','Karbala','Najaf'],              name:'Bağdat Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'IRQ', keywords:['Basra','Maysan','Dhi Qar'],                       name:'Basra Eyaleti',       polity:'OTT', adminType:'eyalet' },
  { adm0:'IRQ', keywords:['Mosul','Dohuk','Erbil','Sulaymaniyah'],           name:'Musul Eyaleti',       polity:'OTT', adminType:'eyalet' },
  { adm0:'IRQ',                                                              name:'Bağdat Eyaleti',      polity:'OTT', adminType:'eyalet' },
  { adm0:'SAU',                                                              name:'Hicaz Eyaleti',       polity:'OTT', adminType:'eyalet' },
  { adm0:'KWT',                                                              name:'Basra Eyaleti',       polity:'OTT', adminType:'eyalet' },
  { adm0:'EGY',                                                              name:'Mısır Eyaleti',       polity:'OTT', adminType:'eyalet' },
  { adm0:'LBY',                                                              name:'Trablusgarp Eyaleti', polity:'OTT', adminType:'eyalet' },
  { adm0:'TUN',                                                              name:'Tunus Eyaleti',       polity:'OTT', adminType:'eyalet' },
  { adm0:'DZA',                                                              name:'Cezayir Eyaleti',     polity:'OTT', adminType:'eyalet' },
  // Non-Ottoman powers
  { adm0:'IRN',                                                              name:'Safavid Province',    polity:'SAF', adminType:'province' },
  { adm0:'ARM',                                                              name:'Safavid Armenia',     polity:'SAF', adminType:'province' },
  { adm0:'AZE',                                                              name:'Safavid Azerbaijan',  polity:'SAF', adminType:'province' },
  { adm0:'HUN', keywords:['Győr-Moson','Komárom','Fejér','Veszprém','Vas','Zala','Somogy','Baranya','Tolna'], name:'Budin Eyaleti', polity:'OTT', adminType:'eyalet' },
  { adm0:'HUN',                                                              name:'Royal Hungary',       polity:'HAB', adminType:'kingdom' },
  { adm0:'HRV',                                                              name:'Croatia (Habsburg)',  polity:'HAB', adminType:'kingdom' },
  { adm0:'AUT',                                                              name:'Archduchy of Austria',polity:'HAB', adminType:'duchy' },
  { adm0:'DEU',                                                              name:'Holy Roman Empire',   polity:'HRE', adminType:'territory' },
  { adm0:'CHE',                                                              name:'Swiss Confederation', polity:'HRE', adminType:'territory' },
  { adm0:'FRA',                                                              name:'Kingdom of France',   polity:'FRA', adminType:'province' },
  { adm0:'GBR',                                                              name:'Kingdom of England',  polity:'ENG', adminType:'kingdom' },
  { adm0:'ESP',                                                              name:'Crown of Castile',    polity:'ESP', adminType:'kingdom' },
  { adm0:'PRT',                                                              name:'Kingdom of Portugal', polity:'POR', adminType:'kingdom' },
  { adm0:'POL',                                                              name:'Poland-Lithuania',    polity:'PLT', adminType:'voivodeship' },
  { adm0:'LTU',                                                              name:'Grand Duchy of Lithuania', polity:'PLT', adminType:'duchy' },
  { adm0:'RUS',                                                              name:'Muscovy',             polity:'MUS', adminType:'principality' },
  { adm0:'ITA', keywords:['Veneto','Friuli','Istria'],                        name:'Republic of Venice', polity:'VNC', adminType:'territory' },
  { adm0:'ITA',                                                              name:'Italian States',      polity:'HRE', adminType:'territory' },
  { adm0:'ETH',                                                              name:'Ethiopian Empire',    polity:'ETI', adminType:'kingdom' },
  { adm0:'MOR',                                                              name:'Saadian Morocco',     polity:'MOR', adminType:'kingdom' },
]

const GREEK_PROVINCE_RULES: ProvinceRule[] = [
  // ── Greece proper ─────────────────────────────────────────────────────────
  { adm0:'GRC', keywords:['Macedonia','Thrace'],                             name:'Macedon',             polity:'MAC', adminType:'kingdom' },
  { adm0:'GRC', keywords:['Epirus'],                                         name:'Epirus',              polity:'EPI', adminType:'kingdom' },
  { adm0:'GRC', keywords:['Thessaly','Larissa'],                              name:'Thessaly',            polity:'THS', adminType:'league' },
  { adm0:'GRC', keywords:['Central','Boeotia','Phocis','Locris'],             name:'Boeotia / Thebes',    polity:'THE', adminType:'region' },
  { adm0:'GRC', keywords:['Attica'],                                          name:'Attica',              polity:'ATH', adminType:'region' },
  { adm0:'GRC', keywords:['Peloponnese','Laconia','Messenia'],                name:'Laconia / Sparta',    polity:'SPA', adminType:'region' },
  { adm0:'GRC', keywords:['Achaea','Corinth','Argolis'],                      name:'Achaea / Corinth',    polity:'ACH', adminType:'region' },
  { adm0:'GRC', keywords:['Crete'],                                           name:'Crete',               polity:'KMT', adminType:'island' },
  { adm0:'GRC', keywords:['Aegean','Cyclades','Dodecanese','Northern Aegean'],name:'Aegean Islands',      polity:'ATH', adminType:'island' },
  { adm0:'GRC',                                                               name:'Greek Mainland',      polity:'ATH', adminType:'region' },
  // ── Macedonia / Thrace ─────────────────────────────────────────────────────
  { adm0:'MKD',                                                               name:'Upper Macedon',       polity:'MAC', adminType:'region' },
  { adm0:'BGR',                                                               name:'Thrace',              polity:'SCY', adminType:'tribal' },
  { adm0:'SRB',                                                               name:'Illyria / Paeonia',   polity:'ILY', adminType:'tribal' },
  { adm0:'ALB',                                                               name:'Illyria',             polity:'ILY', adminType:'tribal' },
  { adm0:'MNE',                                                               name:'Illyria',             polity:'ILY', adminType:'tribal' },
  // ── Anatolia ──────────────────────────────────────────────────────────────
  { adm0:'TUR', keywords:['İzmir','Manisa','Aydın','Muğla','Çanakkale'],     name:'Ionia / Lydia',       polity:'TRH', adminType:'satrapy' },
  { adm0:'TUR', keywords:['Bursa','Bilecik','Bolu'],                          name:'Bithynia / Mysia',    polity:'TRH', adminType:'satrapy' },
  { adm0:'TUR', keywords:['Ankara','Konya','Afyon','Kütahya','Eskişehir'],   name:'Phrygia',             polity:'TRH', adminType:'satrapy' },
  { adm0:'TUR', keywords:['Kayseri','Sivas','Tokat','Yozgat','Amasya'],       name:'Cappadocia / Pontus', polity:'TRH', adminType:'satrapy' },
  { adm0:'TUR', keywords:['Adana','Mersin','Hatay'],                          name:'Cilicia',             polity:'TRH', adminType:'satrapy' },
  { adm0:'TUR', keywords:['Antalya','Burdur','Isparta'],                      name:'Lycia / Pamphylia',   polity:'TRH', adminType:'satrapy' },
  { adm0:'TUR',                                                               name:'Anatolia',            polity:'TRH', adminType:'satrapy' },
  // ── Persia / East ─────────────────────────────────────────────────────────
  { adm0:'IRN',                                                               name:'Persia / Media',      polity:'EUN', adminType:'satrapy' },
  { adm0:'IRQ',                                                               name:'Babylonia / Assyria', polity:'EUN', adminType:'satrapy' },
  { adm0:'SYR',                                                               name:'Syria',               polity:'EUN', adminType:'satrapy' },
  { adm0:'ISR',                                                               name:'Phoenicia / Coele-Syria', polity:'EUN', adminType:'satrapy' },
  { adm0:'LBN',                                                               name:'Phoenicia',           polity:'EUN', adminType:'satrapy' },
  { adm0:'EGY',                                                               name:'Egypt',               polity:'KMT', adminType:'satrapy' },
  { adm0:'ARM',                                                               name:'Armenia',             polity:'EUN', adminType:'satrapy' },
  { adm0:'AZE',                                                               name:'Caucasian Albania',   polity:'EUN', adminType:'satrapy' },
  // ── Western Mediterranean ─────────────────────────────────────────────────
  { adm0:'ITA', keywords:['Sicilia'],                                          name:'Sicily',             polity:'SRC', adminType:'region' },
  { adm0:'ITA',                                                                name:'Magna Graecia / Italic Peoples', polity:'ITL', adminType:'tribal' },
  { adm0:'TUN',                                                                name:'Carthage',           polity:'CAR', adminType:'city-state' },
  { adm0:'ESP',                                                                name:'Iberian Peoples',    polity:'CEL', adminType:'tribal' },
  { adm0:'FRA',                                                                name:'Celtic Gaul',        polity:'CEL', adminType:'tribal' },
  { adm0:'CYP',                                                                name:'Cyprus',             polity:'EUN', adminType:'satrapy' },
]

const ABBASID_PROVINCE_RULES: ProvinceRule[] = [
  // Abbasid Caliphate
  { adm0:'IRQ',                                                              name:'Sawad (Iraq)',        polity:'ABB', adminType:'province' },
  { adm0:'SYR',                                                              name:'Bilad al-Sham',       polity:'ABB', adminType:'province' },
  { adm0:'EGY',                                                              name:'Misr (Egypt)',        polity:'ABB', adminType:'province' },
  { adm0:'SAU',                                                              name:'Hijaz & Nejd',        polity:'ABB', adminType:'province' },
  { adm0:'YEM',                                                              name:'Yemen',               polity:'ABB', adminType:'province' },
  { adm0:'ISR',                                                              name:'Jund Filastin',       polity:'ABB', adminType:'province' },
  { adm0:'JOR',                                                              name:'Jund al-Urdunn',      polity:'ABB', adminType:'province' },
  { adm0:'LBN',                                                              name:'Jund Hims',           polity:'ABB', adminType:'province' },
  { adm0:'TUN',                                                              name:'Ifriqiya',            polity:'ABB', adminType:'province' },
  { adm0:'LBY',                                                              name:'Barqa',               polity:'ABB', adminType:'province' },
  { adm0:'DZA',                                                              name:'Maghreb al-Awsat',    polity:'ABB', adminType:'province' },
  // Samanid Persia
  { adm0:'IRN',                                                              name:'Khorasan / Fars',     polity:'SAM', adminType:'province' },
  { adm0:'AFG',                                                              name:'Khorasan East',       polity:'SAM', adminType:'province' },
  { adm0:'UZB',                                                              name:'Transoxiana',         polity:'SAM', adminType:'province' },
  { adm0:'TKM',                                                              name:'Margiana',            polity:'SAM', adminType:'province' },
  { adm0:'TJK',                                                              name:'Bactria',             polity:'SAM', adminType:'province' },
  // Byzantine Empire
  { adm0:'TUR', keywords:['İstanbul','Edirne','Bursa','İzmir'],             name:'Thrace & Bithynia',   polity:'BYZ', adminType:'theme' },
  { adm0:'TUR', keywords:['Konya','Antalya','Burdur','Isparta'],            name:'Anatolikon Theme',     polity:'BYZ', adminType:'theme' },
  { adm0:'TUR', keywords:['Trabzon','Samsun','Rize','Giresun'],             name:'Armeniakon Theme',     polity:'BYZ', adminType:'theme' },
  { adm0:'TUR',                                                              name:'Anatolia (Byzantine)', polity:'BYZ', adminType:'theme' },
  { adm0:'GRC',                                                              name:'Hellas Theme',         polity:'BYZ', adminType:'theme' },
  { adm0:'BGR',                                                              name:'Bulgaria',             polity:'BUL', adminType:'kingdom' },
  { adm0:'CYP',                                                              name:'Cyprus (Byzantine)',   polity:'BYZ', adminType:'province' },
  // Frankish Empire
  { adm0:'FRA',                                                              name:'Francia',              polity:'FRK', adminType:'county' },
  { adm0:'DEU', keywords:['Bayern','Baden','Württemberg'],                   name:'Bavaria',              polity:'FRK', adminType:'duchy' },
  { adm0:'DEU',                                                              name:'Saxony / Austrasia',   polity:'FRK', adminType:'duchy' },
  { adm0:'ITA',                                                              name:'Lombard Italy',        polity:'FRK', adminType:'duchy' },
  { adm0:'ESP',                                                              name:'Spanish March',        polity:'FRK', adminType:'march' },
  // Umayyad Al-Andalus
  { adm0:'ESP', keywords:['Andaluc','Murcia','Extremadura'],                 name:'Al-Andalus (south)',   polity:'UMA', adminType:'province' },
  { adm0:'PRT',                                                              name:'Al-Gharb (Portugal)',  polity:'UMA', adminType:'province' },
  // Morocco
  { adm0:'MAR',                                                              name:'Idrisid Morocco',      polity:'IDR', adminType:'kingdom' },
  // India
  { adm0:'IND',                                                              name:'Pratihara Kingdom',    polity:'PRH', adminType:'kingdom' },
  { adm0:'PAK',                                                              name:'Sindh / Gandhara',     polity:'PRH', adminType:'kingdom' },
  { adm0:'BGD',                                                              name:'Pala Bengal',          polity:'PAL', adminType:'kingdom' },
  // East Africa
  { adm0:'ETH',                                                              name:'Axum Empire',          polity:'AXU', adminType:'kingdom' },
]

const TANG_PROVINCE_RULES: ProvinceRule[] = [
  // Tang Dynasty provinces (jimi prefectures / circuits)
  { adm0:'CHN', keywords:['Hebei','Beijing','Tianjin','Shanxi','Shaanxi'],  name:'He Bei / He Dong Circuit', polity:'TNG', adminType:'circuit' },
  { adm0:'CHN', keywords:['Henan','Shandong','Jiangsu','Anhui'],            name:'Henan / Huainan Circuit',  polity:'TNG', adminType:'circuit' },
  { adm0:'CHN', keywords:['Sichuan','Chongqing','Yunnan','Guizhou'],        name:'Jiannan Circuit',          polity:'TNG', adminType:'circuit' },
  { adm0:'CHN', keywords:['Guangdong','Guangxi','Fujian','Zhejiang'],       name:'Lingnan / Jiangnan Circuit',polity:'TNG', adminType:'circuit' },
  { adm0:'CHN', keywords:['Gansu','Qinghai','Xinjiang'],                    name:'Hexi / Longyou Circuit',   polity:'TNG', adminType:'circuit' },
  { adm0:'CHN',                                                              name:'Tang Dynasty China',       polity:'TNG', adminType:'circuit' },
  { adm0:'TWN',                                                              name:'Yizhou Island',            polity:'TNG', adminType:'circuit' },
  // Tibetan Empire
  { adm0:'NPL',                                                              name:'Nepal (Tibetan sphere)',   polity:'TIB', adminType:'kingdom' },
  { adm0:'BTN',                                                              name:'Bhutan (Tibetan)',         polity:'TIB', adminType:'region' },
  // Göktürk
  { adm0:'MNG',                                                              name:'Uyghur Khaganate',         polity:'GOK', adminType:'khanate' },
  { adm0:'KAZ',                                                              name:'Western Türk Steppe',      polity:'GOK', adminType:'khanate' },
  // Korea
  { adm0:'KOR',                                                              name:'Silla Kingdom',            polity:'SLL', adminType:'kingdom' },
  { adm0:'PRK',                                                              name:'Balhae / Parhae',          polity:'SLL', adminType:'kingdom' },
  // Japan
  { adm0:'JPN',                                                              name:'Nara Japan',               polity:'NAR', adminType:'province' },
  // Nanzhao
  { adm0:'VNM',                                                              name:'Dai Viet (Tang tributary)',  polity:'NNZ', adminType:'province' },
  { adm0:'THA',                                                              name:'Srivijaya sphere',         polity:'KHR', adminType:'mandala' },
  // Khmer
  { adm0:'KHM',                                                              name:'Khmer Empire',             polity:'KHR', adminType:'mandala' },
  // India
  { adm0:'IND',                                                              name:'Chalukya / Pallava India',  polity:'CLK', adminType:'kingdom' },
]

const AZTEC_PROVINCE_RULES: ProvinceRule[] = [
  { adm0:'MEX', keywords:['Ciudad de México','Mexico City','Hidalgo','Puebla','Tlaxcala','Morelos'],  name:'Valley of Mexico',           polity:'AZT', adminType:'altepetl' },
  { adm0:'MEX', keywords:['Veracruz','Tabasco','Campeche'],                 name:'Gulf Coast Provinces',      polity:'AZT', adminType:'altepetl' },
  { adm0:'MEX', keywords:['Oaxaca'],                                         name:'Mixtec Region',             polity:'MIX', adminType:'altepetl' },
  { adm0:'MEX', keywords:['Yucatán','Quintana Roo','Chiapas'],               name:'Maya Yucatan',              polity:'MYA', adminType:'altepetl' },
  { adm0:'MEX',                                                              name:'Aztec Frontier Zone',       polity:'AZT', adminType:'altepetl' },
  { adm0:'GTM',                                                              name:'Maya Highlands',            polity:'MYA', adminType:'altepetl' },
  { adm0:'HND',                                                              name:'Maya / Lenca Territory',    polity:'MYA', adminType:'altepetl' },
  { adm0:'PER',                                                              name:'Tawantinsuyu (Inca)',        polity:'INC', adminType:'suyu' },
  { adm0:'BOL',                                                              name:'Qullasuyu (Inca)',          polity:'INC', adminType:'suyu' },
  { adm0:'ECU',                                                              name:'Chinchaysuyu (Inca)',       polity:'INC', adminType:'suyu' },
  { adm0:'CHL',                                                              name:'Antisuyu / Southern Inca', polity:'INC', adminType:'suyu' },
  { adm0:'ARG',                                                              name:'Southern Inca borderlands', polity:'INC', adminType:'suyu' },
  { adm0:'COL',                                                              name:'Northern Inca sphere',     polity:'INC', adminType:'suyu' },
  { adm0:'BRA',                                                              name:'Tupi Territory',            polity:'TUP', adminType:'tribal' },
  { adm0:'CUB',                                                              name:'Taíno Caribbean',           polity:'CRB', adminType:'chiefdom' },
]

const SONGHAI_PROVINCE_RULES: ProvinceRule[] = [
  { adm0:'MLI', keywords:['Tombouctou','Timbuktu','Gao'],                   name:'Songhai Heartland',         polity:'SGH', adminType:'province' },
  { adm0:'MLI',                                                              name:'Mali Remnants',             polity:'MLR', adminType:'province' },
  { adm0:'NER',                                                              name:'Songhai East',              polity:'SGH', adminType:'province' },
  { adm0:'BFA',                                                              name:'Songhai Southwest',         polity:'SGH', adminType:'province' },
  { adm0:'SEN',                                                              name:'Wolof / Tekrur',            polity:'MLR', adminType:'kingdom' },
  { adm0:'GIN',                                                              name:'Fula Highlands',            polity:'MLR', adminType:'kingdom' },
  { adm0:'NGA', keywords:['Kano','Katsina','Zaria','Sokoto'],               name:'Hausa Kingdoms',            polity:'KNB', adminType:'emirate' },
  { adm0:'NGA', keywords:['Lagos','Oyo','Osun','Ogun','Ondo'],              name:'Yoruba / Oyo States',       polity:'YOR', adminType:'kingdom' },
  { adm0:'NGA', keywords:['Edo','Delta','Bayelsa'],                          name:'Benin Kingdom',             polity:'BNI', adminType:'kingdom' },
  { adm0:'NGA',                                                              name:'Niger Delta Peoples',       polity:'KNB', adminType:'chiefdom' },
  { adm0:'TCD',                                                              name:'Kanem-Bornu',               polity:'KNB', adminType:'sultanate' },
  { adm0:'CMR',                                                              name:'Kanem borderlands',         polity:'KNB', adminType:'chiefdom' },
  { adm0:'COD',                                                              name:'Kongo Kingdom',             polity:'KNG', adminType:'kingdom' },
  { adm0:'AGO',                                                              name:'Kongo South',               polity:'KNG', adminType:'kingdom' },
  { adm0:'ZWE',                                                              name:'Mutapa Empire',             polity:'ZIM', adminType:'kingdom' },
  { adm0:'MOZ',                                                              name:'Mutapa Coast',              polity:'ZIM', adminType:'kingdom' },
  { adm0:'ETH',                                                              name:'Ethiopian Highlands',       polity:'ETH', adminType:'kingdom' },
  { adm0:'GHA',                                                              name:'Akan Gold Coast',           polity:'AKN', adminType:'chiefdom' },
  { adm0:'CIV',                                                              name:'Akan Rainforest',           polity:'AKN', adminType:'chiefdom' },
  { adm0:'MAR',                                                              name:'Saadian Morocco',           polity:'MOR', adminType:'sultanate' },
  { adm0:'EGY',                                                              name:'Mamluk Egypt',              polity:'MOR', adminType:'sultanate' },
]

const SENGOKU_PROVINCE_RULES: ProvinceRule[] = [
  // Japanese provinces — approximate by modern prefecture
  { adm0:'JPN', keywords:['Aichi','Mie','Shizuoka','Gifu','Nagoya'],        name:'Owari / Mikawa (Oda)',       polity:'ODA', adminType:'domain' },
  { adm0:'JPN', keywords:['Kyoto','Osaka','Hyogo','Nara','Shiga'],          name:'Kinai Region (Contested)',   polity:'ASH', adminType:'domain' },
  { adm0:'JPN', keywords:['Yamanashi','Nagano'],                             name:'Kai / Shinano (Takeda)',     polity:'TAK', adminType:'domain' },
  { adm0:'JPN', keywords:['Niigata'],                                        name:'Echigo (Uesugi)',            polity:'UES', adminType:'domain' },
  { adm0:'JPN', keywords:['Hiroshima','Shimane','Yamaguchi','Tottori'],      name:'Chugoku (Mori)',             polity:'MOT', adminType:'domain' },
  { adm0:'JPN', keywords:['Kagoshima','Miyazaki','Kumamoto'],                name:'Satsuma (Shimazu)',          polity:'SHI', adminType:'domain' },
  { adm0:'JPN', keywords:['Kanagawa','Saitama','Tokyo'],                     name:'Sagami / Musashi (Hojo)',   polity:'HOJ', adminType:'domain' },
  { adm0:'JPN', keywords:['Miyagi','Fukushima','Yamagata','Iwate'],          name:'Mutsu / Dewa (Date)',        polity:'DAT', adminType:'domain' },
  { adm0:'JPN', keywords:['Kochi'],                                           name:'Tosa (Chosokabe)',          polity:'CHO', adminType:'domain' },
  { adm0:'JPN',                                                              name:'Japanese Domains',           polity:'ODA', adminType:'domain' },
  // Korea
  { adm0:'KOR',                                                              name:'Joseon Korea',               polity:'JOS', adminType:'province' },
  { adm0:'PRK',                                                              name:'Joseon North',               polity:'JOS', adminType:'province' },
  // Ming China
  { adm0:'CHN', keywords:['Guangdong','Fujian','Zhejiang','Jiangsu'],       name:'Ming Southern Provinces',   polity:'MIN', adminType:'province' },
  { adm0:'CHN', keywords:['Hebei','Shanxi','Shaanxi','Henan','Shandong'],   name:'Ming Northern Provinces',   polity:'MIN', adminType:'province' },
  { adm0:'CHN', keywords:['Sichuan','Yunnan','Guizhou'],                    name:'Ming Western Provinces',    polity:'MIN', adminType:'province' },
  { adm0:'CHN',                                                              name:'Ming Dynasty',              polity:'MIN', adminType:'province' },
  { adm0:'TWN',                                                              name:'Taiwan (Ming sphere)',      polity:'MIN', adminType:'province' },
]

const ERA_PROVINCE_RULES: Record<string, ProvinceRule[]> = {
  roman: ROMAN_PROVINCE_RULES,
  ottoman: OTTOMAN_PROVINCE_RULES,
  greek: GREEK_PROVINCE_RULES,
  abbasid: ABBASID_PROVINCE_RULES,
  tang: TANG_PROVINCE_RULES,
  aztec: AZTEC_PROVINCE_RULES,
  songhai: SONGHAI_PROVINCE_RULES,
  sengoku: SENGOKU_PROVINCE_RULES,
}

/** Apply province rules to a GeoJSON feature collection (Natural Earth admin-1).
 *  Returns a new FeatureCollection with only features that have a matching rule,
 *  each annotated with ancient province metadata. */
function applyProvinceRules(
  geojson: GeoJSONFeatureCollection,
  rules: ProvinceRule[],
): GeoJSONFeatureCollection {
  const features: GeoJSONFeatureCollection['features'] = []

  for (const feature of geojson.features) {
    const props = feature.properties as Record<string, unknown>
    const adm0 = ((props.adm0_a3 ?? props.ADM0_A3 ?? '') as string).toUpperCase()
    const regionName = ((props.name ?? props.NAME ?? '') as string)

    // Find matching rule: keyword-first (specific), then default (catch-all)
    const keywordRule = rules.find(r =>
      r.adm0 === adm0 && r.keywords && r.keywords.some(k => regionName.includes(k))
    )
    const defaultRule = rules.find(r => r.adm0 === adm0 && !r.keywords)
    const rule = keywordRule ?? defaultRule
    if (!rule) continue

    features.push({
      ...feature,
      properties: {
        ...props,
        // Preserve original name for tooltip
        modernName: regionName,
        // Ancient province metadata
        ancientName: rule.name,
        polityId: rule.polity,
        adminType: rule.adminType,
        // Keep adm0_a3 for downstream logic
        adm0_a3: adm0,
      },
    })
  }

  return { type: 'FeatureCollection', features }
}

// GET /api/game/ancient-provinces/:era
gameRouter.get('/ancient-provinces/:era', (req, res) => {
  const { era } = req.params
  const rules = ERA_PROVINCE_RULES[era]
  if (!rules) {
    res.status(400).json({ error: `No province rules for era: ${era}` })
    return
  }

  const provincesPath = join(ERAS_DIR, 'provinces.geojson')
  const result = readEraFile(provincesPath)
  if ('notFound' in result) {
    res.status(404).json({ error: 'provinces.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read provinces file' })
    return
  }

  const enriched = applyProvinceRules(result.data, rules)
  res.json(enriched)
})

// GET /api/game/provinces — Natural Earth 50m admin-1 states/provinces
gameRouter.get('/provinces', (_req, res) => {
  const provincesPath = join(ERAS_DIR, 'provinces.geojson')
  const result = readEraFile(provincesPath)
  if ('notFound' in result) {
    res.status(404).json({ error: 'provinces.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read provinces file' })
    return
  }
  res.json(result.data)
})

// GET /api/game/cities — Natural Earth 10m populated places
gameRouter.get('/cities', (_req, res) => {
  const citiesPath = join(ERAS_DIR, 'cities.geojson')
  const result = readEraFile(citiesPath)
  if ('notFound' in result) {
    res.status(404).json({ error: 'cities.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read cities file' })
    return
  }
  res.json(result.data)
})

// GET /api/game/geojson/:era
gameRouter.get('/geojson/:era', (req, res) => {
  const { era } = req.params

  if (!isValidEra(era)) {
    res.status(400).json({ error: `Invalid era: ${era}. Must be one of: ${VALID_ERAS.join(', ')}` })
    return
  }

  const result = readEraFile(getEraFilePath(era))

  if ('notFound' in result) {
    res.status(404).json({ error: `GeoJSON file not found for era: ${era}` })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read GeoJSON file' })
    return
  }

  res.json(result.data)
})

// GET /api/game/era/:era
gameRouter.get('/era/:era', (req, res) => {
  const { era } = req.params

  if (!isValidEra(era)) {
    res.status(400).json({ error: `Invalid era: ${era}. Must be one of: ${VALID_ERAS.join(', ')}` })
    return
  }

  let geojsonData: GeoJSONFeatureCollection

  const ancientEras: Era[] = ['greek', 'roman', 'ottoman']
  if (ancientEras.includes(era as Era)) {
    // For ancient eras, build state.countries from the SAME polity-coded GeoJSON
    // used for rendering, so that state.countries keys (OTT, FRA, ROM…) match the
    // ISO_A3 values on map features and the colour expression fires correctly.
    const renderPath = join(ERAS_DIR, `${era}_render.geojson`)
    const renderResult = readEraFile(renderPath)
    if ('data' in renderResult) {
      geojsonData = renderResult.data
    } else {
      // Fall back to remapping modern borders (same as /borders/:era)
      const polityMap = ERA_COUNTRY_MAPS[era as Era]
      if (!polityMap) {
        res.status(500).json({ error: `No polity mapping for era: ${era}` })
        return
      }
      const modernResult = readEraFile(join(ERAS_DIR, 'borders.geojson'))
      const source = 'data' in modernResult ? modernResult
        : readEraFile(join(ERAS_DIR, 'modern.geojson'))
      if (!('data' in source)) {
        res.status(500).json({ error: 'No border data available. Run: node shared/eras/download-historical.mjs' })
        return
      }
      geojsonData = remapToAncientPolities(source.data, polityMap)
    }
  } else {
    const result = readEraFile(getEraFilePath(era))
    if ('notFound' in result) {
      res.status(404).json({ error: `GeoJSON file not found for era: ${era}` })
      return
    }
    if ('error' in result) {
      res.status(500).json({ error: 'Failed to build era start conditions' })
      return
    }
    geojsonData = result.data
  }

  const response: EraStartConditions = {
    era,
    startDate: ERA_START_DATES[era],
    countries: buildCountriesFromGeoJSON(geojsonData),
    organisations: [],
    disputes: ERA_DISPUTES[era] ?? [],
    nonStateActors: ERA_NON_STATE_ACTORS[era] ?? [],
    strategicPassages: buildStrategicPassages(era),
  }

  res.json(response)
})
