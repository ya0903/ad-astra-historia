import { Router } from 'express'
import { readFileSync } from 'fs'
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
    batteries: 0,
    microchips: 0,
    space: 0,
    pharmaceuticals: 0,
    agriculture: 0,
    finance: 0,
  }
}

interface GeoJSONProperties {
  ISO_A3?: string
  ADM0_A3?: string
  ADMIN?: string
  NAME?: string
  POP_EST?: number
  GDP_MD?: number
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

const ERA_COUNTRY_MAPS: Partial<Record<Era, Record<string, string>>> = {
  ottoman: OTTOMAN_MAP,
  roman:   ROMAN_MAP,
  greek:   GREEK_MAP,
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
  ATH:'Athens', SPA:'Sparta', THE:'Thebes', MAC:'Macedon', EPI:'Epirus',
  THS:'Thessaly', ACH:'Achaea', ILY:'Illyria', TRH:'Anatolia', CRT:'Crete',
  ITL:'Italian Peoples', SRC:'Syracuse', KMT:'Egypt', CAR:'Carthage',
  CEL:'Celtic Gaul', SCY:'Scythia', NUB:'Nubia', ARA:'Arabia', EUN:'Persia',
  ROM:'Roman Empire', PAR:'Parthian Empire', KUS:'Kushan Empire',
  DEC:'Deccan Kingdoms', GER:'Germania', SAR:'Sarmatia', AXU:'Axum', ARK:'Armenia',
  OTT:'Ottoman Empire', SAF:'Safavid Persia', HAB:'Habsburg Empire',
  HRE:'Holy Roman Empire', FRA:'France', ENG:'England', PLT:'Poland-Lithuania',
  POR:'Portugal', ESP:'Spain', VNC:'Venice', MUS:'Muscovy',
  MUG:'Mughal Empire', SON:'Songhai', MOR:'Morocco', ETI:'Ethiopia',
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
gameRouter.get('/biomes', (_req, res) => {
  const biomesPath = join(ERAS_DIR, 'biomes.geojson')
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
