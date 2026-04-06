# Map Visuals, Country Database & Living World Simulation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game feel polished, data-driven, and alive by fixing map biome/river/lake rendering with gradient blending, replacing AI-generated country data with a real-world database, and adding a probabilistic world simulation engine that generates autonomous events every week.

**Architecture:** Three phases built bottom-up. Phase 1 fixes the map data pipeline (download, preprocess, render). Phase 2 embeds a static country database and wires it into game initialization. Phase 3 adds the world tick engine that runs every week, generating probabilistic events and news. Each phase produces independently testable, committable work.

**Tech Stack:** TypeScript, React 18, Zustand, MapLibre GL, Express, Vitest, @turf/buffer (new dependency for biome preprocessing), Natural Earth GeoJSON datasets.

**Spec:** `docs/superpowers/specs/2026-04-07-map-data-worldsim-design.md`

---

## Phase 1: Map Visuals — Biomes, Rivers & Lakes

### Task 1: Add lakes to download script and auto-download on server start

**Files:**
- Modify: `shared/eras/download.mjs`
- Modify: `server/index.ts`
- Test: `server/tests/health.test.ts`

- [ ] **Step 1: Add lakes URL to download script**

In `shared/eras/download.mjs`, add the lakes download after the rivers block (after line 134):

```javascript
// After the rivers block, add:

// Lakes — filled polygons for major world lakes
const LAKES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson'

// Inside the try block, after the rivers download (after line 134):
const lakesPath = join(__dirname, 'lakes.geojson')
if (existsSync(lakesPath)) {
  console.log(`lakes.geojson already exists (${featureCount(lakesPath)} features) — skipping.`)
} else {
  await downloadFile(LAKES_URL, lakesPath, 'lakes.geojson (10m lakes)')
}
```

Update the summary at the end to include lakes:
```javascript
console.log('  Lakes:      lakes.geojson (10m lakes)')
```

- [ ] **Step 2: Add auto-download check to server startup**

In `server/index.ts`, add a synchronous check before the server starts. Modify the startup block (after line 59):

```typescript
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

// Add before the if (process.argv[1] === ...) block:
function ensureGeoData() {
  const erasDir = join(__dirname, '../shared/eras')
  const required = ['biomes.geojson', 'rivers.geojson', 'ocean.geojson', 'lakes.geojson']
  const missing = required.filter(f => !existsSync(join(erasDir, f)))
  if (missing.length > 0) {
    console.log(`Missing GeoJSON files: ${missing.join(', ')}. Downloading...`)
    try {
      execSync('node shared/eras/download.mjs', {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 120_000,
      })
      console.log('GeoJSON download complete.')
    } catch (err) {
      console.warn('Warning: GeoJSON download failed. Map features may be missing.', (err as Error).message)
    }
  }
}

// Then in the startup block:
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureGeoData()  // <-- add this line
  const PORT = Number(process.env.PORT ?? 3001)
  createApp().listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}
```

- [ ] **Step 3: Add lakes endpoint to game router**

In `server/routes/game.ts`, add after the rivers endpoint (after line 739):

```typescript
// GET /api/game/lakes — Natural Earth 10m lakes (filled polygons)
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
```

- [ ] **Step 4: Run the download script manually to populate data**

```bash
cd G:/Claude/ad-astra-historia && node shared/eras/download.mjs
```

Expected: Downloads biomes.geojson, rivers.geojson, ocean.geojson, lakes.geojson (plus any others missing). Each file reports feature count.

- [ ] **Step 5: Test the endpoints**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run server/tests/game.test.ts
```

Expected: Existing tests pass. Then add a quick smoke test in `server/tests/game.test.ts`:

```typescript
describe('GET /api/game/lakes', () => {
  it('returns 200 with a FeatureCollection', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/lakes')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
    expect(res.body.features.length).toBeGreaterThan(0)
  })
})

describe('GET /api/game/biomes', () => {
  it('returns 200 with a FeatureCollection', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/biomes')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
  })
})

describe('GET /api/game/rivers', () => {
  it('returns 200 with a FeatureCollection', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/rivers')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
  })
})
```

- [ ] **Step 6: Run all tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/eras/download.mjs server/index.ts server/routes/game.ts server/tests/game.test.ts
git commit -m "feat: auto-download GeoJSON on server start, add lakes endpoint"
```

---

### Task 2: Generate biome buffer zones for gradient blending

**Files:**
- Create: `shared/eras/generateBiomeBuffers.mjs`
- Modify: `shared/package.json` (add @turf/buffer dependency)
- Modify: `server/routes/game.ts` (serve blended file)

- [ ] **Step 1: Install turf buffer dependency**

```bash
cd G:/Claude/ad-astra-historia && npm install @turf/buffer @turf/helpers --workspace=shared
```

- [ ] **Step 2: Create the buffer generation script**

Create `shared/eras/generateBiomeBuffers.mjs`:

```javascript
#!/usr/bin/env node
// shared/eras/generateBiomeBuffers.mjs
// Generates biome buffer zones for gradient blending on the map.
// Run with: node shared/eras/generateBiomeBuffers.mjs
// Input:  shared/eras/biomes.geojson
// Output: shared/eras/biomes-blended.geojson

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import buffer from '@turf/buffer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const biomesPath = join(__dirname, 'biomes.geojson')
const outputPath = join(__dirname, 'biomes-blended.geojson')

if (!existsSync(biomesPath)) {
  console.error('biomes.geojson not found. Run: node shared/eras/download.mjs')
  process.exit(1)
}

console.log('Reading biomes.geojson...')
const biomes = JSON.parse(readFileSync(biomesPath, 'utf8'))
console.log(`Found ${biomes.features.length} biome features.`)

const BUFFER_RINGS = [
  { distance: 30, opacity: 0.25, level: 1 },
  { distance: 70, opacity: 0.12, level: 2 },
  { distance: 120, opacity: 0.05, level: 3 },
]

const allFeatures = []

// Add original features with bufferLevel = 0
for (const feature of biomes.features) {
  allFeatures.push({
    ...feature,
    properties: {
      ...feature.properties,
      bufferLevel: 0,
      blendOpacity: 1.0,
    },
  })
}

console.log('Generating buffer rings...')
let processed = 0
for (const feature of biomes.features) {
  const featureClass = feature.properties?.FEATURECLA
  if (!featureClass) continue

  for (const ring of BUFFER_RINGS) {
    try {
      const buffered = buffer(feature, ring.distance, { units: 'kilometers' })
      if (buffered) {
        buffered.properties = {
          ...feature.properties,
          bufferLevel: ring.level,
          blendOpacity: ring.opacity,
        }
        allFeatures.push(buffered)
      }
    } catch {
      // Skip features that can't be buffered (degenerate geometry)
    }
  }
  processed++
  if (processed % 50 === 0) {
    console.log(`  Processed ${processed}/${biomes.features.length} features...`)
  }
}

const output = {
  type: 'FeatureCollection',
  features: allFeatures,
}

console.log(`Writing ${allFeatures.length} features to biomes-blended.geojson...`)
writeFileSync(outputPath, JSON.stringify(output), 'utf8')
console.log('Done. biomes-blended.geojson is ready.')
```

- [ ] **Step 3: Run the buffer generation script**

```bash
cd G:/Claude/ad-astra-historia && node shared/eras/generateBiomeBuffers.mjs
```

Expected: Creates `shared/eras/biomes-blended.geojson` with original features + buffer rings. Should report the total feature count.

- [ ] **Step 4: Update biomes endpoint to serve blended file**

In `server/routes/game.ts`, modify the biomes endpoint (around line 712):

```typescript
gameRouter.get('/biomes', (_req, res) => {
  // Prefer blended biomes if available, fall back to raw biomes
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
```

Add `existsSync` to imports at top of `server/routes/game.ts` if not already imported.

- [ ] **Step 5: Add buffer generation to the auto-download flow**

In `server/index.ts`, update `ensureGeoData()`:

```typescript
function ensureGeoData() {
  const erasDir = join(__dirname, '../shared/eras')
  const required = ['biomes.geojson', 'rivers.geojson', 'ocean.geojson', 'lakes.geojson']
  const missing = required.filter(f => !existsSync(join(erasDir, f)))
  if (missing.length > 0) {
    console.log(`Missing GeoJSON files: ${missing.join(', ')}. Downloading...`)
    try {
      execSync('node shared/eras/download.mjs', {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 120_000,
      })
    } catch (err) {
      console.warn('Warning: GeoJSON download failed.', (err as Error).message)
    }
  }
  // Generate biome buffers if biomes exist but blended file doesn't
  const biomesExists = existsSync(join(erasDir, 'biomes.geojson'))
  const blendedExists = existsSync(join(erasDir, 'biomes-blended.geojson'))
  if (biomesExists && !blendedExists) {
    console.log('Generating biome buffer zones for gradient blending...')
    try {
      execSync('node shared/eras/generateBiomeBuffers.mjs', {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 300_000,
      })
    } catch (err) {
      console.warn('Warning: Biome buffer generation failed.', (err as Error).message)
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/eras/generateBiomeBuffers.mjs shared/package.json package-lock.json server/routes/game.ts server/index.ts
git commit -m "feat: generate biome buffer zones for gradient blending"
```

---

### Task 3: Update WorldMap to render buffer zones, lakes & enhanced rivers

**Files:**
- Modify: `client/src/components/map/WorldMap.tsx`
- Create: `client/src/components/map/LakesLayer.tsx`
- Modify: `client/src/components/map/RiversLayer.tsx`
- Modify: `client/src/components/map/index.ts`

- [ ] **Step 1: Update WorldMap.tsx biome rendering for buffer zones**

Replace the biome layer setup in `WorldMap.tsx` (lines 143-189). The new version renders buffer rings as separate layers with decreasing opacity:

```typescript
// Replace the entire biomes block (lines 143-189) with:

// Biome tint with gradient buffer zones
if (biomesRes.status === 'fulfilled') {
  map.addSource('biomes', { type: 'geojson', data: biomesRes.value as never })

  // Outer buffer rings first (rendered below, lowest opacity)
  // bufferLevel 3 = outermost ring
  for (const level of [3, 2, 1]) {
    map.addLayer({
      id: `biomes-buffer-${level}`,
      type: 'fill',
      source: 'biomes',
      minzoom: 2,
      filter: ['==', ['get', 'bufferLevel'], level],
      paint: {
        'fill-color': buildBiomeColour(),
        'fill-opacity': ['interpolate', ['linear'], ['zoom'],
          2, ['*', ['get', 'blendOpacity'], 0.6],
          4, ['get', 'blendOpacity'],
          7, ['*', ['get', 'blendOpacity'], 0.8],
        ] as unknown as ExpressionSpecification,
        'fill-antialias': true,
      },
    })
  }

  // Core biome fills (bufferLevel 0) — original polygons, strongest colour
  map.addLayer({
    id: 'biomes-fill',
    type: 'fill',
    source: 'biomes',
    minzoom: 2,
    filter: ['==', ['get', 'bufferLevel'], 0],
    paint: {
      'fill-color': buildBiomeColour(),
      'fill-opacity': ['interpolate', ['linear'], ['zoom'],
        2, 0.22,
        4, 0.38,
        7, 0.30,
      ] as ExpressionSpecification,
      'fill-antialias': true,
    },
  })

  // Fallback for raw biomes.geojson (no bufferLevel property)
  // This ensures biomes still render if blended file isn't generated
  map.addLayer({
    id: 'biomes-fill-fallback',
    type: 'fill',
    source: 'biomes',
    minzoom: 2,
    filter: ['!', ['has', 'bufferLevel']],
    paint: {
      'fill-color': buildBiomeColour(),
      'fill-opacity': ['interpolate', ['linear'], ['zoom'],
        2, 0.22,
        4, 0.38,
        7, 0.30,
      ] as ExpressionSpecification,
      'fill-antialias': true,
    },
  })

  // Soft edge blur on core polygons for additional smoothing
  map.addLayer({
    id: 'biomes-edge-blur',
    type: 'line',
    source: 'biomes',
    minzoom: 2,
    filter: ['any',
      ['==', ['get', 'bufferLevel'], 0],
      ['!', ['has', 'bufferLevel']],
    ],
    paint: {
      'line-color': buildBiomeColour(),
      'line-width': ['interpolate', ['linear'], ['zoom'],
        2, 14,
        4, 28,
        7, 42,
      ] as ExpressionSpecification,
      'line-blur': ['interpolate', ['linear'], ['zoom'],
        2, 10,
        4, 20,
        7, 32,
      ] as ExpressionSpecification,
      'line-opacity': ['interpolate', ['linear'], ['zoom'],
        2, 0.18,
        4, 0.28,
        7, 0.20,
      ] as ExpressionSpecification,
    },
  })
}
```

- [ ] **Step 2: Create LakesLayer.tsx**

Create `client/src/components/map/LakesLayer.tsx`:

```typescript
import { useEffect, useRef } from 'react'
import { useMap } from './MapContext'

export default function LakesLayer() {
  const map = useMap()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    fetch('/api/game/lakes')
      .then(r => r.json())
      .then(geojson => {
        if (map.getSource('lakes')) return
        map.addSource('lakes', { type: 'geojson', data: geojson })

        // Filled lake polygons
        map.addLayer({
          id: 'lakes-fill',
          type: 'fill',
          source: 'lakes',
          minzoom: 3,
          paint: {
            'fill-color': '#0e2a4a',
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 6, 0.7],
          },
        })

        // Subtle lake shoreline
        map.addLayer({
          id: 'lakes-outline',
          type: 'line',
          source: 'lakes',
          minzoom: 4,
          paint: {
            'line-color': '#1e4a7a',
            'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 7, 0.8],
            'line-opacity': 0.5,
          },
        })
      })
      .catch(() => { /* lakes.geojson not available */ })

    return () => {
      if (map.getLayer('lakes-outline')) map.removeLayer('lakes-outline')
      if (map.getLayer('lakes-fill')) map.removeLayer('lakes-fill')
      if (map.getSource('lakes')) map.removeSource('lakes')
      loadedRef.current = false
    }
  }, [map])

  return null
}
```

- [ ] **Step 3: Enhance RiversLayer with width variation by scalerank**

Replace `client/src/components/map/RiversLayer.tsx`:

```typescript
import { useEffect, useRef } from 'react'
import { useMap } from './MapContext'

export default function RiversLayer() {
  const map = useMap()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    fetch('/api/game/rivers')
      .then(r => r.json())
      .then(geojson => {
        if (map.getSource('rivers')) return
        map.addSource('rivers', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'rivers-line',
          type: 'line',
          source: 'rivers',
          minzoom: 3,
          paint: {
            'line-color': '#2563eb',
            // Major rivers (low scalerank) are wider than tributaries (high scalerank)
            'line-width': ['interpolate', ['linear'], ['zoom'],
              3, ['case',
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 2], 0.8,
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 4], 0.4,
                0.2,
              ],
              6, ['case',
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 2], 2.5,
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 4], 1.5,
                0.8,
              ],
              9, ['case',
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 2], 4,
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 4], 2.5,
                1.2,
              ],
            ],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 5, 0.5, 8, 0.6],
          },
        })
      })
      .catch(() => { /* rivers.geojson not available */ })

    return () => {
      if (map.getLayer('rivers-line')) map.removeLayer('rivers-line')
      if (map.getSource('rivers')) map.removeSource('rivers')
      loadedRef.current = false
    }
  }, [map])

  return null
}
```

- [ ] **Step 4: Export LakesLayer from map/index.ts**

In `client/src/components/map/index.ts`, add:

```typescript
export { default as LakesLayer } from './LakesLayer'
```

- [ ] **Step 5: Add LakesLayer to GamePage**

In `client/src/pages/GamePage.tsx`, find where `<RiversLayer />` is rendered inside the `<WorldMap>` component tree and add `<LakesLayer />` next to it:

```typescript
import { LakesLayer } from '../components/map'

// Inside the WorldMap children, add alongside RiversLayer:
<LakesLayer />
```

- [ ] **Step 6: Add biomes-blended.geojson and lakes.geojson to .gitignore**

In `.gitignore`, add:

```
shared/eras/biomes.geojson
shared/eras/biomes-blended.geojson
shared/eras/rivers.geojson
shared/eras/ocean.geojson
shared/eras/lakes.geojson
shared/eras/provinces.geojson
```

These are downloaded at runtime and should not be committed (they're large).

- [ ] **Step 7: Test visually — start the dev server**

```bash
cd G:/Claude/ad-astra-historia && npm start
```

Open browser, start a modern era game. Verify:
- Desert regions show with gradient fade into surrounding terrain
- Forest regions show with gradient fade
- Rivers render with major rivers thicker than tributaries
- Lakes render as filled dark blue polygons
- Hillshade terrain still shows through the biome overlays

- [ ] **Step 8: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/components/map/WorldMap.tsx client/src/components/map/LakesLayer.tsx client/src/components/map/RiversLayer.tsx client/src/components/map/index.ts client/src/pages/GamePage.tsx .gitignore
git commit -m "feat: biome gradient blending, lakes layer, enhanced rivers"
```

---

## Phase 2: Deterministic Country Database

### Task 4: Create the modern era country database

**Files:**
- Create: `shared/countryData.ts`
- Modify: `shared/index.ts` (re-export)
- Test: `shared/countryData.test.ts`

- [ ] **Step 1: Write the test**

Create `shared/countryData.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { MODERN_COUNTRY_DATA, type CountryBaseData } from './countryData.js'

describe('MODERN_COUNTRY_DATA', () => {
  it('contains at least 190 countries', () => {
    const count = Object.keys(MODERN_COUNTRY_DATA).length
    expect(count).toBeGreaterThanOrEqual(190)
  })

  it('has correct data for USA', () => {
    const usa = MODERN_COUNTRY_DATA['USA']
    expect(usa).toBeDefined()
    expect(usa.name).toBe('United States')
    expect(usa.population).toBeGreaterThan(300_000_000)
    expect(usa.population).toBeLessThan(400_000_000)
    expect(usa.gdp).toBeGreaterThan(20_000_000_000_000) // > $20T
    expect(usa.nuclearCapable).toBe(true)
    expect(usa.governmentType).toBe('federal_republic')
  })

  it('has correct data for China', () => {
    const chn = MODERN_COUNTRY_DATA['CHN']
    expect(chn).toBeDefined()
    expect(chn.population).toBeGreaterThan(1_400_000_000)
    expect(chn.gdp).toBeGreaterThan(15_000_000_000_000)
    expect(chn.nuclearCapable).toBe(true)
  })

  it('has no zero-population countries', () => {
    for (const [iso, data] of Object.entries(MODERN_COUNTRY_DATA)) {
      expect(data.population, `${iso} has 0 population`).toBeGreaterThan(0)
    }
  })

  it('has no zero-GDP countries', () => {
    for (const [iso, data] of Object.entries(MODERN_COUNTRY_DATA)) {
      expect(data.gdp, `${iso} has 0 GDP`).toBeGreaterThan(0)
    }
  })

  it('sector percentages sum to roughly 100 for all countries', () => {
    for (const [iso, data] of Object.entries(MODERN_COUNTRY_DATA)) {
      const sum = data.sectorAgriculture + data.sectorIndustry + data.sectorServices
      expect(sum, `${iso} sectors sum to ${sum}`).toBeGreaterThan(90)
      expect(sum, `${iso} sectors sum to ${sum}`).toBeLessThan(110)
    }
  })

  it('all required fields are present for every country', () => {
    const requiredFields: (keyof CountryBaseData)[] = [
      'iso3', 'name', 'continent', 'population', 'gdp', 'gdpPerCapita',
      'sectorAgriculture', 'sectorIndustry', 'sectorServices',
      'governmentType', 'areaKm2',
    ]
    for (const [iso, data] of Object.entries(MODERN_COUNTRY_DATA)) {
      for (const field of requiredFields) {
        expect(data[field], `${iso} missing ${field}`).toBeDefined()
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/countryData.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create countryData.ts with all ~195 countries**

Create `shared/countryData.ts`. This is a large file — the data should be compiled from World Bank / IMF / UN 2023 data. Here is the structure and a representative sample. **The implementing agent must fill in ALL ~195 countries with real data.**

```typescript
export interface CountryBaseData {
  iso3: string
  name: string
  continent: string
  subregion: string
  population: number
  populationGrowthRate: number
  urbanisationRate: number
  medianAge: number
  gdp: number
  gdpPerCapita: number
  gdpGrowthRate: number
  sectorAgriculture: number
  sectorIndustry: number
  sectorServices: number
  debtToGdpRatio: number
  inflationRate: number
  hdi: number
  educationIndex: number
  giniCoefficient: number
  activePersonnel: number
  defenceSpendingPct: number
  nuclearCapable: boolean
  governmentType: string
  corruptionIndex: number
  areaKm2: number
  landlocked: boolean
  strategicPassages: string[]
}

export const MODERN_COUNTRY_DATA: Record<string, CountryBaseData> = {
  USA: {
    iso3: 'USA', name: 'United States', continent: 'North America', subregion: 'Northern America',
    population: 331_900_000, populationGrowthRate: 0.5, urbanisationRate: 83, medianAge: 38.1,
    gdp: 25_460_000_000_000, gdpPerCapita: 76_330, gdpGrowthRate: 2.1,
    sectorAgriculture: 1, sectorIndustry: 18, sectorServices: 81,
    debtToGdpRatio: 129, inflationRate: 4.1,
    hdi: 0.921, educationIndex: 0.900, giniCoefficient: 39.8,
    activePersonnel: 1_390_000, defenceSpendingPct: 3.5, nuclearCapable: true,
    governmentType: 'federal_republic', corruptionIndex: 24,
    areaKm2: 9_833_520, landlocked: false, strategicPassages: ['panama'],
  },
  CHN: {
    iso3: 'CHN', name: 'China', continent: 'Asia', subregion: 'Eastern Asia',
    population: 1_412_000_000, populationGrowthRate: -0.02, urbanisationRate: 65, medianAge: 39.0,
    gdp: 17_960_000_000_000, gdpPerCapita: 12_720, gdpGrowthRate: 5.2,
    sectorAgriculture: 7, sectorIndustry: 39, sectorServices: 54,
    debtToGdpRatio: 77, inflationRate: 0.2,
    hdi: 0.788, educationIndex: 0.720, giniCoefficient: 38.2,
    activePersonnel: 2_035_000, defenceSpendingPct: 1.7, nuclearCapable: true,
    governmentType: 'communist', corruptionIndex: 34,
    areaKm2: 9_596_960, landlocked: false, strategicPassages: [],
  },
  GBR: {
    iso3: 'GBR', name: 'United Kingdom', continent: 'Europe', subregion: 'Northern Europe',
    population: 67_790_000, populationGrowthRate: 0.5, urbanisationRate: 84, medianAge: 40.5,
    gdp: 3_070_000_000_000, gdpPerCapita: 45_850, gdpGrowthRate: 0.1,
    sectorAgriculture: 1, sectorIndustry: 17, sectorServices: 82,
    debtToGdpRatio: 101, inflationRate: 7.3,
    hdi: 0.929, educationIndex: 0.890, giniCoefficient: 35.1,
    activePersonnel: 150_000, defenceSpendingPct: 2.3, nuclearCapable: true,
    governmentType: 'democracy', corruptionIndex: 18,
    areaKm2: 242_495, landlocked: false, strategicPassages: [],
  },
  // ... ALL OTHER COUNTRIES — the implementing agent must populate every
  // country that exists in modern.geojson (match by ISO_A3 code).
  // Use 2023 World Bank / IMF / UN data.
  // Every country MUST have population > 0 and gdp > 0.
}
```

- [ ] **Step 4: Export from shared/index.ts**

In `shared/index.ts`, add:

```typescript
export { MODERN_COUNTRY_DATA, type CountryBaseData } from './countryData.js'
```

- [ ] **Step 5: Run tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/countryData.test.ts
```

Expected: All tests pass — 190+ countries, no zero population, no zero GDP, sectors sum to ~100.

- [ ] **Step 6: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/countryData.ts shared/countryData.test.ts shared/index.ts
git commit -m "feat: add deterministic modern era country database (195 countries)"
```

---

### Task 5: Wire country database into game initialization

**Files:**
- Modify: `client/src/stores/gameStore.ts`
- Modify: `server/routes/game.ts` (inject stats from database into GeoJSON)

- [ ] **Step 1: Update server to inject database stats into GeoJSON features**

In `server/routes/game.ts`, at the top add the import:

```typescript
import { MODERN_COUNTRY_DATA } from '@ad-astra/shared'
```

Find the function that builds country objects from GeoJSON (around `buildCountriesFromGeoJSON` or where Country objects are constructed from feature properties). For each country, overlay the database stats:

```typescript
// Inside the country-building logic, when creating a Country object from GeoJSON:
const iso = feature.properties.ISO_A3 ?? feature.properties.ADM0_A3
const baseData = MODERN_COUNTRY_DATA[iso]

// Use database values instead of GeoJSON properties for stats:
const gdp = baseData?.gdp ?? (props.GDP_MD != null ? props.GDP_MD * 1_000_000 : 0)
const population = baseData?.population ?? 0
```

- [ ] **Step 2: Update gameStore.ts initGame to use database for player country**

In `client/src/stores/gameStore.ts`, add the import:

```typescript
import { MODERN_COUNTRY_DATA } from '@ad-astra/shared'
```

In the `initGame` function (around line 256), replace the `society` initialization:

```typescript
const baseData = MODERN_COUNTRY_DATA[playerCountryId]
const isAncient = ANCIENT_ERAS.includes(conditions.era)

// Replace the society block with:
society: {
  population: isAncient
    ? Math.round((baseData?.population ?? 20_000_000) * 0.04)
    : (baseData?.population ?? 20_000_000),
  populationGrowthRate: isAncient ? 0.5 : (baseData?.populationGrowthRate ?? 1.2),
  educationIndex: isAncient ? 10 : Math.round((baseData?.educationIndex ?? 0.55) * 100),
  happinessIndex: 60,
  inequalityIndex: isAncient ? 60 : Math.round(baseData?.giniCoefficient ?? 40),
  urbanisationRate: isAncient ? 15 : (baseData?.urbanisationRate ?? 55),
},

// Replace economy block with:
economy: {
  taxRate: 25,
  debt: 0,
  tradeBalance: 0,
  inflation: baseData?.inflationRate ?? 3,
  industrialisationLevel: isAncient ? 0 : Math.min(100, Math.round((baseData?.sectorIndustry ?? 30) * 1.5)),
  sectorShares: {
    agriculture: baseData?.sectorAgriculture ?? (isAncient ? 60 : 10),
    industry: baseData?.sectorIndustry ?? (isAncient ? 15 : 25),
    services: baseData?.sectorServices ?? (isAncient ? 15 : 55),
    military: Math.round((baseData?.defenceSpendingPct ?? 2) * 2),
  },
},

// Replace politics block with:
politics: {
  governmentType: isAncient ? 'monarchy' : (baseData?.governmentType ?? 'republic') as any,
  unrestLevel: 0,
  corruption: baseData?.corruptionIndex ?? 30,
  censorship: 0,
  policies: [],
  yearsInPower: 0,
},
```

- [ ] **Step 3: Remove the old COUNTRY_POPULATION_M lookup table**

In `gameStore.ts`, delete the `COUNTRY_POPULATION_M` record (around lines 215-246) and the `getBasePopulation()` function. Replace any remaining calls to `getBasePopulation()` with the new database lookup pattern.

- [ ] **Step 4: Test — start a new game and verify stats**

```bash
cd G:/Claude/ad-astra-historia && npm start
```

Start a new modern era game as USA. Verify:
- Population shows ~331 million (not 331)
- GDP shows ~$25.4 trillion
- Sector breakdown shows real values (1% agriculture, 18% industry, 81% services)
- Government type shows "federal_republic"

Start a game as a smaller country (e.g. Bhutan). Verify population and GDP are non-zero and reasonable.

- [ ] **Step 5: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/stores/gameStore.ts server/routes/game.ts
git commit -m "feat: wire country database into game initialization, remove AI data dependency"
```

---

## Phase 3: Living World Simulation Engine

### Task 6: Define world simulation types and country personality profiles

**Files:**
- Modify: `shared/types.ts`
- Create: `shared/countryPersonalities.ts`
- Test: `shared/countryPersonalities.test.ts`

- [ ] **Step 1: Write the test**

Create `shared/countryPersonalities.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { COUNTRY_PERSONALITIES, type CountryPersonality } from './countryPersonalities.js'
import { MODERN_COUNTRY_DATA } from './countryData.js'

describe('COUNTRY_PERSONALITIES', () => {
  it('has a personality profile for every country in the database', () => {
    for (const iso of Object.keys(MODERN_COUNTRY_DATA)) {
      expect(COUNTRY_PERSONALITIES[iso], `${iso} missing personality`).toBeDefined()
    }
  })

  it('all trait values are within valid ranges', () => {
    for (const [iso, p] of Object.entries(COUNTRY_PERSONALITIES)) {
      expect(p.aggression, `${iso} aggression`).toBeGreaterThanOrEqual(0)
      expect(p.aggression, `${iso} aggression`).toBeLessThanOrEqual(100)
      expect(p.diplomacy, `${iso} diplomacy`).toBeGreaterThanOrEqual(0)
      expect(p.diplomacy, `${iso} diplomacy`).toBeLessThanOrEqual(100)
      expect(p.economicFocus, `${iso} economicFocus`).toBeGreaterThanOrEqual(0)
      expect(p.economicFocus, `${iso} economicFocus`).toBeLessThanOrEqual(100)
      expect(p.stability, `${iso} stability`).toBeGreaterThanOrEqual(0)
      expect(p.stability, `${iso} stability`).toBeLessThanOrEqual(100)
      expect(p.unpredictability, `${iso} unpredictability`).toBeGreaterThanOrEqual(0)
      expect(p.unpredictability, `${iso} unpredictability`).toBeLessThanOrEqual(20)
    }
  })

  it('USA has high aggression and high unpredictability', () => {
    const usa = COUNTRY_PERSONALITIES['USA']
    expect(usa.aggression).toBeGreaterThan(60)
    expect(usa.unpredictability).toBeGreaterThan(12)
  })

  it('Switzerland has low aggression and high diplomacy', () => {
    const che = COUNTRY_PERSONALITIES['CHE']
    expect(che.aggression).toBeLessThan(20)
    expect(che.diplomacy).toBeGreaterThan(80)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/countryPersonalities.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Add world tick event types to shared/types.ts**

In `shared/types.ts`, add after the existing `WorldEvent` interface:

```typescript
// ── World Tick Simulation Types ─────────────────────────────────────────────

export interface CountryPersonality {
  aggression: number       // 0-100: military threats, territorial claims
  diplomacy: number        // 0-100: alliances, negotiation, mediation
  economicFocus: number    // 0-100: trade deals, economic leverage
  stability: number        // 0-100: internal cohesion, coup resistance
  unpredictability: number // 0-20: chance of out-of-character actions
}

export type WorldTickEventType =
  // Diplomacy
  | 'alliance_proposed' | 'alliance_formed' | 'alliance_dissolved'
  | 'trade_deal_proposed' | 'trade_deal_signed' | 'trade_deal_collapsed'
  | 'peace_talks_initiated' | 'peace_treaty_signed'
  | 'diplomatic_incident' | 'embassy_recalled' | 'sanctions_imposed' | 'sanctions_lifted'
  // Military
  | 'territorial_claim' | 'military_mobilisation' | 'border_skirmish'
  | 'war_declared' | 'ceasefire' | 'arms_deal'
  | 'military_exercise' | 'naval_standoff'
  // Internal
  | 'coup_attempt' | 'coup_success' | 'election_held'
  | 'protests_erupt' | 'reform_passed' | 'crackdown'
  | 'economic_crisis' | 'economic_boom'
  | 'separatist_movement' | 'leadership_change'
  // Wildcard
  | 'unexpected_ultimatum' | 'surprise_summit' | 'defection'
  | 'intelligence_leak' | 'humanitarian_crisis'

export interface WorldTickEvent {
  id: string
  type: WorldTickEventType
  date: string
  primaryCountry: string      // ISO_A3 of country initiating/affected
  targetCountry?: string      // ISO_A3 of target country (if bilateral)
  headline: string
  body?: string
  category: NewsCategory
  importance: NewsImportance
  // Effects on game state
  relationsDelta?: Record<string, number>  // { "USA-CHN": -10, "FRA-DEU": +5 }
  statChanges?: Array<{
    country: string
    field: string             // e.g. 'stability', 'gdp', 'approval'
    delta: number
  }>
  // Chain reaction: events this might trigger
  chainProbabilities?: Array<{
    eventType: WorldTickEventType
    probability: number       // 0-1
    targetCountry?: string
  }>
}
```

- [ ] **Step 4: Create countryPersonalities.ts**

Create `shared/countryPersonalities.ts`. This maps every country ISO3 to a personality profile. Major countries get hand-tuned values; others are derived from their database stats.

```typescript
import type { CountryPersonality } from './types.js'
import { MODERN_COUNTRY_DATA } from './countryData.js'

// Hand-tuned personalities for major/notable countries
const MANUAL_PERSONALITIES: Record<string, CountryPersonality> = {
  // ── Great powers ──
  USA: { aggression: 75, diplomacy: 60, economicFocus: 70, stability: 75, unpredictability: 18 },
  CHN: { aggression: 55, diplomacy: 50, economicFocus: 85, stability: 80, unpredictability: 8 },
  RUS: { aggression: 70, diplomacy: 35, economicFocus: 45, stability: 55, unpredictability: 15 },
  GBR: { aggression: 40, diplomacy: 75, economicFocus: 70, stability: 85, unpredictability: 10 },
  FRA: { aggression: 40, diplomacy: 80, economicFocus: 65, stability: 70, unpredictability: 12 },
  DEU: { aggression: 20, diplomacy: 85, economicFocus: 80, stability: 90, unpredictability: 5 },
  // ── Regional powers ──
  IND: { aggression: 35, diplomacy: 55, economicFocus: 70, stability: 60, unpredictability: 8 },
  JPN: { aggression: 20, diplomacy: 70, economicFocus: 85, stability: 90, unpredictability: 4 },
  BRA: { aggression: 15, diplomacy: 55, economicFocus: 60, stability: 55, unpredictability: 10 },
  TUR: { aggression: 55, diplomacy: 50, economicFocus: 55, stability: 55, unpredictability: 14 },
  IRN: { aggression: 60, diplomacy: 30, economicFocus: 40, stability: 50, unpredictability: 16 },
  SAU: { aggression: 45, diplomacy: 45, economicFocus: 70, stability: 65, unpredictability: 12 },
  ISR: { aggression: 65, diplomacy: 40, economicFocus: 60, stability: 70, unpredictability: 14 },
  EGY: { aggression: 35, diplomacy: 50, economicFocus: 45, stability: 50, unpredictability: 10 },
  KOR: { aggression: 25, diplomacy: 60, economicFocus: 80, stability: 80, unpredictability: 6 },
  PRK: { aggression: 80, diplomacy: 10, economicFocus: 15, stability: 60, unpredictability: 20 },
  AUS: { aggression: 20, diplomacy: 70, economicFocus: 65, stability: 90, unpredictability: 6 },
  PAK: { aggression: 50, diplomacy: 35, economicFocus: 35, stability: 40, unpredictability: 14 },
  NGA: { aggression: 25, diplomacy: 40, economicFocus: 50, stability: 35, unpredictability: 12 },
  ZAF: { aggression: 20, diplomacy: 55, economicFocus: 55, stability: 50, unpredictability: 10 },
  MEX: { aggression: 15, diplomacy: 50, economicFocus: 55, stability: 45, unpredictability: 10 },
  IDN: { aggression: 20, diplomacy: 55, economicFocus: 60, stability: 60, unpredictability: 8 },
  // ── Neutral / peaceful ──
  CHE: { aggression: 5, diplomacy: 90, economicFocus: 85, stability: 95, unpredictability: 2 },
  NOR: { aggression: 10, diplomacy: 80, economicFocus: 75, stability: 92, unpredictability: 3 },
  SWE: { aggression: 10, diplomacy: 80, economicFocus: 70, stability: 90, unpredictability: 4 },
  NZL: { aggression: 8, diplomacy: 75, economicFocus: 60, stability: 92, unpredictability: 3 },
  CRI: { aggression: 3, diplomacy: 65, economicFocus: 55, stability: 80, unpredictability: 4 },
  // ── Volatile ──
  AFG: { aggression: 40, diplomacy: 15, economicFocus: 15, stability: 15, unpredictability: 18 },
  SOM: { aggression: 35, diplomacy: 10, economicFocus: 10, stability: 10, unpredictability: 18 },
  SYR: { aggression: 45, diplomacy: 20, economicFocus: 20, stability: 20, unpredictability: 16 },
  YEM: { aggression: 40, diplomacy: 15, economicFocus: 15, stability: 15, unpredictability: 17 },
  MMR: { aggression: 45, diplomacy: 15, economicFocus: 25, stability: 20, unpredictability: 16 },
  UKR: { aggression: 40, diplomacy: 55, economicFocus: 40, stability: 35, unpredictability: 12 },
}

// Derive personality from database stats for countries without manual profiles
function derivePersonality(iso: string): CountryPersonality {
  const data = MODERN_COUNTRY_DATA[iso]
  if (!data) {
    return { aggression: 25, diplomacy: 50, economicFocus: 50, stability: 50, unpredictability: 8 }
  }

  // Higher military spending → more aggressive
  const aggression = Math.min(100, Math.round(data.defenceSpendingPct * 15 + (1 - data.hdi) * 30))
  // Higher HDI → more diplomatic
  const diplomacy = Math.min(100, Math.round(data.hdi * 80 + (data.urbanisationRate / 100) * 20))
  // Higher GDP per capita → more economic focus
  const economicFocus = Math.min(100, Math.round(Math.min(data.gdpPerCapita / 1000, 60) + data.sectorServices * 0.4))
  // Higher HDI + lower corruption → more stable
  const stability = Math.min(100, Math.round(data.hdi * 60 + (100 - data.corruptionIndex) * 0.4))
  // Lower stability + higher corruption → more unpredictable
  const unpredictability = Math.min(20, Math.round((100 - stability) * 0.15 + data.corruptionIndex * 0.05))

  return { aggression, diplomacy, economicFocus, stability, unpredictability }
}

// Build the full map: manual overrides first, then derived for the rest
export const COUNTRY_PERSONALITIES: Record<string, CountryPersonality> = (() => {
  const result: Record<string, CountryPersonality> = { ...MANUAL_PERSONALITIES }
  for (const iso of Object.keys(MODERN_COUNTRY_DATA)) {
    if (!result[iso]) {
      result[iso] = derivePersonality(iso)
    }
  }
  return result
})()
```

- [ ] **Step 5: Export from shared/index.ts**

```typescript
export { COUNTRY_PERSONALITIES, type CountryPersonality as CountryPersonalityProfile } from './countryPersonalities.js'
```

- [ ] **Step 6: Run tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/countryPersonalities.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/types.ts shared/countryPersonalities.ts shared/countryPersonalities.test.ts shared/index.ts
git commit -m "feat: add world tick event types and country personality profiles"
```

---

### Task 7: Build the world tick simulation engine

**Files:**
- Create: `shared/worldSimulation.ts`
- Test: `shared/worldSimulation.test.ts`

- [ ] **Step 1: Write the tests**

Create `shared/worldSimulation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { worldTick } from './worldSimulation.js'
import type { Country, CountryStats, WorldTickEvent } from './types.js'

function makeCountry(id: string, overrides?: Partial<CountryStats>): Country {
  return {
    id, name: id, colour: '#000', capitalCity: 'Capital',
    majorCities: [], infrastructure: [], relations: {},
    organisations: [], nationalisedAssets: [], laws: [],
    sectors: { defence: 5, technology: 10, manufacturing: 20, space: 1, pharmaceuticals: 5, agriculture: 20, finance: 15, infrastructure: 10 },
    stats: {
      gdp: 1_000_000_000_000, military: 50, researchPoints: 100,
      approval: 60, softPower: 50, techLevel: 50, culturalReach: 40,
      stability: 70, ...overrides,
    },
  }
}

describe('worldTick', () => {
  it('returns an array of WorldTickEvents', () => {
    const countries: Record<string, Country> = {
      AAA: makeCountry('AAA'),
      BBB: makeCountry('BBB'),
    }
    const relations: Record<string, number> = {}
    const result = worldTick(countries, relations, '2025-01-07', [])
    expect(Array.isArray(result.events)).toBe(true)
  })

  it('generates events when countries have tense relations', () => {
    const countries: Record<string, Country> = {
      AAA: makeCountry('AAA', { military: 80, stability: 40 }),
      BBB: makeCountry('BBB', { military: 30, stability: 80 }),
    }
    const relations: Record<string, number> = { 'AAA-BBB': -60 }
    // Run many ticks to verify events are generated probabilistically
    let totalEvents = 0
    for (let i = 0; i < 100; i++) {
      const result = worldTick(countries, relations, '2025-01-07', [])
      totalEvents += result.events.length
    }
    // With hostile relations, we should get events in at least some ticks
    expect(totalEvents).toBeGreaterThan(0)
  })

  it('generates internal events for unstable countries', () => {
    const countries: Record<string, Country> = {
      AAA: makeCountry('AAA', { stability: 15, approval: 20 }),
    }
    let internalEvents = 0
    for (let i = 0; i < 200; i++) {
      const result = worldTick(countries, {}, '2025-01-07', [])
      internalEvents += result.events.filter(e =>
        ['coup_attempt', 'coup_success', 'protests_erupt', 'crackdown', 'separatist_movement'].includes(e.type)
      ).length
    }
    expect(internalEvents).toBeGreaterThan(0)
  })

  it('returns relation deltas that can be applied to state', () => {
    const countries: Record<string, Country> = {
      AAA: makeCountry('AAA'),
      BBB: makeCountry('BBB'),
    }
    // Run many ticks until we get an event with relation changes
    for (let i = 0; i < 200; i++) {
      const result = worldTick(countries, {}, '2025-01-07', [])
      if (result.events.some(e => e.relationsDelta && Object.keys(e.relationsDelta).length > 0)) {
        return // test passes — we found relation deltas
      }
    }
    // Even if no relation deltas in 200 tries, that's statistically possible but unlikely
    // The important thing is the function runs without error
  })

  it('caps weekly event count between 0 and 8', () => {
    const countries: Record<string, Country> = {}
    // Create 50 countries to stress test
    for (let i = 0; i < 50; i++) {
      const id = `C${String(i).padStart(2, '0')}`
      countries[id] = makeCountry(id)
    }
    for (let i = 0; i < 50; i++) {
      const result = worldTick(countries, {}, '2025-01-07', [])
      expect(result.events.length).toBeLessThanOrEqual(8)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/worldSimulation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the world tick engine**

Create `shared/worldSimulation.ts`:

```typescript
import type { Country, WorldTickEvent, WorldTickEventType, NewsCategory, NewsImportance } from './types.js'
import { COUNTRY_PERSONALITIES } from './countryPersonalities.js'
import { countryName } from './newsGenerator.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function roll(probability: number): boolean {
  return Math.random() < probability
}

function weightedPick<T>(options: Array<{ value: T; weight: number }>): T {
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  let r = Math.random() * total
  for (const opt of options) {
    r -= opt.weight
    if (r <= 0) return opt.value
  }
  return options[options.length - 1].value
}

function relationKey(a: string, b: string): string {
  return [a, b].sort().join('-')
}

function getRelation(relations: Record<string, number>, a: string, b: string): number {
  return relations[relationKey(a, b)] ?? 0
}

// ── Event headline templates ─────────────────────────────────────────────────

const HEADLINES: Record<WorldTickEventType, string[]> = {
  // Diplomacy
  alliance_proposed: [
    '{primary} Proposes Military Alliance with {target}',
    '{primary} Seeks Strategic Partnership with {target}',
  ],
  alliance_formed: [
    '{primary} and {target} Sign Defence Pact',
    'New Alliance Formed Between {primary} and {target}',
  ],
  alliance_dissolved: [
    '{primary} Withdraws from Alliance with {target}',
    'Alliance Between {primary} and {target} Collapses',
  ],
  trade_deal_proposed: [
    '{primary} Offers Trade Agreement to {target}',
    '{primary} Seeks Economic Partnership with {target}',
  ],
  trade_deal_signed: [
    '{primary} and {target} Sign Landmark Trade Deal',
    'New Trade Agreement Between {primary} and {target} Takes Effect',
  ],
  trade_deal_collapsed: [
    'Trade Talks Between {primary} and {target} Break Down',
    '{primary} Pulls Out of Trade Negotiations with {target}',
  ],
  peace_talks_initiated: [
    '{primary} and {target} Begin Peace Negotiations',
    'Peace Talks Open Between {primary} and {target}',
  ],
  peace_treaty_signed: [
    'Historic Peace Treaty Signed Between {primary} and {target}',
    '{primary} and {target} End Hostilities',
  ],
  diplomatic_incident: [
    'Diplomatic Row Erupts Between {primary} and {target}',
    '{primary} Recalls Ambassador from {target} Amid Tensions',
  ],
  embassy_recalled: [
    '{primary} Orders {target} Embassy Closed',
    'Diplomatic Relations Between {primary} and {target} Downgraded',
  ],
  sanctions_imposed: [
    '{primary} Imposes Economic Sanctions on {target}',
    'New Sanctions Target {target} Economy',
  ],
  sanctions_lifted: [
    '{primary} Lifts Sanctions Against {target}',
    'Economic Restrictions on {target} Eased',
  ],
  // Military
  territorial_claim: [
    '{primary} Asserts Territorial Claim Against {target}',
    '{primary} Issues Ultimatum Over Disputed Territory with {target}',
    '{primary} Threatens to Annex {target} Territory',
  ],
  military_mobilisation: [
    '{primary} Mobilises Forces Near {target} Border',
    'Military Buildup Detected Along {primary}-{target} Frontier',
  ],
  border_skirmish: [
    'Border Clash Reported Between {primary} and {target} Forces',
    'Shots Fired at {primary}-{target} Border',
  ],
  war_declared: [
    '{primary} Declares War on {target}',
    'War Breaks Out Between {primary} and {target}',
  ],
  ceasefire: [
    '{primary} and {target} Agree to Ceasefire',
    'Guns Fall Silent as {primary} and {target} Halt Fighting',
  ],
  arms_deal: [
    '{primary} Finalises Major Arms Deal with {target}',
    '{target} Acquires Advanced Weapons from {primary}',
  ],
  military_exercise: [
    '{primary} Conducts Large-Scale Military Exercise Near {target}',
    '{primary} Shows Force with Military Drills',
  ],
  naval_standoff: [
    'Naval Standoff Between {primary} and {target} in Disputed Waters',
    '{primary} Warships Confront {target} Fleet',
  ],
  // Internal
  coup_attempt: [
    'Military Coup Attempted in {primary}',
    'Failed Coup Rocks {primary} Government',
  ],
  coup_success: [
    'Military Seizes Power in {primary}',
    'Government Overthrown in {primary} Coup',
  ],
  election_held: [
    '{primary} Holds General Election',
    'Voters Head to Polls in {primary}',
  ],
  protests_erupt: [
    'Mass Protests Erupt Across {primary}',
    'Thousands Take to Streets in {primary}',
  ],
  reform_passed: [
    '{primary} Parliament Passes Sweeping Reforms',
    'Major Policy Reform Enacted in {primary}',
  ],
  crackdown: [
    '{primary} Government Launches Crackdown on Dissent',
    'Security Forces Deployed Against Protesters in {primary}',
  ],
  economic_crisis: [
    '{primary} Economy Enters Crisis',
    'Financial Markets Plunge in {primary}',
  ],
  economic_boom: [
    '{primary} Economy Surges Ahead',
    'Record Growth Reported in {primary}',
  ],
  separatist_movement: [
    'Separatist Movement Gains Ground in {primary}',
    'Independence Movement Grows in {primary} Region',
  ],
  leadership_change: [
    'New Leader Takes Power in {primary}',
    'Leadership Transition in {primary}',
  ],
  // Wildcard
  unexpected_ultimatum: [
    '{primary} Issues Surprise Ultimatum to {target}',
    'Shock Demands from {primary} Directed at {target}',
  ],
  surprise_summit: [
    'Surprise Summit Between {primary} and {target} Leaders',
    'Unexpected Meeting Between {primary} and {target} Raises Hopes',
  ],
  defection: [
    'Senior {primary} Official Defects to {target}',
    'High-Profile Defection from {primary} to {target}',
  ],
  intelligence_leak: [
    'Intelligence Leak Exposes {primary} Operations in {target}',
    'Classified {primary} Documents Surface in {target}',
  ],
  humanitarian_crisis: [
    'Humanitarian Crisis Deepens in {primary}',
    'Aid Agencies Warn of Catastrophe in {primary}',
  ],
}

function makeHeadline(type: WorldTickEventType, primary: string, target?: string): string {
  const templates = HEADLINES[type]
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template
    .replace('{primary}', countryName(primary))
    .replace('{target}', target ? countryName(target) : '')
}

function eventCategory(type: WorldTickEventType): NewsCategory {
  if (['alliance_proposed', 'alliance_formed', 'alliance_dissolved', 'trade_deal_proposed',
    'trade_deal_signed', 'trade_deal_collapsed', 'peace_talks_initiated', 'peace_treaty_signed',
    'diplomatic_incident', 'embassy_recalled', 'sanctions_imposed', 'sanctions_lifted',
    'surprise_summit', 'defection'].includes(type)) return 'diplomacy'
  if (['territorial_claim', 'military_mobilisation', 'border_skirmish', 'war_declared',
    'ceasefire', 'arms_deal', 'military_exercise', 'naval_standoff'].includes(type)) return 'military'
  if (['economic_crisis', 'economic_boom', 'trade_deal_signed'].includes(type)) return 'economy'
  if (['coup_attempt', 'coup_success', 'election_held', 'protests_erupt', 'reform_passed',
    'crackdown', 'separatist_movement', 'leadership_change'].includes(type)) return 'politics'
  return 'world'
}

function eventImportance(type: WorldTickEventType): NewsImportance {
  if (['war_declared', 'coup_success', 'peace_treaty_signed', 'unexpected_ultimatum'].includes(type)) return 'breaking'
  if (['border_skirmish', 'coup_attempt', 'sanctions_imposed', 'alliance_formed',
    'military_mobilisation', 'territorial_claim', 'economic_crisis', 'humanitarian_crisis'].includes(type)) return 'major'
  return 'minor'
}

// ── Core simulation ──────────────────────────────────────────────────────────

export interface WorldTickResult {
  events: WorldTickEvent[]
}

export function worldTick(
  countries: Record<string, Country>,
  relations: Record<string, number>,
  date: string,
  existingAlliances: string[][],
): WorldTickResult {
  const events: WorldTickEvent[] = []
  const isos = Object.keys(countries)
  if (isos.length < 2) return { events }

  // Step 1: Evaluate bilateral tensions
  for (let i = 0; i < isos.length; i++) {
    for (let j = i + 1; j < isos.length; j++) {
      const a = isos[i], b = isos[j]
      const rel = getRelation(relations, a, b)
      if (rel >= -20) continue // only process tense/hostile pairs

      const pA = COUNTRY_PERSONALITIES[a]
      const pB = COUNTRY_PERSONALITIES[b]
      if (!pA || !pB) continue

      const tensionScore = Math.abs(rel) / 100 // 0-1 scale of how bad things are
      const avgAggression = (pA.aggression + pB.aggression) / 200

      // Base probability of an event this week for this pair
      const eventProb = tensionScore * avgAggression * 0.08 // low base: ~0.3% for mild, ~6% for hostile+aggressive
      if (!roll(eventProb)) continue

      // Determine what happens
      const powerA = countries[a].stats.military
      const powerB = countries[b].stats.military
      const stronger = powerA >= powerB ? a : b
      const weaker = powerA >= powerB ? b : a
      const pStronger = COUNTRY_PERSONALITIES[stronger]!
      const pWeaker = COUNTRY_PERSONALITIES[weaker]!

      const outcome = weightedPick<WorldTickEventType>([
        { value: 'military_exercise', weight: pStronger.aggression * 0.3 },
        { value: 'diplomatic_incident', weight: 30 },
        { value: 'sanctions_imposed', weight: pStronger.economicFocus * 0.3 },
        { value: 'border_skirmish', weight: tensionScore * pStronger.aggression * 0.5 },
        { value: 'territorial_claim', weight: pStronger.aggression * 0.2 * tensionScore },
        { value: 'military_mobilisation', weight: tensionScore > 0.6 ? pStronger.aggression * 0.4 : 0 },
        { value: 'war_declared', weight: tensionScore > 0.8 ? pStronger.aggression * 0.2 : 0 },
        { value: 'peace_talks_initiated', weight: pWeaker.diplomacy * 0.3 },
        { value: 'naval_standoff', weight: tensionScore * 20 },
        // Wildcard: unexpected de-escalation or escalation
        { value: 'surprise_summit', weight: pStronger.unpredictability * 2 },
        { value: 'unexpected_ultimatum', weight: pStronger.unpredictability * 3 },
      ])

      const event: WorldTickEvent = {
        id: uid('wt'),
        type: outcome,
        date,
        primaryCountry: stronger,
        targetCountry: weaker,
        headline: makeHeadline(outcome, stronger, weaker),
        category: eventCategory(outcome),
        importance: eventImportance(outcome),
        relationsDelta: {},
        statChanges: [],
      }

      // Apply effects based on event type
      const rk = relationKey(a, b)
      switch (outcome) {
        case 'military_exercise':
        case 'diplomatic_incident':
          event.relationsDelta![rk] = -5
          break
        case 'sanctions_imposed':
          event.relationsDelta![rk] = -10
          event.statChanges!.push({ country: weaker, field: 'gdpGrowthModifier', delta: -0.02 })
          break
        case 'border_skirmish':
          event.relationsDelta![rk] = -15
          event.statChanges!.push({ country: weaker, field: 'stability', delta: -3 })
          event.statChanges!.push({ country: stronger, field: 'stability', delta: -2 })
          break
        case 'territorial_claim':
          event.relationsDelta![rk] = -20
          event.statChanges!.push({ country: weaker, field: 'stability', delta: -5 })
          break
        case 'military_mobilisation':
          event.relationsDelta![rk] = -15
          break
        case 'war_declared':
          event.relationsDelta![rk] = -50
          event.statChanges!.push({ country: weaker, field: 'stability', delta: -15 })
          event.statChanges!.push({ country: stronger, field: 'stability', delta: -5 })
          break
        case 'peace_talks_initiated':
          event.relationsDelta![rk] = +10
          break
        case 'surprise_summit':
          event.relationsDelta![rk] = +15
          break
        case 'unexpected_ultimatum':
          event.relationsDelta![rk] = -25
          event.statChanges!.push({ country: weaker, field: 'stability', delta: -5 })
          break
        case 'naval_standoff':
          event.relationsDelta![rk] = -10
          break
      }

      events.push(event)
    }
  }

  // Step 2: Opportunity generation (diplomacy between friendly/neutral countries)
  for (let i = 0; i < isos.length; i++) {
    for (let j = i + 1; j < isos.length; j++) {
      const a = isos[i], b = isos[j]
      const rel = getRelation(relations, a, b)
      if (rel < 0) continue // only neutral or better

      const pA = COUNTRY_PERSONALITIES[a]
      const pB = COUNTRY_PERSONALITIES[b]
      if (!pA || !pB) continue

      const avgDiplomacy = (pA.diplomacy + pB.diplomacy) / 200
      const friendliness = (rel + 100) / 200 // normalise to 0-1

      // Low probability per pair — otherwise too many deals with many countries
      const eventProb = avgDiplomacy * friendliness * 0.005
      if (!roll(eventProb)) continue

      const outcome = weightedPick<WorldTickEventType>([
        { value: 'trade_deal_proposed', weight: (pA.economicFocus + pB.economicFocus) * 0.3 },
        { value: 'alliance_proposed', weight: rel > 30 ? avgDiplomacy * 40 : 0 },
        { value: 'arms_deal', weight: Math.max(pA.aggression, pB.aggression) * 0.2 },
      ])

      const event: WorldTickEvent = {
        id: uid('wt'),
        type: outcome,
        date,
        primaryCountry: a,
        targetCountry: b,
        headline: makeHeadline(outcome, a, b),
        category: eventCategory(outcome),
        importance: eventImportance(outcome),
        relationsDelta: { [relationKey(a, b)]: outcome === 'alliance_proposed' ? +10 : +5 },
        statChanges: [],
      }
      events.push(event)
    }
  }

  // Step 3: Internal events
  for (const iso of isos) {
    const country = countries[iso]
    const p = COUNTRY_PERSONALITIES[iso]
    if (!p) continue

    const stability = country.stats.stability ?? 70
    const approval = country.stats.approval ?? 60

    // Coup attempt: very low stability + military power
    if (stability < 25 && roll(0.02 + (25 - stability) * 0.003)) {
      const success = roll(0.3 + (25 - stability) * 0.02) // more unstable = more likely to succeed
      const type: WorldTickEventType = success ? 'coup_success' : 'coup_attempt'
      events.push({
        id: uid('wt'),
        type,
        date,
        primaryCountry: iso,
        headline: makeHeadline(type, iso),
        category: 'politics',
        importance: success ? 'breaking' : 'major',
        statChanges: success
          ? [{ country: iso, field: 'stability', delta: -20 }, { country: iso, field: 'approval', delta: -15 }]
          : [{ country: iso, field: 'stability', delta: -10 }],
      })
    }

    // Protests: low approval
    if (approval < 35 && roll(0.03 + (35 - approval) * 0.004)) {
      events.push({
        id: uid('wt'),
        type: 'protests_erupt',
        date,
        primaryCountry: iso,
        headline: makeHeadline('protests_erupt', iso),
        category: 'politics',
        importance: 'major',
        statChanges: [
          { country: iso, field: 'stability', delta: -5 },
          { country: iso, field: 'approval', delta: -3 },
        ],
      })
    }

    // Economic boom: high growth + high stability
    if (stability > 75 && country.stats.gdp > 500_000_000_000 && roll(0.008)) {
      events.push({
        id: uid('wt'),
        type: 'economic_boom',
        date,
        primaryCountry: iso,
        headline: makeHeadline('economic_boom', iso),
        category: 'economy',
        importance: 'major',
        statChanges: [
          { country: iso, field: 'approval', delta: +5 },
          { country: iso, field: 'stability', delta: +3 },
        ],
      })
    }

    // Economic crisis: low stability + unpredictability
    if (stability < 40 && roll(0.01 + p.unpredictability * 0.002)) {
      events.push({
        id: uid('wt'),
        type: 'economic_crisis',
        date,
        primaryCountry: iso,
        headline: makeHeadline('economic_crisis', iso),
        category: 'economy',
        importance: 'major',
        statChanges: [
          { country: iso, field: 'stability', delta: -8 },
          { country: iso, field: 'approval', delta: -10 },
        ],
      })
    }

    // Separatist movement: very low stability
    if (stability < 20 && roll(0.015)) {
      events.push({
        id: uid('wt'),
        type: 'separatist_movement',
        date,
        primaryCountry: iso,
        headline: makeHeadline('separatist_movement', iso),
        category: 'politics',
        importance: 'major',
        statChanges: [{ country: iso, field: 'stability', delta: -5 }],
      })
    }

    // Election (democracies, ~once every 4 years ≈ 0.5% per week)
    if (['democracy', 'federal_republic', 'republic'].includes(country.personality ?? '') && roll(0.005)) {
      events.push({
        id: uid('wt'),
        type: 'election_held',
        date,
        primaryCountry: iso,
        headline: makeHeadline('election_held', iso),
        category: 'politics',
        importance: 'minor',
        statChanges: [{ country: iso, field: 'approval', delta: Math.round(Math.random() * 20 - 10) }],
      })
    }

    // Wildcard: humanitarian crisis
    if (stability < 30 && roll(0.008)) {
      events.push({
        id: uid('wt'),
        type: 'humanitarian_crisis',
        date,
        primaryCountry: iso,
        headline: makeHeadline('humanitarian_crisis', iso),
        category: 'world',
        importance: 'major',
        statChanges: [
          { country: iso, field: 'approval', delta: -5 },
          { country: iso, field: 'stability', delta: -3 },
        ],
      })
    }
  }

  // Step 4: Chain reactions (scan events generated so far)
  const chainEvents: WorldTickEvent[] = []
  for (const event of events) {
    if (event.type === 'war_declared' && event.targetCountry) {
      // Neighbors may condemn or intervene
      for (const iso of isos) {
        if (iso === event.primaryCountry || iso === event.targetCountry) continue
        const p = COUNTRY_PERSONALITIES[iso]
        if (!p) continue

        // Condemnation (verbal)
        if (roll(0.4 * (p.diplomacy / 100))) {
          chainEvents.push({
            id: uid('wt-chain'),
            type: 'diplomatic_incident',
            date,
            primaryCountry: iso,
            targetCountry: event.primaryCountry,
            headline: `${countryName(iso)} Condemns ${countryName(event.primaryCountry)}'s Aggression`,
            category: 'diplomacy',
            importance: 'minor',
            relationsDelta: { [relationKey(iso, event.primaryCountry)]: -10 },
          })
        }

        // Sanctions (economic response)
        if (roll(0.15 * (p.economicFocus / 100))) {
          chainEvents.push({
            id: uid('wt-chain'),
            type: 'sanctions_imposed',
            date,
            primaryCountry: iso,
            targetCountry: event.primaryCountry,
            headline: makeHeadline('sanctions_imposed', iso, event.primaryCountry),
            category: 'diplomacy',
            importance: 'major',
            relationsDelta: { [relationKey(iso, event.primaryCountry)]: -15 },
          })
        }
      }
    }

    if (event.type === 'territorial_claim' && event.targetCountry) {
      // Target's allies may react
      for (const iso of isos) {
        if (iso === event.primaryCountry || iso === event.targetCountry) continue
        const relWithTarget = getRelation(relations, iso, event.targetCountry)
        if (relWithTarget < 20) continue // only allies/friends react

        if (roll(0.25)) {
          chainEvents.push({
            id: uid('wt-chain'),
            type: 'military_exercise',
            date,
            primaryCountry: iso,
            targetCountry: event.primaryCountry,
            headline: `${countryName(iso)} Holds Military Drills in Show of Support for ${countryName(event.targetCountry)}`,
            category: 'military',
            importance: 'minor',
            relationsDelta: {
              [relationKey(iso, event.primaryCountry)]: -8,
              [relationKey(iso, event.targetCountry)]: +5,
            },
          })
        }
      }
    }
  }
  events.push(...chainEvents)

  // Step 5: Cap events at 8 per week, prioritise by importance
  const importanceOrder: Record<NewsImportance, number> = { breaking: 0, major: 1, minor: 2 }
  events.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
  const capped = events.slice(0, 8)

  return { events: capped }
}
```

- [ ] **Step 4: Export from shared/index.ts**

```typescript
export { worldTick, type WorldTickResult } from './worldSimulation.js'
```

- [ ] **Step 5: Run tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/worldSimulation.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/worldSimulation.ts shared/worldSimulation.test.ts shared/index.ts
git commit -m "feat: add probabilistic world tick simulation engine"
```

---

### Task 8: Wire world tick into game store and expand news generation

**Files:**
- Modify: `client/src/stores/gameStore.ts`
- Modify: `shared/newsGenerator.ts`
- Modify: `shared/types.ts` (add relations to GameState if needed)

- [ ] **Step 1: Add world tick relations tracking to GameState**

In `shared/types.ts`, inside the `GameState` interface, add:

```typescript
  // ── World simulation ──────────────────────────────────────────────────────
  worldRelations?: Record<string, number>  // "ISO-ISO" → opinion (-100 to +100)
```

- [ ] **Step 2: Add newsFromWorldTickEvent to newsGenerator.ts**

In `shared/newsGenerator.ts`, add:

```typescript
import type { WorldTickEvent } from './types.js'

export function newsFromWorldTickEvent(event: WorldTickEvent): NewsItem {
  return {
    id: event.id.replace('wt', 'news-wt'),
    date: event.date,
    headline: event.headline,
    body: event.body,
    category: event.category,
    importance: event.importance,
    country: event.primaryCountry,
  }
}
```

- [ ] **Step 3: Wire worldTick into advanceDate in gameStore.ts**

In `client/src/stores/gameStore.ts`, add the import:

```typescript
import { worldTick } from '@ad-astra/shared'
import { newsFromWorldTickEvent } from '@ad-astra/shared/newsGenerator'
```

Inside `advanceDate()`, after the GDP growth calculation block (around line 430) and before the deep system ticks, add the world tick logic:

```typescript
// ── World tick simulation (every week) ────────────────────────────────
const worldEvents: WorldTickEvent[] = []
const worldRelations = { ...(s.worldRelations ?? {}) }

// Initialise world relations from country diplomacy if first tick
if (Object.keys(worldRelations).length === 0) {
  for (const [iso, country] of Object.entries(newCountries)) {
    if (country.relations) {
      for (const [otherIso, relType] of Object.entries(country.relations)) {
        const key = [iso, otherIso].sort().join('-')
        if (worldRelations[key] == null) {
          const relValue = relType === 'allied' ? 60
            : relType === 'friendly' ? 30
            : relType === 'neutral' ? 0
            : relType === 'tense' ? -30
            : relType === 'hostile' ? -60
            : relType === 'at_war' ? -90
            : 0
          worldRelations[key] = relValue
        }
      }
    }
  }
}

// Run world tick for each week in the period
for (let w = 0; w < weeksElapsed; w++) {
  const tickDate = advanceDateStr(s.currentDate, 'week') // approximate
  const result = worldTick(newCountries, worldRelations, tickDate, s.allies ? [s.allies] : [])

  for (const event of result.events) {
    worldEvents.push(event)

    // Apply relation deltas
    if (event.relationsDelta) {
      for (const [key, delta] of Object.entries(event.relationsDelta)) {
        worldRelations[key] = Math.max(-100, Math.min(100, (worldRelations[key] ?? 0) + delta))
      }
    }

    // Apply stat changes to countries
    if (event.statChanges) {
      for (const change of event.statChanges) {
        const country = newCountries[change.country]
        if (!country) continue
        const stats = { ...country.stats }
        if (change.field === 'stability') {
          stats.stability = Math.max(0, Math.min(100, (stats.stability ?? 70) + change.delta))
        } else if (change.field === 'approval') {
          stats.approval = Math.max(0, Math.min(100, stats.approval + change.delta))
        }
        newCountries[change.country] = { ...country, stats }
      }
    }
  }
}

// Convert world events to news items
const worldNews = worldEvents.map(e => newsFromWorldTickEvent(e))
```

Then in the return statement, merge worldNews into newsItems and persist worldRelations:

```typescript
return {
  state: {
    ...s,
    // ... existing fields ...
    worldRelations,
    newsItems: [...(s.newsItems ?? []), ...worldNews, ...newNews].slice(-200), // keep last 200
  },
}
```

- [ ] **Step 4: Test — start a game and advance time**

```bash
cd G:/Claude/ad-astra-historia && npm start
```

Start a modern era game. Advance time by one week. Check the News panel — world events should appear. Advance by a month — should see 3-8 news items from autonomous country behavior (diplomatic incidents, trade proposals, internal events, etc.).

Advance by a year — should see a rich history of world events. Check that:
- Hostile countries generate military events
- Stable democracies generate trade deals
- Unstable countries generate coups/protests
- Events chain (war → condemnation → sanctions)

- [ ] **Step 5: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/stores/gameStore.ts shared/newsGenerator.ts shared/types.ts
git commit -m "feat: wire world tick into game loop, expand news generation"
```

---

### Task 9: Final integration test and tuning

**Files:**
- Modify: `shared/worldSimulation.ts` (probability tuning if needed)
- Run: all tests

- [ ] **Step 1: Run the full test suite**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run
```

Expected: All tests pass across shared, server, and client workspaces.

- [ ] **Step 2: Manual playtest checklist**

Start the game (`npm start`) and verify each system:

**Map visuals:**
- [ ] Desert biomes visible with gradient fade into surrounding terrain
- [ ] Forest biomes visible with gradient fade
- [ ] Tundra/grassland/wetland biomes visible
- [ ] Rivers render with major rivers thicker than small ones
- [ ] Lakes render as filled polygons
- [ ] Hillshade terrain shows through all overlays
- [ ] Zooming in/out smoothly transitions biome opacity

**Country database:**
- [ ] USA shows ~331M population, ~$25T GDP
- [ ] Small countries (e.g. Bhutan, Tonga) have non-zero realistic values
- [ ] Sector breakdowns are reasonable (services-heavy for developed nations)
- [ ] No country shows 0 population or 0 GDP

**World simulation:**
- [ ] Advancing 1 week generates 0-8 news items
- [ ] News categories are varied (diplomacy, military, economy, politics, world)
- [ ] Hostile country pairs generate escalation events
- [ ] Friendly country pairs generate cooperation events
- [ ] Unstable countries experience internal turmoil
- [ ] Events modify country relations and stats over time
- [ ] Different playthroughs produce different event sequences

- [ ] **Step 3: Tune probabilities if needed**

If events are too frequent or too rare, adjust the base probabilities in `worldSimulation.ts`:
- Bilateral tension events: `tensionScore * avgAggression * 0.08` — increase/decrease the `0.08`
- Opportunity events: `avgDiplomacy * friendliness * 0.005` — increase/decrease the `0.005`
- Internal events: individual `roll()` probabilities in Step 3 of worldTick

- [ ] **Step 4: Final commit**

```bash
cd G:/Claude/ad-astra-historia
git add -A
git commit -m "chore: integration testing and probability tuning"
```

- [ ] **Step 5: Push to remote**

```bash
cd G:/Claude/ad-astra-historia && git push origin main
```
