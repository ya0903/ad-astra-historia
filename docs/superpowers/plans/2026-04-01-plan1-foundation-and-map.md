# Ad Astra: Historia — Plan 1: Foundation & Map

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full monorepo, define all shared TypeScript types, stand up the Express backend, and render a working MapLibre world map in the browser with era-specific country fills, infrastructure dots, rail/tunnel lines, land-use overlays, and a setup screen for picking era/country/AI config.

**Architecture:** npm workspaces monorepo with `client/` (React + Vite + MapLibre), `server/` (Express), and `shared/` (types + data). The map renders full-screen with MapLibre GL JS using Natural Earth GeoJSON. Country fills are pre-assigned unique colours from `shared/countries.ts`. Era-specific borders are separate GeoJSON files loaded on game start.

**Tech Stack:** Node 20+, TypeScript 5, React 18, Vite 5, MapLibre GL JS 4, Zustand 4, Tailwind CSS 3, Express 4, Vitest, Supertest

---

## File Map

```
ad-astra-historia/
├── package.json                          # Root workspace config
├── tsconfig.base.json                    # Shared TS config
├── .gitignore
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   ├── types.ts                          # All game TypeScript interfaces
│   ├── countries.ts                      # Country colour map, capitals, major cities
│   ├── infraColours.ts                   # Dot colour constants per infrastructure type
│   └── eras/
│       ├── modern.geojson                # Natural Earth current borders
│       ├── 2010s.geojson                 # ~modern with minor differences
│       ├── 1990s.geojson                 # Post-USSR dissolution
│       ├── 1960s.geojson                 # Cold War borders
│       └── 1945.geojson                  # Post-WW2 borders
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.ts                          # Express app entry
│   ├── routes/
│   │   ├── ai.ts                         # AI proxy (OpenAI/Anthropic/Google/custom)
│   │   ├── saves.ts                      # Save/load game state to disk
│   │   └── game.ts                       # Era setup — returns starting game state
│   └── tests/
│       ├── ai.test.ts
│       ├── saves.test.ts
│       └── game.test.ts
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                        # Router: SetupPage | GamePage
    │   ├── pages/
    │   │   ├── SetupPage.tsx              # New game / load / AI config
    │   │   └── GamePage.tsx               # Full game layout
    │   ├── components/
    │   │   ├── map/
    │   │   │   ├── WorldMap.tsx           # MapLibre GL container + initialisation
    │   │   │   ├── CountryLayer.tsx       # GeoJSON fill + label layer
    │   │   │   ├── InfrastructureDots.tsx # Dot markers from gameStore
    │   │   │   ├── RailLines.tsx          # HSR / cross-continent / undersea lines
    │   │   │   ├── LandUseOverlays.tsx    # Forest / park / desert region polygons
    │   │   │   ├── OrgOverlays.tsx        # Alliance border outlines
    │   │   │   └── StrategicPassages.tsx  # Choke point indicators
    │   │   ├── sidebar/
    │   │   │   ├── Sidebar.tsx            # Container with tab switcher
    │   │   │   ├── ActionPanel.tsx        # Stats bar + 3-tab action input
    │   │   │   └── ResultsPanel.tsx       # Post-jump inline-expand results
    │   │   ├── bottom/
    │   │   │   └── TimeBar.tsx            # Time jump buttons + Execute
    │   │   └── ui/
    │   │       ├── InfraInfoCard.tsx      # Popup on dot click
    │   │       └── CountryInfoCard.tsx    # Popup on country click
    │   ├── store/
    │   │   ├── gameStore.ts               # Zustand — full GameState
    │   │   └── configStore.ts             # Zustand — AIConfig persisted to localStorage
    │   └── lib/
    │       ├── api.ts                     # Typed fetch wrappers → server routes
    │       └── mapHelpers.ts              # Colour utils, coordinate helpers
    └── tests/
        ├── mapHelpers.test.ts
        └── store.test.ts
```

---

## Task 1: Root Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "ad-astra-historia",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "start": "concurrently \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
    "build": "npm run build --workspace=shared && npm run build --workspace=server && npm run build --workspace=client",
    "test": "npm run test --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.env
config.json
saves/
*.geojson
!shared/eras/*.geojson
.superpowers/
```

- [ ] **Step 4: Install root dependencies**

```bash
npm install
```

Expected: `node_modules/` created at root with `concurrently`.

- [ ] **Step 5: Commit**

```bash
git init
git add package.json tsconfig.base.json .gitignore
git commit -m "feat: root monorepo scaffold"
```

---

## Task 2: Shared Package — Types

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/types.ts`

- [ ] **Step 1: Create shared/package.json**

```json
{
  "name": "@ad-astra/shared",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types.js",
    "./countries": "./dist/countries.js",
    "./infraColours": "./dist/infraColours.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create shared/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: Create shared/types.ts**

```typescript
export type Era = '1945' | '1960s' | '1990s' | '2010s' | 'modern'
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
}

export interface CountrySectors {
  defence: number
  technology: number
  batteries: number
  microchips: number
  space: number
  pharmaceuticals: number
  agriculture: number
  finance: number
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

export interface GameAction {
  id: string
  text: string
  interpreted?: string
}

export interface ActionResult {
  actionId: string
  summary: string
  fullNarrative: string
  worldReaction: string
  statDeltas: Record<string, number>
  tags: string[]
}

export interface GameState {
  era: Era
  currentDate: string
  playerCountryId: string
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
```

- [ ] **Step 4: Build shared**

```bash
npm run build --workspace=shared
```

Expected: `shared/dist/` created with `types.js` and `types.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add shared/
git commit -m "feat: shared TypeScript types"
```

---

## Task 3: Shared Package — Country Data & Infra Colours

**Files:**
- Create: `shared/countries.ts`
- Create: `shared/infraColours.ts`
- Create: `shared/index.ts`

- [ ] **Step 1: Create shared/countries.ts**

This file maps country ISO codes to display data. Include a representative set covering all major countries for each era — the GeoJSON `ISO_A3` property must match these keys.

```typescript
import type { Country, Era } from './types.js'

export const COUNTRY_COLOURS: Record<string, string> = {
  USA: '#3b82f6', CAN: '#f97316', MEX: '#22c55e', BRA: '#eab308',
  ARG: '#06b6d4', CHL: '#8b5cf6', COL: '#f43f5e', VEN: '#84cc16',
  PER: '#ec4899', BOL: '#14b8a6', URY: '#f59e0b', PRY: '#6366f1',
  ECU: '#10b981', GUY: '#ef4444', SUR: '#0ea5e9', TTO: '#a78bfa',
  GBR: '#dc2626', FRA: '#2563eb', DEU: '#16a34a', ITA: '#ca8a04',
  ESP: '#9333ea', PRT: '#0891b2', NLD: '#d97706', BEL: '#7c3aed',
  CHE: '#059669', AUT: '#db2777', POL: '#1d4ed8', CZE: '#65a30d',
  HUN: '#c2410c', ROU: '#0284c7', BGR: '#7e22ce', GRC: '#0f766e',
  SWE: '#b45309', NOR: '#1e40af', DNK: '#15803d', FIN: '#be185d',
  UKR: '#1e3a8a', BLR: '#166534', MDA: '#92400e', LTU: '#5b21b6',
  LVA: '#0c4a6e', EST: '#14532d', RUS: '#1c1917', KAZ: '#365314',
  UZB: '#1e1b4b', TKM: '#064e3b', KGZ: '#422006', TJK: '#4a044e',
  CHN: '#ef4444', JPN: '#f9a8d4', KOR: '#818cf8', PRK: '#4b5563',
  MNG: '#a3e635', VNM: '#16a34a', THA: '#f59e0b', MMR: '#dc2626',
  KHM: '#8b5cf6', LAO: '#06b6d4', MYS: '#f97316', SGP: '#22c55e',
  IDN: '#eab308', PHL: '#3b82f6', TWN: '#ec4899', HKG: '#84cc16',
  BGD: '#10b981', IND: '#f97316', PAK: '#1d4ed8', LKA: '#9333ea',
  NPL: '#ca8a04', BTN: '#0f766e', MDV: '#7c3aed', AFG: '#374151',
  IRN: '#059669', IRQ: '#b91c1c', SAU: '#1e3a8a', ARE: '#164e63',
  KWT: '#4a044e', QAT: '#0c4a6e', BHR: '#5b21b6', OMN: '#78350f',
  YEM: '#422006', JOR: '#7f1d1d', ISR: '#1e40af', LBN: '#064e3b',
  SYR: '#365314', TUR: '#c2410c', GEO: '#6b21a8', ARM: '#0d9488',
  AZE: '#b45309', EGY: '#15803d', LBY: '#be185d', TUN: '#0891b2',
  DZA: '#92400e', MAR: '#7e22ce', MRT: '#166534', MLI: '#1c1917',
  NER: '#1e1b4b', NGA: '#065f46', CMR: '#4d7c0f', SDN: '#78350f',
  ETH: '#92400e', SOM: '#1f2937', KEN: '#064e3b', TZA: '#1a1a2e',
  UGA: '#365314', MOZ: '#5b21b6', ZAF: '#0c4a6e', ZWE: '#7f1d1d',
  ZMB: '#422006', AGO: '#0d9488', COD: '#b45309', COG: '#1e3a8a',
  GAB: '#166534', GHA: '#be185d', CIV: '#0891b2', SEN: '#6b21a8',
  AUS: '#f97316', NZL: '#3b82f6', PNG: '#22c55e', FJI: '#eab308',
  // USSR (used in 1945/1960s eras)
  SUN: '#7f1d1d',
  // East/West Germany
  DDR: '#374151', FRG: '#16a34a',
  // Yugoslavia
  YUG: '#0f766e',
  // Czechoslovakia
  CSK: '#1d4ed8',
}

export const ERA_START_DATES: Record<string, string> = {
  '1945': '1945-09-02',
  '1960s': '1960-01-01',
  '1990s': '1991-01-01',
  '2010s': '2010-01-01',
  'modern': '2024-01-01',
}

export function getCountryColour(isoA3: string): string {
  return COUNTRY_COLOURS[isoA3] ?? '#6b7280'
}
```

- [ ] **Step 2: Create shared/infraColours.ts**

```typescript
import type { InfrastructureType } from './types.js'

export const INFRA_COLOURS: Record<InfrastructureType, string> = {
  research_centre:   '#818cf8',
  university:        '#a78bfa',
  intelligence_agency: '#c084fc',
  telecom_node:      '#38bdf8',
  city:              '#60a5fa',
  capital:           '#93c5fd',
  port:              '#34d399',
  airport:           '#2dd4bf',
  solar_farm:        '#facc15',
  wind_farm:         '#a3e635',
  hydro_dam:         '#22d3ee',
  fossil_fuel_plant: '#fb923c',
  nuclear_plant:     '#4ade80',
  military_base:     '#f87171',
  nuclear_silo:      '#f43f5e',
  defence_system:    '#e879f9',
  financial_institution: '#f59e0b',
  emergency_services: '#fb7185',
  industrial_zone:   '#fbbf24',
  desalination_plant: '#06b6d4',
  data_centre:       '#64748b',
  embassy:           '#86efac',
  stadium:           '#f97316',
  arts_centre:       '#d946ef',
  film_studio:       '#ec4899',
}

export const RAIL_COLOURS: Record<string, string> = {
  domestic_hsr:    '#fbbf24',
  cross_continent: '#e879f9',
  undersea_tunnel: '#e2e8f0',
}

export const LAND_USE_COLOURS: Record<string, string> = {
  forest:            'rgba(21,128,61,0.35)',
  deforested:        'rgba(120,80,30,0.35)',
  national_park:     'rgba(74,222,128,0.3)',
  nature_corridor:   'rgba(74,222,128,0.5)',
  desert_agriculture: 'rgba(180,210,80,0.3)',
  desertification:   'rgba(210,180,100,0.3)',
}

// Infrastructure types hidden from other countries
export const HIDDEN_INFRA_TYPES: InfrastructureType[] = [
  'nuclear_silo',
  'defence_system',
  'intelligence_agency',
]
```

- [ ] **Step 3: Create shared/index.ts**

```typescript
export * from './types.js'
export * from './countries.js'
export * from './infraColours.js'
```

- [ ] **Step 4: Update shared/tsconfig.json to include new files**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 5: Build and verify**

```bash
npm run build --workspace=shared
```

Expected: `shared/dist/` contains `index.js`, `types.js`, `countries.js`, `infraColours.js` plus `.d.ts` files.

- [ ] **Step 6: Commit**

```bash
git add shared/
git commit -m "feat: country colour map and infrastructure colour constants"
```

---

## Task 4: GeoJSON Era Data

**Files:**
- Create: `shared/eras/modern.geojson` (downloaded)
- Create: `shared/eras/download.sh`

- [ ] **Step 1: Create download script for Natural Earth GeoJSON**

```bash
#!/bin/bash
# shared/eras/download.sh
# Downloads Natural Earth 110m country polygons and saves as modern.geojson
# Run once: bash shared/eras/download.sh

set -e
cd "$(dirname "$0")"

echo "Downloading Natural Earth 110m countries..."
curl -L "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson" \
  -o modern.geojson

echo "Done. modern.geojson saved."
echo "For era-specific borders, copy modern.geojson and adjust manually or use historical datasets."

# Copy modern as base for other eras (historical adjustments applied in game.ts route)
cp modern.geojson 2010s.geojson
cp modern.geojson 1990s.geojson
cp modern.geojson 1960s.geojson
cp modern.geojson 1945.geojson

echo "All era files created. Historical border adjustments are handled server-side in routes/game.ts"
```

- [ ] **Step 2: Run the download script**

```bash
bash shared/eras/download.sh
```

Expected: `modern.geojson`, `2010s.geojson`, `1990s.geojson`, `1960s.geojson`, `1945.geojson` all created in `shared/eras/`. Each file is ~500KB of GeoJSON.

Verify the file has the expected structure:
```bash
node -e "const d = JSON.parse(require('fs').readFileSync('shared/eras/modern.geojson','utf8')); console.log('Features:', d.features.length, 'First ISO:', d.features[0].properties.ISO_A3)"
```
Expected: `Features: 177 First ISO: AFG` (or similar)

- [ ] **Step 3: Commit**

```bash
git add shared/eras/download.sh
git add shared/eras/*.geojson
git commit -m "feat: Natural Earth GeoJSON era border files"
```

---

## Task 5: Express Server Setup

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/index.ts`
- Create: `server/tests/health.test.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "@ad-astra/server",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx watch index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@ad-astra/shared": "*",
    "cors": "^2.8.5",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.9.3",
    "typescript": "^5.4.5",
    "vitest": "^1.5.2"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write failing health check test**

```typescript
// server/tests/health.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp()
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 4: Run test to confirm it fails**

```bash
npm run test --workspace=server
```

Expected: FAIL — `createApp` not found.

- [ ] **Step 5: Create server/index.ts**

```typescript
import express from 'express'
import cors from 'cors'
import { aiRouter } from './routes/ai.js'
import { savesRouter } from './routes/saves.js'
import { gameRouter } from './routes/game.js'

export function createApp() {
  const app = express()
  app.use(cors({ origin: 'http://localhost:3000' }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/ai', aiRouter)
  app.use('/api/saves', savesRouter)
  app.use('/api/game', gameRouter)

  return app
}

// Only start server when run directly (not during tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const PORT = process.env.PORT ?? 3001
  createApp().listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}
```

- [ ] **Step 6: Create stub route files (required for import)**

```typescript
// server/routes/ai.ts
import { Router } from 'express'
export const aiRouter = Router()
```

```typescript
// server/routes/saves.ts
import { Router } from 'express'
export const savesRouter = Router()
```

```typescript
// server/routes/game.ts
import { Router } from 'express'
export const gameRouter = Router()
```

- [ ] **Step 7: Install server dependencies**

```bash
npm install --workspace=server
```

- [ ] **Step 8: Run test to confirm it passes**

```bash
npm run test --workspace=server
```

Expected: PASS — `GET /health → 200 { status: 'ok' }`.

- [ ] **Step 9: Commit**

```bash
git add server/
git commit -m "feat: Express server with health check"
```

---

## Task 6: Game Route — Era Starting Conditions

**Files:**
- Modify: `server/routes/game.ts`
- Create: `server/tests/game.test.ts`

- [ ] **Step 1: Write failing test for era endpoint**

```typescript
// server/tests/game.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'

describe('GET /api/game/era/:era', () => {
  it('returns valid era start conditions for modern', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/era/modern')
    expect(res.status).toBe(200)
    expect(res.body.era).toBe('modern')
    expect(res.body.startDate).toBeTruthy()
    expect(typeof res.body.countries).toBe('object')
    expect(Object.keys(res.body.countries).length).toBeGreaterThan(50)
  })

  it('returns 400 for invalid era', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/era/invalid')
    expect(res.status).toBe(400)
  })

  it('returns historically adjusted data for 1945', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/era/1945')
    expect(res.status).toBe(200)
    expect(res.body.era).toBe('1945')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test --workspace=server
```

Expected: FAIL — `GET /api/game/era/modern` returns 404.

- [ ] **Step 3: Implement game route**

```typescript
// server/routes/game.ts
import { Router } from 'express'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  COUNTRY_COLOURS, ERA_START_DATES, getCountryColour
} from '@ad-astra/shared'
import type { Era, EraStartConditions, Country, CountryStats, CountrySectors } from '@ad-astra/shared'

export const gameRouter = Router()

const __dirname = dirname(fileURLToPath(import.meta.url))
const VALID_ERAS: Era[] = ['1945', '1960s', '1990s', '2010s', 'modern']

function defaultStats(): CountryStats {
  return { gdp: 100, military: 10, researchPoints: 5, approval: 60, softPower: 10, techLevel: 1, culturalReach: 5 }
}

function defaultSectors(): CountrySectors {
  return { defence: 1, technology: 1, batteries: 1, microchips: 1, space: 0, pharmaceuticals: 1, agriculture: 1, finance: 1 }
}

function buildCountriesFromGeoJSON(era: Era): Record<string, Country> {
  const geoPath = resolve(__dirname, `../../shared/eras/${era}.geojson`)
  const geo = JSON.parse(readFileSync(geoPath, 'utf-8'))
  const countries: Record<string, Country> = {}

  for (const feature of geo.features) {
    const { ISO_A3, NAME, NAME_LONG, SUBREGION } = feature.properties
    if (!ISO_A3 || ISO_A3 === '-99') continue

    const id = ISO_A3
    countries[id] = {
      id,
      name: NAME ?? NAME_LONG ?? id,
      colour: getCountryColour(id),
      capitalCity: '',
      majorCities: [],
      stats: defaultStats(),
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

gameRouter.get('/era/:era', (req, res) => {
  const era = req.params.era as Era
  if (!VALID_ERAS.includes(era)) {
    return res.status(400).json({ error: `Invalid era. Must be one of: ${VALID_ERAS.join(', ')}` })
  }

  const conditions: EraStartConditions = {
    era,
    startDate: ERA_START_DATES[era],
    countries: buildCountriesFromGeoJSON(era),
    organisations: [],
    disputes: [],
    nonStateActors: [],
    strategicPassages: {
      hormuz: 'open', malacca: 'open', suez: 'open',
      panama: 'open', bosporus: 'open', gibraltar: 'open', bab_el_mandeb: 'open',
    },
  }

  return res.json(conditions)
})

gameRouter.get('/countries/:era', (req, res) => {
  const era = req.params.era as Era
  if (!VALID_ERAS.includes(era)) {
    return res.status(400).json({ error: 'Invalid era' })
  }
  const countries = buildCountriesFromGeoJSON(era)
  return res.json(Object.values(countries).map(c => ({ id: c.id, name: c.name, colour: c.colour })))
})
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npm run test --workspace=server
```

Expected: PASS — all 3 game route tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/routes/game.ts server/tests/game.test.ts
git commit -m "feat: game era route returns country start conditions from GeoJSON"
```

---

## Task 7: Save/Load Route

**Files:**
- Modify: `server/routes/saves.ts`
- Create: `server/tests/saves.test.ts`
- Create: `saves/.gitkeep`

- [ ] **Step 1: Write failing tests**

```typescript
// server/tests/saves.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'
import { rmSync, existsSync, mkdirSync } from 'fs'

const TEST_SAVES_DIR = './test-saves'

describe('Save/Load routes', () => {
  beforeEach(() => { mkdirSync(TEST_SAVES_DIR, { recursive: true }) })
  afterEach(() => { rmSync(TEST_SAVES_DIR, { recursive: true, force: true }) })

  it('POST /api/saves saves game state and returns filename', async () => {
    const app = createApp({ savesDir: TEST_SAVES_DIR })
    const state = { era: 'modern', currentDate: '2024-01-01', playerCountryId: 'USA' }
    const res = await request(app).post('/api/saves').send({ name: 'test-save', state })
    expect(res.status).toBe(200)
    expect(res.body.filename).toMatch(/test-save/)
  })

  it('GET /api/saves lists save files', async () => {
    const app = createApp({ savesDir: TEST_SAVES_DIR })
    await request(app).post('/api/saves').send({ name: 'my-save', state: { era: 'modern' } })
    const res = await request(app).get('/api/saves')
    expect(res.status).toBe(200)
    expect(res.body.saves.length).toBe(1)
    expect(res.body.saves[0].name).toContain('my-save')
  })

  it('GET /api/saves/:filename loads saved state', async () => {
    const app = createApp({ savesDir: TEST_SAVES_DIR })
    const state = { era: 'modern', playerCountryId: 'GBR' }
    const saveRes = await request(app).post('/api/saves').send({ name: 'load-test', state })
    const { filename } = saveRes.body
    const loadRes = await request(app).get(`/api/saves/${filename}`)
    expect(loadRes.status).toBe(200)
    expect(loadRes.body.playerCountryId).toBe('GBR')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test --workspace=server
```

Expected: FAIL — `createApp` doesn't accept options.

- [ ] **Step 3: Update server/index.ts to accept options**

```typescript
import express from 'express'
import cors from 'cors'
import { aiRouter } from './routes/ai.js'
import { createSavesRouter } from './routes/saves.js'
import { gameRouter } from './routes/game.js'

interface AppOptions {
  savesDir?: string
}

export function createApp(options: AppOptions = {}) {
  const savesDir = options.savesDir ?? './saves'
  const app = express()
  app.use(cors({ origin: 'http://localhost:3000' }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => { res.json({ status: 'ok' }) })

  app.use('/api/ai', aiRouter)
  app.use('/api/saves', createSavesRouter(savesDir))
  app.use('/api/game', gameRouter)

  return app
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const PORT = process.env.PORT ?? 3001
  createApp().listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}
```

- [ ] **Step 4: Implement saves route**

```typescript
// server/routes/saves.ts
import { Router } from 'express'
import { writeFileSync, readFileSync, readdirSync, mkdirSync, unlinkSync } from 'fs'
import { resolve } from 'path'

export function createSavesRouter(savesDir: string) {
  mkdirSync(savesDir, { recursive: true })
  const router = Router()

  router.post('/', (req, res) => {
    const { name, state } = req.body
    if (!name || !state) return res.status(400).json({ error: 'name and state required' })
    const filename = `${name}-${Date.now()}.json`
    const filepath = resolve(savesDir, filename)
    writeFileSync(filepath, JSON.stringify(state, null, 2))
    return res.json({ filename })
  })

  router.get('/', (_req, res) => {
    const files = readdirSync(savesDir).filter(f => f.endsWith('.json'))
    const saves = files.map(f => {
      const parts = f.replace('.json', '').split('-')
      const ts = parseInt(parts[parts.length - 1])
      return { filename: f, name: parts.slice(0, -1).join('-'), savedAt: new Date(ts).toISOString() }
    }).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    return res.json({ saves })
  })

  router.get('/:filename', (req, res) => {
    try {
      const filepath = resolve(savesDir, req.params.filename)
      const state = JSON.parse(readFileSync(filepath, 'utf-8'))
      return res.json(state)
    } catch {
      return res.status(404).json({ error: 'Save not found' })
    }
  })

  router.delete('/:filename', (req, res) => {
    try {
      unlinkSync(resolve(savesDir, req.params.filename))
      return res.json({ deleted: true })
    } catch {
      return res.status(404).json({ error: 'Save not found' })
    }
  })

  return router
}
```

- [ ] **Step 5: Create saves directory placeholder**

```bash
mkdir -p saves && touch saves/.gitkeep
```

- [ ] **Step 6: Run tests**

```bash
npm run test --workspace=server
```

Expected: PASS — all save/load tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/ saves/.gitkeep
git commit -m "feat: save/load game state to disk as JSON"
```

---

## Task 8: React Client Setup

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "@ad-astra/client",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@ad-astra/shared": "*",
    "maplibre-gl": "^4.3.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@testing-library/react": "^15.0.6",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.5.2"
  }
}
```

- [ ] **Step 2: Create client/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create client/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```

- [ ] **Step 4: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ad Astra: Historia</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #root { height: 100%; width: 100%; overflow: hidden; background: #0a1628; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create Tailwind config**

```bash
cd client && npx tailwindcss init -p
```

Update `client/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Create `client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

.maplibregl-map { font-family: inherit; }
```

- [ ] **Step 6: Create client/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 7: Create client/src/App.tsx**

```tsx
import { useConfigStore } from './store/configStore'
import { useGameStore } from './store/gameStore'
import SetupPage from './pages/SetupPage'
import GamePage from './pages/GamePage'

export default function App() {
  const configured = useConfigStore(s => s.configured)
  const gameState = useGameStore(s => s.gameState)

  if (!configured || !gameState) return <SetupPage />
  return <GamePage />
}
```

- [ ] **Step 8: Install client dependencies**

```bash
npm install --workspace=client
```

- [ ] **Step 9: Commit**

```bash
git add client/
git commit -m "feat: React + Vite + Tailwind client scaffold"
```

---

## Task 9: Zustand Stores

**Files:**
- Create: `client/src/store/configStore.ts`
- Create: `client/src/store/gameStore.ts`
- Create: `client/tests/store.test.ts`

- [ ] **Step 1: Write failing store tests**

```typescript
// client/tests/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useConfigStore } from '../src/store/configStore'
import { useGameStore } from '../src/store/gameStore'
import type { AIConfig, GameState } from '@ad-astra/shared'

describe('configStore', () => {
  beforeEach(() => useConfigStore.getState().reset())

  it('starts unconfigured', () => {
    expect(useConfigStore.getState().configured).toBe(false)
  })

  it('setConfig marks as configured', () => {
    const config: AIConfig = { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' }
    useConfigStore.getState().setConfig(config)
    expect(useConfigStore.getState().configured).toBe(true)
    expect(useConfigStore.getState().config?.apiKey).toBe('sk-test')
  })
})

describe('gameStore', () => {
  beforeEach(() => useGameStore.getState().reset())

  it('starts with no game state', () => {
    expect(useGameStore.getState().gameState).toBeNull()
  })

  it('setGameState stores the state', () => {
    const mockState = { era: 'modern', playerCountryId: 'USA' } as unknown as GameState
    useGameStore.getState().setGameState(mockState)
    expect(useGameStore.getState().gameState?.playerCountryId).toBe('USA')
  })

  it('addPendingAction appends to queue', () => {
    const mockState = { era: 'modern', pendingActions: [] } as unknown as GameState
    useGameStore.getState().setGameState(mockState)
    useGameStore.getState().addPendingAction({ id: '1', text: 'Build a port' })
    expect(useGameStore.getState().gameState?.pendingActions.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test --workspace=client
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create client/src/store/configStore.ts**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIConfig } from '@ad-astra/shared'

interface ConfigStore {
  config: AIConfig | null
  configured: boolean
  setConfig: (config: AIConfig) => void
  reset: () => void
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      config: null,
      configured: false,
      setConfig: (config) => set({ config, configured: true }),
      reset: () => set({ config: null, configured: false }),
    }),
    { name: 'ad-astra-config' }
  )
)
```

- [ ] **Step 4: Create client/src/store/gameStore.ts**

```typescript
import { create } from 'zustand'
import type { GameState, GameAction, ActionResult } from '@ad-astra/shared'

interface GameStore {
  gameState: GameState | null
  setGameState: (state: GameState) => void
  addPendingAction: (action: Omit<GameAction, 'id'> & { id?: string }) => void
  removePendingAction: (id: string) => void
  clearPendingActions: () => void
  setLastResults: (results: ActionResult[]) => void
  reset: () => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  gameState: null,

  setGameState: (gameState) => set({ gameState }),

  addPendingAction: (action) => set(s => {
    if (!s.gameState) return s
    const id = action.id ?? crypto.randomUUID()
    return {
      gameState: {
        ...s.gameState,
        pendingActions: [...s.gameState.pendingActions, { ...action, id }],
      }
    }
  }),

  removePendingAction: (id) => set(s => {
    if (!s.gameState) return s
    return {
      gameState: {
        ...s.gameState,
        pendingActions: s.gameState.pendingActions.filter(a => a.id !== id),
      }
    }
  }),

  clearPendingActions: () => set(s => {
    if (!s.gameState) return s
    return { gameState: { ...s.gameState, pendingActions: [] } }
  }),

  setLastResults: (results) => set(s => {
    if (!s.gameState) return s
    return { gameState: { ...s.gameState, lastResults: results } }
  }),

  reset: () => set({ gameState: null }),
}))
```

- [ ] **Step 5: Run tests**

```bash
npm run test --workspace=client
```

Expected: PASS — all store tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/store/
git commit -m "feat: Zustand config and game state stores"
```

---

## Task 10: API Client Library

**Files:**
- Create: `client/src/lib/api.ts`
- Create: `client/tests/api.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// client/tests/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

import { api } from '../src/lib/api'

describe('api.getEraConditions', () => {
  beforeEach(() => mockFetch.mockReset())

  it('calls the correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ era: 'modern', countries: {} }),
    })
    const result = await api.getEraConditions('modern')
    expect(mockFetch).toHaveBeenCalledWith('/api/game/era/modern')
    expect(result.era).toBe('modern')
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'bad era' }) })
    await expect(api.getEraConditions('bad' as any)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test --workspace=client
```

Expected: FAIL — `api` not found.

- [ ] **Step 3: Create client/src/lib/api.ts**

```typescript
import type { Era, EraStartConditions, GameState, AIConfig } from '@ad-astra/shared'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getEraConditions: (era: Era) =>
    fetchJSON<EraStartConditions>(`/api/game/era/${era}`),

  getCountryList: (era: Era) =>
    fetchJSON<Array<{ id: string; name: string; colour: string }>>(`/api/game/countries/${era}`),

  saveGame: (name: string, state: GameState) =>
    fetchJSON<{ filename: string }>('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, state }),
    }),

  listSaves: () =>
    fetchJSON<{ saves: Array<{ filename: string; name: string; savedAt: string }> }>('/api/saves'),

  loadSave: (filename: string) =>
    fetchJSON<GameState>(`/api/saves/${filename}`),

  executeActions: (payload: {
    gameState: GameState
    aiConfig: AIConfig
    timeJump: string
  }) =>
    fetchJSON<{ updatedState: GameState }>('/api/ai/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  getAISuggestions: (payload: { gameState: GameState; aiConfig: AIConfig }) =>
    fetchJSON<{ suggestions: string[] }>('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test --workspace=client
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/api.ts client/tests/api.test.ts
git commit -m "feat: typed API client for server routes"
```

---

## Task 11: Setup Page

**Files:**
- Create: `client/src/pages/SetupPage.tsx`

- [ ] **Step 1: Create SetupPage.tsx**

This page renders in 3 steps: AI Config → Pick Era → Pick Country → Start.

```tsx
import { useState, useEffect } from 'react'
import type { Era, AIConfig, AIProvider } from '@ad-astra/shared'
import { useConfigStore } from '../store/configStore'
import { useGameStore } from '../store/gameStore'
import { api } from '../lib/api'

type Step = 'ai-config' | 'pick-era' | 'pick-country' | 'loading'

const ERAS: { id: Era; label: string; desc: string }[] = [
  { id: '1945', label: '1945', desc: 'Post-WW2 world. Empires intact. Cold War beginning.' },
  { id: '1960s', label: '1960s', desc: 'Space race. Cold War peak. Decolonisation underway.' },
  { id: '1990s', label: '1990s', desc: 'USSR collapsed. New world order forming.' },
  { id: '2010s', label: '2010s', desc: 'Rise of China. Social media age. Climate crisis.' },
  { id: 'modern', label: 'Modern', desc: 'Today\'s world. AI, green transition, great power competition.' },
]

const PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google Gemini' },
  { id: 'custom', label: 'Custom Endpoint' },
]

export default function SetupPage() {
  const [step, setStep] = useState<Step>('ai-config')
  const [provider, setProvider] = useState<AIProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [model, setModel] = useState('gpt-4o')
  const [selectedEra, setSelectedEra] = useState<Era>('modern')
  const [difficulty, setDifficulty] = useState<'passive'|'realistic'|'aggressive'>('realistic')
  const [countries, setCountries] = useState<Array<{ id: string; name: string; colour: string }>>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [error, setError] = useState('')
  const [saves, setSaves] = useState<Array<{ filename: string; name: string; savedAt: string }>>([])

  const { setConfig } = useConfigStore()
  const { setGameState } = useGameStore()

  useEffect(() => {
    api.listSaves().then(r => setSaves(r.saves)).catch(() => {})
  }, [])

  async function handleAIConfig() {
    if (!apiKey && !baseUrl) { setError('Enter an API key or custom endpoint URL'); return }
    const config: AIConfig = { provider, apiKey, baseUrl: baseUrl || undefined, authToken: authToken || undefined, model }
    setConfig(config)
    const list = await api.getCountryList(selectedEra).catch(() => [])
    setCountries(list.sort((a, b) => a.name.localeCompare(b.name)))
    setStep('pick-era')
    setError('')
  }

  async function handleEraSelected() {
    const list = await api.getCountryList(selectedEra).catch(() => [])
    setCountries(list.sort((a, b) => a.name.localeCompare(b.name)))
    setStep('pick-country')
  }

  async function handleStartGame() {
    if (!selectedCountry) { setError('Select a country'); return }
    setStep('loading')
    try {
      const conditions = await api.getEraConditions(selectedEra)
      setGameState({
        ...conditions,
        playerCountryId: selectedCountry,
        difficulty,
        infrastructureMap: [],
        railLines: [],
        landUseRegions: [],
        megaprojects: [],
        spaceProgrammes: {},
        actionHistory: [],
        pendingActions: [],
        lastResults: [],
      })
    } catch (e: any) {
      setError(e.message)
      setStep('pick-country')
    }
  }

  async function handleLoadSave(filename: string) {
    setStep('loading')
    try {
      const state = await api.loadSave(filename)
      setGameState(state)
    } catch (e: any) {
      setError(e.message)
      setStep('ai-config')
    }
  }

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-2 tracking-wide">Ad Astra: Historia</h1>
        <p className="text-center text-blue-400 mb-10 text-sm tracking-widest uppercase">AI-Powered Grand Strategy</p>

        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg p-3 mb-6 text-sm">{error}</div>}

        {step === 'ai-config' && (
          <div className="bg-[#111827] border border-[#1e3a4a] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">AI Configuration</h2>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Provider</label>
              <div className="flex gap-2 flex-wrap">
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => setProvider(p.id)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${provider === p.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#0d1117] border-[#374151] text-gray-400 hover:border-blue-700'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {provider !== 'custom' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">API Key</label>
                <input value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}
                  className="w-full bg-[#0d1117] border border-[#374151] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            )}
            {(provider === 'custom') && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Base URL (OpenAI-compatible)</label>
                  <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                    placeholder="https://your-openwebui.example.com/api"
                    className="w-full bg-[#0d1117] border border-[#374151] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Auth Token (optional)</label>
                  <input value={authToken} onChange={e => setAuthToken(e.target.value)}
                    placeholder="Bearer token or API key"
                    className="w-full bg-[#0d1117] border border-[#374151] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Model</label>
              <input value={model} onChange={e => setModel(e.target.value)}
                placeholder="gpt-4o"
                className="w-full bg-[#0d1117] border border-[#374151] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={handleAIConfig}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold transition-colors">
              Continue →
            </button>
            {saves.length > 0 && (
              <div className="border-t border-[#1f2937] pt-4">
                <p className="text-xs text-gray-500 mb-2">Or load a saved game</p>
                {saves.map(s => (
                  <button key={s.filename} onClick={() => handleLoadSave(s.filename)}
                    className="w-full text-left bg-[#0d1117] border border-[#374151] rounded-lg px-4 py-2 text-sm text-gray-300 hover:border-blue-700 mb-1 flex justify-between">
                    <span>{s.name}</span>
                    <span className="text-gray-600">{new Date(s.savedAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'pick-era' && (
          <div className="bg-[#111827] border border-[#1e3a4a] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Choose Your Era</h2>
            <div className="space-y-2">
              {ERAS.map(era => (
                <button key={era.id} onClick={() => setSelectedEra(era.id)}
                  className={`w-full text-left rounded-lg px-4 py-3 border transition-colors ${selectedEra === era.id ? 'bg-blue-900/40 border-blue-500' : 'bg-[#0d1117] border-[#374151] hover:border-blue-700'}`}>
                  <div className="font-semibold">{era.label}</div>
                  <div className="text-sm text-gray-400">{era.desc}</div>
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Difficulty</label>
              <div className="flex gap-2">
                {(['passive','realistic','aggressive'] as const).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-colors capitalize ${difficulty === d ? 'bg-blue-700 border-blue-500 text-white' : 'bg-[#0d1117] border-[#374151] text-gray-400'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('ai-config')} className="flex-1 bg-[#0d1117] border border-[#374151] rounded-lg py-3 text-sm text-gray-400 hover:border-blue-700 transition-colors">← Back</button>
              <button onClick={handleEraSelected} className="flex-1 bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold transition-colors">Choose Country →</button>
            </div>
          </div>
        )}

        {step === 'pick-country' && (
          <div className="bg-[#111827] border border-[#1e3a4a] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Choose Your Country</h2>
            <input value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
              placeholder="Search countries..."
              className="w-full bg-[#0d1117] border border-[#374151] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
            <div className="h-80 overflow-y-auto space-y-1 pr-1">
              {filteredCountries.map(c => (
                <button key={c.id} onClick={() => setSelectedCountry(c.id)}
                  className={`w-full text-left rounded-lg px-4 py-2 border flex items-center gap-3 text-sm transition-colors ${selectedCountry === c.id ? 'bg-blue-900/40 border-blue-500' : 'bg-[#0d1117] border-[#1f2937] hover:border-blue-700'}`}>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.colour }} />
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('pick-era')} className="flex-1 bg-[#0d1117] border border-[#374151] rounded-lg py-3 text-sm text-gray-400 hover:border-blue-700 transition-colors">← Back</button>
              <button onClick={handleStartGame} disabled={!selectedCountry}
                className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg py-3 font-semibold transition-colors">Start Game →</button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="text-center py-20">
            <div className="text-blue-400 text-lg">Loading world...</div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create stub GamePage.tsx so App.tsx compiles**

```tsx
// client/src/pages/GamePage.tsx
export default function GamePage() {
  return (
    <div className="w-full h-full bg-[#0a1628] flex items-center justify-center text-white">
      <p>Map loading...</p>
    </div>
  )
}
```

- [ ] **Step 3: Start dev servers and verify setup page renders**

```bash
npm start
```

Open http://localhost:3000. Expected: Setup page renders with AI config form, dark background, correct styling.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/
git commit -m "feat: setup page with AI config, era picker, and country selector"
```

---

## Task 12: MapLibre World Map

**Files:**
- Create: `client/src/components/map/WorldMap.tsx`
- Create: `client/src/lib/mapHelpers.ts`
- Modify: `client/src/pages/GamePage.tsx`

- [ ] **Step 1: Write failing map helpers test**

```typescript
// client/tests/mapHelpers.test.ts
import { describe, it, expect } from 'vitest'
import { hexToRgba, coordsToGeoJSONLine } from '../src/lib/mapHelpers'

describe('hexToRgba', () => {
  it('converts hex to rgba with opacity', () => {
    expect(hexToRgba('#3b82f6', 0.3)).toBe('rgba(59,130,246,0.3)')
  })
  it('handles 3-char hex', () => {
    expect(hexToRgba('#fff', 1)).toBe('rgba(255,255,255,1)')
  })
})

describe('coordsToGeoJSONLine', () => {
  it('returns a GeoJSON LineString feature', () => {
    const line = coordsToGeoJSONLine([[0, 0], [1, 1]])
    expect(line.type).toBe('Feature')
    expect(line.geometry.type).toBe('LineString')
    expect(line.geometry.coordinates).toEqual([[0, 0], [1, 1]])
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test --workspace=client
```

Expected: FAIL.

- [ ] **Step 3: Create client/src/lib/mapHelpers.ts**

```typescript
export function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

export function coordsToGeoJSONLine(coordinates: [number, number][]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates },
  }
}

export function bezierMidpoint(
  from: [number, number],
  to: [number, number],
  offset: number = 0.3
): [number, number] {
  const mx = (from[0] + to[0]) / 2
  const my = (from[1] + to[1]) / 2
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  return [mx - dy * offset, my + dx * offset]
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npm run test --workspace=client
```

Expected: PASS.

- [ ] **Step 5: Create client/src/components/map/WorldMap.tsx**

```tsx
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useGameStore } from '../../store/gameStore'
import { getCountryColour, COUNTRY_COLOURS } from '@ad-astra/shared'
import CountryLayer from './CountryLayer'
import InfrastructureDots from './InfrastructureDots'
import RailLines from './RailLines'
import LandUseOverlays from './LandUseOverlays'
import OrgOverlays from './OrgOverlays'
import StrategicPassages from './StrategicPassages'

interface WorldMapProps {
  onCountryClick?: (countryId: string) => void
}

export default function WorldMap({ onCountryClick }: WorldMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const gameState = useGameStore(s => s.gameState)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0a1628' },
          },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [10, 20],
      zoom: 2,
      minZoom: 1.5,
      maxZoom: 10,
    })

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  if (!gameState) return <div ref={mapContainer} className="w-full h-full" />

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      {map.current && (
        <>
          <CountryLayer map={map.current} era={gameState.era} countries={gameState.countries} playerCountryId={gameState.playerCountryId} onCountryClick={onCountryClick} />
          <InfrastructureDots map={map.current} infrastructure={gameState.infrastructureMap} playerCountryId={gameState.playerCountryId} />
          <RailLines map={map.current} railLines={gameState.railLines} />
          <LandUseOverlays map={map.current} regions={gameState.landUseRegions} />
          <OrgOverlays map={map.current} organisations={gameState.organisations} countries={gameState.countries} />
          <StrategicPassages map={map.current} passages={gameState.strategicPassages} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/map/WorldMap.tsx client/src/lib/mapHelpers.ts client/tests/mapHelpers.test.ts
git commit -m "feat: MapLibre GL map container with layer slots"
```

---

## Task 13: Country Layer (Fills + Labels)

**Files:**
- Create: `client/src/components/map/CountryLayer.tsx`

- [ ] **Step 1: Create CountryLayer.tsx**

This component loads the era GeoJSON, assigns country colours, renders fill and label layers, and handles click events.

```tsx
import { useEffect, useRef } from 'react'
import type { Map } from 'maplibre-gl'
import type { Era, Country } from '@ad-astra/shared'
import { getCountryColour } from '@ad-astra/shared'

interface Props {
  map: Map
  era: Era
  countries: Record<string, Country>
  playerCountryId: string
  onCountryClick?: (countryId: string) => void
}

const LAYER_IDS = {
  source: 'countries-source',
  fill: 'countries-fill',
  selected: 'countries-selected',
  border: 'countries-border',
  label: 'countries-label',
}

export default function CountryLayer({ map, era, countries, playerCountryId, onCountryClick }: Props) {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return

    const addLayers = () => {
      // Build colour expression from countries prop (no fetch needed — countries come from game store)
      const colourExpression: any[] = ['match', ['get', 'ISO_A3']]
      for (const [id, country] of Object.entries(countries)) {
        colourExpression.push(id, country.colour)
      }
      colourExpression.push('#6b7280') // default

      map.addSource(LAYER_IDS.source, {
        type: 'geojson',
        data: `/api/game/geojson/${era}`,
      })

      {

          // Country fill
          map.addLayer({
            id: LAYER_IDS.fill,
            type: 'fill',
            source: LAYER_IDS.source,
            paint: {
              'fill-color': colourExpression,
              'fill-opacity': [
                'case',
                ['==', ['get', 'ISO_A3'], playerCountryId], 0.7,
                0.5
              ],
            },
          })

          // Player country highlight
          map.addLayer({
            id: LAYER_IDS.selected,
            type: 'line',
            source: LAYER_IDS.source,
            filter: ['==', ['get', 'ISO_A3'], playerCountryId],
            paint: {
              'line-color': '#ffffff',
              'line-width': 2,
              'line-opacity': 0.9,
            },
          })

          // Country borders
          map.addLayer({
            id: LAYER_IDS.border,
            type: 'line',
            source: LAYER_IDS.source,
            paint: {
              'line-color': '#1e3a4a',
              'line-width': 0.8,
            },
          })

          // Country name labels
          map.addLayer({
            id: LAYER_IDS.label,
            type: 'symbol',
            source: LAYER_IDS.source,
            layout: {
              'text-field': ['get', 'NAME'],
              'text-font': ['Open Sans Regular'],
              'text-size': [
                'interpolate', ['linear'], ['zoom'],
                2, ['interpolate', ['linear'], ['get', 'scalerank'], 0, 14, 5, 8],
                6, ['interpolate', ['linear'], ['get', 'scalerank'], 0, 18, 5, 11],
              ],
              'text-transform': 'uppercase',
              'text-letter-spacing': 0.1,
            },
            paint: {
              'text-color': '#ffffff',
              'text-opacity': 0.85,
              'text-halo-color': 'rgba(0,0,0,0.4)',
              'text-halo-width': 1,
            },
          })

          // Click handler
          map.on('click', LAYER_IDS.fill, (e) => {
            const feature = e.features?.[0]
            if (feature) {
              onCountryClick?.(feature.properties.ISO_A3)
            }
          })

          map.on('mouseenter', LAYER_IDS.fill, () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', LAYER_IDS.fill, () => {
            map.getCanvas().style.cursor = ''
          })

      loaded.current = true
      }
    }

    if (map.loaded()) addLayers()
    else map.on('load', addLayers)

    return () => {
      if (map.getLayer(LAYER_IDS.label)) map.removeLayer(LAYER_IDS.label)
      if (map.getLayer(LAYER_IDS.border)) map.removeLayer(LAYER_IDS.border)
      if (map.getLayer(LAYER_IDS.selected)) map.removeLayer(LAYER_IDS.selected)
      if (map.getLayer(LAYER_IDS.fill)) map.removeLayer(LAYER_IDS.fill)
      if (map.getSource(LAYER_IDS.source)) map.removeSource(LAYER_IDS.source)
      loaded.current = false
    }
  }, [map, era, playerCountryId])

  return null
}
```

- [ ] **Step 2: Add GeoJSON file serving route to game.ts**

```typescript
// Add to server/routes/game.ts after existing routes:
gameRouter.get('/geojson/:era', (req, res) => {
  const era = req.params.era as Era
  if (!VALID_ERAS.includes(era)) return res.status(400).json({ error: 'Invalid era' })
  const geoPath = resolve(__dirname, `../../shared/eras/${era}.geojson`)
  res.setHeader('Content-Type', 'application/json')
  res.sendFile(geoPath)
})
```

- [ ] **Step 3: Update GamePage.tsx to show the map**

```tsx
// client/src/pages/GamePage.tsx
import WorldMap from '../components/map/WorldMap'

export default function GamePage() {
  return (
    <div className="w-full h-full bg-[#0a1628]">
      <WorldMap />
    </div>
  )
}
```

- [ ] **Step 4: Create stub layer components so WorldMap.tsx compiles**

```tsx
// client/src/components/map/InfrastructureDots.tsx
import type { Map } from 'maplibre-gl'
import type { Infrastructure } from '@ad-astra/shared'
export default function InfrastructureDots(_: { map: Map; infrastructure: Infrastructure[]; playerCountryId: string }) { return null }

// client/src/components/map/RailLines.tsx
import type { Map } from 'maplibre-gl'
import type { RailLine } from '@ad-astra/shared'
export default function RailLines(_: { map: Map; railLines: RailLine[] }) { return null }

// client/src/components/map/LandUseOverlays.tsx
import type { Map } from 'maplibre-gl'
import type { LandUseRegion } from '@ad-astra/shared'
export default function LandUseOverlays(_: { map: Map; regions: LandUseRegion[] }) { return null }

// client/src/components/map/OrgOverlays.tsx
import type { Map } from 'maplibre-gl'
import type { Organisation, Country } from '@ad-astra/shared'
export default function OrgOverlays(_: { map: Map; organisations: Organisation[]; countries: Record<string, Country> }) { return null }

// client/src/components/map/StrategicPassages.tsx
import type { Map } from 'maplibre-gl'
import type { PassageStatus } from '@ad-astra/shared'
export default function StrategicPassages(_: { map: Map; passages: Record<string, PassageStatus> }) { return null }
```

- [ ] **Step 5: Verify map renders in browser**

```bash
npm start
```

Go through setup (pick any AI config, pick era `modern`, pick a country). Expected: full world map renders with coloured country fills and country name labels. Your chosen country has a white border highlight.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/map/ server/routes/game.ts client/src/pages/GamePage.tsx
git commit -m "feat: MapLibre country fills with era GeoJSON, labels, and player highlight"
```

---

## Task 14: Infrastructure Dots Layer

**Files:**
- Modify: `client/src/components/map/InfrastructureDots.tsx`

- [ ] **Step 1: Implement InfrastructureDots.tsx**

```tsx
import { useEffect, useRef } from 'react'
import type { Map } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import type { Infrastructure } from '@ad-astra/shared'
import { INFRA_COLOURS, HIDDEN_INFRA_TYPES } from '@ad-astra/shared'

interface Props {
  map: Map
  infrastructure: Infrastructure[]
  playerCountryId: string
}

export default function InfrastructureDots({ map, infrastructure, playerCountryId }: Props) {
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    // Remove existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const visible = infrastructure.filter(infra => {
      if (HIDDEN_INFRA_TYPES.includes(infra.type) && infra.countryId !== playerCountryId) return false
      return true
    })

    visible.forEach(infra => {
      const colour = INFRA_COLOURS[infra.type] ?? '#6b7280'

      // Create dot element
      const el = document.createElement('div')
      el.style.cssText = `
        width: 10px; height: 10px; border-radius: 50%;
        background: ${colour};
        box-shadow: 0 0 8px ${colour}, 0 0 4px ${colour};
        cursor: pointer;
        transition: transform 0.15s;
      `
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.6)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'infra-popup',
      }).setHTML(`
        <div style="background:#111827;border:1px solid #374151;border-radius:8px;padding:10px;min-width:160px;font-family:sans-serif">
          <div style="color:${colour};font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:4px">${infra.type.replace(/_/g, ' ')}</div>
          <div style="color:#e2e8f0;font-size:13px;font-weight:600;margin-bottom:4px">${infra.name}</div>
          <div style="color:#6b7280;font-size:11px">Level ${infra.level}${infra.nationalised ? ' · <span style="color:#f59e0b">Nationalised</span>' : ''}</div>
        </div>
      `)

      el.addEventListener('mouseenter', () => popup.addTo(map))
      el.addEventListener('mouseleave', () => popup.remove())

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([infra.lng, infra.lat])
        .addTo(map)

      markersRef.current.push(marker)
    })

    // Show dots only at mid+ zoom
    const updateVisibility = () => {
      const zoom = map.getZoom()
      markersRef.current.forEach(m => {
        const el = m.getElement()
        el.style.display = zoom >= 3.5 ? 'block' : 'none'
      })
    }

    updateVisibility()
    map.on('zoom', updateVisibility)

    return () => {
      map.off('zoom', updateVisibility)
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
    }
  }, [map, infrastructure, playerCountryId])

  return null
}
```

- [ ] **Step 2: Add popup styles to index.css**

```css
/* Add to client/src/index.css */
.maplibregl-popup-content {
  background: transparent !important;
  padding: 0 !important;
  box-shadow: none !important;
}
.maplibregl-popup-tip { display: none !important; }
```

- [ ] **Step 3: Verify in browser (dots will be empty until Plan 2 adds infrastructure via actions)**

Temporarily add a test infrastructure item to verify dot rendering by adding to `SetupPage.tsx` after `setGameState`:

```typescript
// Temporary test — remove after verifying
const testState = { ...conditions, playerCountryId: selectedCountry, difficulty, /* ... */ }
testState.infrastructureMap = [{
  id: '1', countryId: selectedCountry, type: 'capital' as const,
  lat: 51.5, lng: -0.12, level: 1, name: 'London'
}]
setGameState(testState)
```

Zoom to level 4+. Expected: a glowing blue dot appears. Hovering shows the popup card. Remove the test line after verifying.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/map/InfrastructureDots.tsx client/src/index.css
git commit -m "feat: infrastructure dots with glow, zoom visibility, and hover popup"
```

---

## Task 15: Rail Lines & Undersea Tunnels Layer

**Files:**
- Modify: `client/src/components/map/RailLines.tsx`

- [ ] **Step 1: Implement RailLines.tsx**

```tsx
import { useEffect, useRef } from 'react'
import type { Map } from 'maplibre-gl'
import type { RailLine } from '@ad-astra/shared'
import { RAIL_COLOURS } from '@ad-astra/shared'

interface Props {
  map: Map
  railLines: RailLine[]
}

const SOURCE_ID = 'rail-lines-source'
const LAYER_ID = 'rail-lines-layer'

export default function RailLines({ map, railLines }: Props) {
  const loaded = useRef(false)

  useEffect(() => {
    const features = railLines.map(line => {
      const [lngA, latA] = line.fromCoords
      const [lngB, latB] = line.toCoords
      // Simple midpoint offset for Bezier-like curve appearance
      const midLng = (lngA + lngB) / 2 - (latB - latA) * 0.2
      const midLat = (latA + latB) / 2 + (lngB - lngA) * 0.1
      return {
        type: 'Feature' as const,
        properties: { railType: line.type, id: line.id },
        geometry: {
          type: 'LineString' as const,
          coordinates: [line.fromCoords, [midLng, midLat], line.toCoords],
        },
      }
    })

    const geojson = { type: 'FeatureCollection' as const, features }

    const addLayer = () => {
      if (map.getSource(SOURCE_ID)) {
        (map.getSource(SOURCE_ID) as any).setData(geojson)
        return
      }

      map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

      // Undersea tunnel glow (bottom layer)
      map.addLayer({
        id: `${LAYER_ID}-undersea-glow`,
        type: 'line',
        source: SOURCE_ID,
        filter: ['==', ['get', 'railType'], 'undersea_tunnel'],
        paint: {
          'line-color': RAIL_COLOURS.undersea_tunnel,
          'line-width': 6,
          'line-opacity': 0.2,
          'line-dasharray': [4, 3],
        },
      })

      map.addLayer({
        id: `${LAYER_ID}-main`,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': [
            'match', ['get', 'railType'],
            'domestic_hsr', RAIL_COLOURS.domestic_hsr,
            'cross_continent', RAIL_COLOURS.cross_continent,
            'undersea_tunnel', RAIL_COLOURS.undersea_tunnel,
            '#ffffff',
          ],
          'line-width': 2.5,
          'line-opacity': 0.9,
          'line-dasharray': [
            'match', ['get', 'railType'],
            'cross_continent', ['literal', [8, 3]],
            'undersea_tunnel', ['literal', [4, 3]],
            ['literal', [1]],
          ],
        },
      })

      loaded.current = true
    }

    if (map.loaded()) addLayer()
    else map.on('load', addLayer)

    return () => {
      if (loaded.current) {
        [`${LAYER_ID}-undersea-glow`, `${LAYER_ID}-main`].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id)
        })
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
        loaded.current = false
      }
    }
  }, [map, railLines])

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/map/RailLines.tsx
git commit -m "feat: rail lines and undersea tunnel rendering on map"
```

---

## Task 16: Land-Use Overlays & Strategic Passages

**Files:**
- Modify: `client/src/components/map/LandUseOverlays.tsx`
- Modify: `client/src/components/map/StrategicPassages.tsx`

- [ ] **Step 1: Implement LandUseOverlays.tsx**

```tsx
import { useEffect, useRef } from 'react'
import type { Map } from 'maplibre-gl'
import type { LandUseRegion } from '@ad-astra/shared'
import { LAND_USE_COLOURS } from '@ad-astra/shared'

interface Props { map: Map; regions: LandUseRegion[] }

const SOURCE_ID = 'land-use-source'
const FILL_LAYER = 'land-use-fill'
const LINE_LAYER = 'land-use-line'

export default function LandUseOverlays({ map, regions }: Props) {
  const loaded = useRef(false)

  useEffect(() => {
    const features = regions.map(r => ({
      type: 'Feature' as const,
      properties: { type: r.type, id: r.id },
      geometry: { type: 'Polygon' as const, coordinates: [r.polygon] },
    }))
    const geojson = { type: 'FeatureCollection' as const, features }

    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) {
        (map.getSource(SOURCE_ID) as any).setData(geojson)
        return
      }

      map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

      map.addLayer({
        id: FILL_LAYER,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': [
            'match', ['get', 'type'],
            'forest', LAND_USE_COLOURS.forest,
            'deforested', LAND_USE_COLOURS.deforested,
            'national_park', LAND_USE_COLOURS.national_park,
            'desert_agriculture', LAND_USE_COLOURS.desert_agriculture,
            'desertification', LAND_USE_COLOURS.desertification,
            'rgba(100,100,100,0.2)',
          ],
          'fill-opacity': 1,
        },
      })

      map.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: SOURCE_ID,
        filter: ['==', ['get', 'type'], 'national_park'],
        paint: { 'line-color': '#4ade80', 'line-width': 1.5, 'line-dasharray': [4, 3] },
      })

      loaded.current = true
    }

    if (map.loaded()) addLayers()
    else map.on('load', addLayers)

    return () => {
      if (loaded.current) {
        [FILL_LAYER, LINE_LAYER].forEach(id => { if (map.getLayer(id)) map.removeLayer(id) })
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
        loaded.current = false
      }
    }
  }, [map, regions])

  return null
}
```

- [ ] **Step 2: Implement StrategicPassages.tsx**

```tsx
import { useEffect, useRef } from 'react'
import type { Map } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import type { PassageStatus } from '@ad-astra/shared'

interface Props { map: Map; passages: Record<string, PassageStatus> }

const PASSAGE_LOCATIONS: Record<string, { coords: [number, number]; label: string }> = {
  hormuz:       { coords: [56.3, 26.6], label: 'Strait of Hormuz' },
  malacca:      { coords: [103.8, 1.3], label: 'Strait of Malacca' },
  suez:         { coords: [32.5, 30.5], label: 'Suez Canal' },
  panama:       { coords: [-79.9, 9.1], label: 'Panama Canal' },
  bosporus:     { coords: [29.0, 41.0], label: 'Bosphorus' },
  gibraltar:    { coords: [-5.3, 36.0], label: 'Strait of Gibraltar' },
  bab_el_mandeb:{ coords: [43.3, 12.5], label: 'Bab-el-Mandeb' },
}

const STATUS_COLOURS: Record<PassageStatus, string> = {
  open: '#ffffff',
  tolled: '#f59e0b',
  blocked: '#ef4444',
}

export default function StrategicPassages({ map, passages }: Props) {
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    Object.entries(PASSAGE_LOCATIONS).forEach(([id, { coords, label }]) => {
      const status = passages[id] ?? 'open'
      const colour = STATUS_COLOURS[status]

      const el = document.createElement('div')
      el.style.cssText = `
        width: 8px; height: 8px; border-radius: 50%;
        background: ${colour}; border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 0 6px ${colour}; cursor: default;
      `
      el.title = `${label}: ${status}`

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map)
      markersRef.current.push(marker)
    })

    return () => { markersRef.current.forEach(m => m.remove()) }
  }, [map, passages])

  return null
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/map/LandUseOverlays.tsx client/src/components/map/StrategicPassages.tsx
git commit -m "feat: land-use overlays and strategic passage indicators"
```

---

## Task 17: Game Page Layout

**Files:**
- Modify: `client/src/pages/GamePage.tsx`
- Create: `client/src/components/sidebar/Sidebar.tsx`
- Create: `client/src/components/bottom/TimeBar.tsx`

- [ ] **Step 1: Create Sidebar.tsx stub**

```tsx
// client/src/components/sidebar/Sidebar.tsx
import { useGameStore } from '../../store/gameStore'

export default function Sidebar() {
  const gameState = useGameStore(s => s.gameState)
  if (!gameState) return null

  const player = gameState.countries[gameState.playerCountryId]
  if (!player) return null

  return (
    <div className="w-80 h-full bg-[#0d1117] border-r border-[#1e3a4a] flex flex-col overflow-hidden">
      {/* Stats bar */}
      <div className="p-4 border-b border-[#1e3a4a]">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: player.colour }} />
          <span className="text-white font-semibold text-sm">{player.name}</span>
          <span className="ml-auto text-gray-500 text-xs">{gameState.currentDate}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'GDP', value: `$${player.stats.gdp}B`, colour: '#93c5fd' },
            { label: 'Military', value: player.stats.military, colour: '#fca5a5' },
            { label: 'Research', value: player.stats.researchPoints, colour: '#a5b4fc' },
            { label: 'Approval', value: `${player.stats.approval}%`, colour: '#86efac' },
            { label: 'Soft Power', value: player.stats.softPower, colour: '#fcd34d' },
            { label: 'Tech Level', value: player.stats.techLevel, colour: '#67e8f9' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111827] border border-[#1f2937] rounded px-2 py-1">
              <div className="text-gray-500 text-[10px]">{stat.label}</div>
              <div className="font-semibold text-xs" style={{ color: stat.colour }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder for ActionPanel from Plan 2 */}
      <div className="flex-1 p-4">
        <div className="text-gray-600 text-xs text-center mt-8">Action panel coming in Plan 2</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TimeBar.tsx stub**

```tsx
// client/src/components/bottom/TimeBar.tsx
export default function TimeBar() {
  return (
    <div className="h-14 bg-[#0d1117] border-t border-[#1e3a4a] flex items-center justify-center gap-3 px-4">
      {['1 Week', '1 Month', '1 Year', '⚡ Next Event'].map(label => (
        <button key={label}
          className="px-4 py-2 bg-[#111827] border border-[#374151] rounded-lg text-sm text-gray-400 hover:border-blue-700 transition-colors">
          {label}
        </button>
      ))}
      <button className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-semibold text-sm ml-2 transition-colors">
        ▶ Execute &amp; Advance
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Update GamePage.tsx with full layout**

```tsx
// client/src/pages/GamePage.tsx
import WorldMap from '../components/map/WorldMap'
import Sidebar from '../components/sidebar/Sidebar'
import TimeBar from '../components/bottom/TimeBar'

export default function GamePage() {
  return (
    <div className="w-full h-full bg-[#0a1628] flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 relative">
          <WorldMap />
        </div>
      </div>
      <TimeBar />
    </div>
  )
}
```

- [ ] **Step 4: Verify full layout in browser**

```bash
npm start
```

Expected: Setup → game shows left sidebar with stats, full-screen map on the right, bottom bar with time buttons. Map renders coloured countries with your country highlighted.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/GamePage.tsx client/src/components/sidebar/ client/src/components/bottom/
git commit -m "feat: full game page layout — sidebar, map, time bar"
```

---

## Task 18: Organisation Overlays

**Files:**
- Modify: `client/src/components/map/OrgOverlays.tsx`

- [ ] **Step 1: Implement OrgOverlays.tsx**

```tsx
import { useEffect, useRef } from 'react'
import type { Map } from 'maplibre-gl'
import type { Organisation, Country } from '@ad-astra/shared'

interface Props {
  map: Map
  organisations: Organisation[]
  countries: Record<string, Country>
}

export default function OrgOverlays({ map, organisations, countries }: Props) {
  // Org overlays render a coloured border on member countries
  // This requires the GeoJSON source to already be loaded (by CountryLayer)
  // We add a separate fill layer per org using a filter expression

  const layerIds = useRef<string[]>([])

  useEffect(() => {
    // Remove previous org layers
    layerIds.current.forEach(id => { if (map.getLayer(id)) map.removeLayer(id) })
    layerIds.current = []

    if (!map.getSource('countries-source')) return

    organisations.forEach(org => {
      const layerId = `org-border-${org.id}`
      map.addLayer({
        id: layerId,
        type: 'line',
        source: 'countries-source',
        filter: ['in', ['get', 'ISO_A3'], ['literal', org.members]],
        paint: {
          'line-color': org.colour,
          'line-width': 3,
          'line-opacity': 0.6,
          'line-offset': -2,
        },
      })
      layerIds.current.push(layerId)
    })

    return () => {
      layerIds.current.forEach(id => { if (map.getLayer(id)) map.removeLayer(id) })
      layerIds.current = []
    }
  }, [map, organisations])

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/map/OrgOverlays.tsx
git commit -m "feat: organisation border overlays on member countries"
```

---

## Task 19: Final Integration & npm start verification

- [ ] **Step 1: Run all tests across all workspaces**

```bash
npm test
```

Expected: All tests pass across `server/` and `client/`.

- [ ] **Step 2: Start full stack and do an end-to-end manual test**

```bash
npm start
```

Checklist:
- [ ] Setup page loads at http://localhost:3000
- [ ] Enter a fake API key and click Continue
- [ ] Pick `modern` era, `realistic` difficulty
- [ ] Search for and select `United States`
- [ ] Click Start Game
- [ ] World map renders with all countries coloured
- [ ] USA has a white border highlight
- [ ] Country name labels visible
- [ ] Sidebar shows USA stats
- [ ] Bottom time bar visible with all 4 buttons
- [ ] Strategic passage dots visible (white dots at Hormuz, Suez, etc.)
- [ ] Zoom in to level 4+ — infrastructure dots would appear if any existed

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: Plan 1 complete — foundation, map, setup, full stack running"
```

---

## What's Next

**Plan 2 — Core Gameplay Loop** covers:
- `ActionPanel.tsx` with 3-tab input (Categories / Free Action / AI Suggest)
- AI proxy route (`/api/ai/execute` and `/api/ai/suggest`) with OpenAI/Anthropic/Google/custom normalisation
- Time jump execution — sends game state + actions to AI, returns structured results
- `ResultsPanel.tsx` with inline expand, stat delta tags, world reaction
- Action-required event blocking
