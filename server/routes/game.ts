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

function defaultStats(gdp: number): CountryStats {
  return {
    gdp,
    military: 0,
    researchPoints: 0,
    approval: 50,
    softPower: 0,
    techLevel: 0,
    culturalReach: 0,
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
      stats: defaultStats(gdp),
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

function remapToAncientPolities(
  modern: GeoJSONFeatureCollection,
  mapping: Record<string, string>,
): GeoJSONFeatureCollection {
  const features: typeof modern.features = []
  for (const feature of modern.features) {
    const props = feature.properties
    const iso = props.ISO_A3 ?? props.ADM0_A3 ?? ''
    const polity = mapping[iso]
    if (!polity) continue  // territory outside this era's known world
    features.push({
      ...feature,
      properties: { ...props, ISO_A3: polity, ADM0_A3: polity },
    })
  }
  return { type: 'FeatureCollection', features } as unknown as GeoJSONFeatureCollection
}

export const gameRouter = Router()

// GET /api/game/borders/:era — era-specific border polygons
// For ancient eras: returns remapped modern borders (accurate coastlines, polity colours).
gameRouter.get('/borders/:era', (req, res) => {
  const { era } = req.params
  if (!isValidEra(era)) {
    res.status(400).json({ error: `Invalid era: ${era}` })
    return
  }

  const polityMap = ERA_COUNTRY_MAPS[era as Era]
  if (polityMap) {
    // Load modern borders and remap features to ancient polity codes
    const bordersPath = join(ERAS_DIR, 'borders.geojson')
    const modernResult = readEraFile(bordersPath)
    const source = 'data' in modernResult ? modernResult
      : readEraFile(join(ERAS_DIR, 'modern.geojson'))
    if (!('data' in source)) {
      res.status(500).json({ error: 'Modern borders file missing — run download.mjs' })
      return
    }
    res.json(remapToAncientPolities(source.data, polityMap))
    return
  }

  // Non-ancient eras — fall back to era-specific file
  const result = readEraFile(getEraFilePath(era))
  if ('notFound' in result) {
    res.status(404).json({ error: `Border file not found for era: ${era}` })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read era border file' })
    return
  }
  res.json(result.data)
})

// GET /api/game/borders — 50m country polygons for rendering (includes small territories like Gaza)
gameRouter.get('/borders', (_req, res) => {
  const bordersPath = join(ERAS_DIR, 'borders.geojson')
  const result = readEraFile(bordersPath)
  if ('notFound' in result) {
    // Fall back to 110m if 50m not downloaded yet
    const fallback = readEraFile(join(ERAS_DIR, 'modern.geojson'))
    if ('data' in fallback) { res.json(fallback.data); return }
    res.status(404).json({ error: 'borders.geojson not found. Run: node shared/eras/download.mjs' })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to read borders file' })
    return
  }
  res.json(result.data)
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

  const result = readEraFile(getEraFilePath(era))

  if ('notFound' in result) {
    res.status(404).json({ error: `GeoJSON file not found for era: ${era}` })
    return
  }
  if ('error' in result) {
    res.status(500).json({ error: 'Failed to build era start conditions' })
    return
  }

  const response: EraStartConditions = {
    era,
    startDate: ERA_START_DATES[era],
    countries: buildCountriesFromGeoJSON(result.data),
    organisations: [],
    disputes: ERA_DISPUTES[era] ?? [],
    nonStateActors: ERA_NON_STATE_ACTORS[era] ?? [],
    strategicPassages: buildStrategicPassages(era),
  }

  res.json(response)
})
