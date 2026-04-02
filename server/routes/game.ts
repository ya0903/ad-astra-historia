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

const VALID_ERAS: Era[] = ['1945', '1960s', '1990s', '2010s', 'modern']

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

function buildStrategicPassages(): Record<string, PassageStatus> {
  const open: PassageStatus = 'open'
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

export const gameRouter = Router()

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
    strategicPassages: buildStrategicPassages(),
  }

  res.json(response)
})
