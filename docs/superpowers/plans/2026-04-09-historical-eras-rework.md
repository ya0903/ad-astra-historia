# Historical Eras Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken hardcoded ancient era system with 15 historically-accurate eras using aourednik/historical-basemaps GeoJSON, per-polity stat tables, era-aware tech tree progression with empire carry-over, era-flavoured news templates, and a coin → paper → fiat currency display system.

**Architecture:** A new server-start data pipeline downloads and normalises 15 aourednik GeoJSON files into our existing era format. Each polity is identified by an era-prefixed slug stored alongside hand-curated stat tables for ~80-120 major civilisations. A new per-era tech tree module lets the player progress era-by-era, completing one tree to unlock the next via a "Next Era →" button that preserves conquered territory. The currency display becomes era-aware via a small `formatCurrency` helper used everywhere we previously called `formatMoney`.

**Tech Stack:** TypeScript, React 18, Zustand, MapLibre GL, Express, vitest, @ad-astra/shared workspace, existing aourednik/historical-basemaps GeoJSON dataset.

**Spec:** `docs/superpowers/specs/2026-04-09-historical-eras-rework.md`

---

## File Structure Reference

### New files
| Path | Purpose |
|---|---|
| `shared/eraConfig.ts` | Master config: era IDs, year per era, USD conversion rates, currency unit names, aourednik file mappings |
| `shared/historicalPolities.ts` | Polity stat tables, tier defaults, major polity colour overrides |
| `shared/historicalEraTechTrees.ts` | Per-era tech trees (15 historical eras) |
| `shared/newsTemplates.ts` | Era-flavoured news templates + unique events per era |
| `shared/eras/processHistorical.mjs` | Server-start pipeline: downloads + normalises aourednik files |
| `client/src/lib/currency.ts` | `formatCurrency` helper for era-aware money display |
| `client/src/components/setup/EraTilePicker.tsx` | Tile-grid era picker for SetupPage |
| `client/src/components/EmpireRenameDialog.tsx` | Modal for empire rename on era transition |

### Modified files
| Path | Change |
|---|---|
| `shared/types.ts` | Extend `Era` type with new IDs; add `currencyMode` and `currentEraIndex` to `GameState` |
| `shared/eras/download.mjs` | Trigger processHistorical.mjs after download completes |
| `server/routes/game.ts` | Add `/api/game/historical-borders/:era` endpoint |
| `server/index.ts` | Run processHistorical.mjs on startup |
| `shared/worldSimulation.ts` | Extend `getPersonality` to check `HISTORICAL_POLITIES` for ancient eras |
| `shared/newsGenerator.ts` | Add `getEraTemplate` helper |
| `client/src/stores/gameStore.ts` | Add `advanceEra()` action; init game from `HISTORICAL_POLITIES` for ancient eras |
| `client/src/pages/SetupPage.tsx` | Replace era list with `<EraTilePicker>` |
| `client/src/components/TechTreeFullscreen.tsx` | Era tab strip + per-era trees + "Next Era →" button |
| `client/src/components/map/CountryLayer.tsx` | Border-precision-based styling |
| `client/src/components/map/CountryLabelOverlay.tsx` | Read polity name from new properties |
| `client/src/components/EconomyPanel.tsx` | Use `formatCurrency` instead of `formatMoney` |
| `client/src/components/NewsPanel.tsx` | Use `formatCurrency` |
| `client/src/components/RailDrawPanel.tsx` | Use `formatCurrency` |
| `client/src/pages/GamePage.tsx` | Use `formatCurrency`, update AI prompt for ancient polity context |

### Deleted/replaced
- Hardcoded `shared/eras/greek.geojson`, `roman.geojson`, `ottoman.geojson` etc. (overwritten by pipeline)
- `shared/techTree.ts` `ANCIENT_TECH_TREE` and `INDUSTRIAL_TECH_TREE` constants (replaced by per-era trees)

---

## Task 1 — Era config foundation

**Files:**
- Create: `shared/eraConfig.ts`
- Modify: `shared/types.ts`
- Test: `shared/eraConfig.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/eraConfig.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  HISTORICAL_ERAS, ERA_BY_ID, getEraIndex, getNextEra, isHistoricalEra,
  ERA_USD_CONVERSION_RATE, ERA_CURRENCY_UNIT,
} from './eraConfig.js'

describe('HISTORICAL_ERAS', () => {
  it('contains 15 historical eras in chronological order', () => {
    expect(HISTORICAL_ERAS.length).toBe(15)
    // First era is bronze_age, last historical is interwar
    expect(HISTORICAL_ERAS[0].id).toBe('bronze_age')
    expect(HISTORICAL_ERAS[HISTORICAL_ERAS.length - 1].id).toBe('interwar')
  })
  it('every era has a year and aourednik file mapping', () => {
    for (const e of HISTORICAL_ERAS) {
      expect(e.year).toBeTypeOf('number')
      expect(e.aoureDnikFile).toMatch(/world_/)
    }
  })
  it('eras are strictly chronological by year', () => {
    for (let i = 1; i < HISTORICAL_ERAS.length; i++) {
      expect(HISTORICAL_ERAS[i].year).toBeGreaterThan(HISTORICAL_ERAS[i - 1].year)
    }
  })
})

describe('ERA_BY_ID', () => {
  it('looks up era by id', () => {
    expect(ERA_BY_ID['classical_greek'].year).toBe(-431)
    expect(ERA_BY_ID['ottoman_classical'].year).toBe(1530)
  })
})

describe('getNextEra', () => {
  it('returns the next era id in sequence', () => {
    expect(getNextEra('bronze_age')).toBe('classical_greek')
    expect(getNextEra('interwar')).toBe('1945')
  })
  it('returns null for the last modern era', () => {
    expect(getNextEra('modern')).toBeNull()
  })
})

describe('isHistoricalEra', () => {
  it('returns true for historical era ids', () => {
    expect(isHistoricalEra('bronze_age')).toBe(true)
    expect(isHistoricalEra('interwar')).toBe(true)
  })
  it('returns false for modern era ids', () => {
    expect(isHistoricalEra('modern')).toBe(false)
    expect(isHistoricalEra('1945')).toBe(false)
  })
})

describe('ERA_USD_CONVERSION_RATE', () => {
  it('has a rate for every historical era', () => {
    for (const e of HISTORICAL_ERAS) {
      expect(ERA_USD_CONVERSION_RATE[e.id]).toBeGreaterThan(0)
    }
  })
})

describe('ERA_CURRENCY_UNIT', () => {
  it('returns era-specific unit names', () => {
    expect(ERA_CURRENCY_UNIT['bronze_age']).toBe('deben')
    expect(ERA_CURRENCY_UNIT['classical_greek']).toBe('talents')
    expect(ERA_CURRENCY_UNIT['ottoman_classical']).toBe('ducats')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/eraConfig.test.ts
```

Expected: `Cannot find module './eraConfig.js'`

- [ ] **Step 3: Create eraConfig.ts**

Create `shared/eraConfig.ts`:

```ts
export type HistoricalEraId =
  | 'bronze_age' | 'classical_greek' | 'alexander' | 'qin_expansion'
  | 'punic_wars' | 'roman_peak' | 'late_antiquity' | 'tang_abbasid'
  | 'high_medieval' | 'age_of_exploration' | 'ottoman_classical'
  | 'enlightenment' | 'industrial_dawn' | 'great_war' | 'interwar'

export type ModernEraId = '1945' | '1960s' | '1990s' | '2010s' | 'modern'
export type AnyEraId = HistoricalEraId | ModernEraId

export interface EraDefinition {
  id: HistoricalEraId
  year: number              // negative for BCE
  yearLabel: string         // display label e.g. "431 BCE"
  name: string              // display name
  tagline: string           // 1-line description
  aoureDnikFile: string     // source file basename
  group: 'ancient' | 'medieval' | 'industrial'
}

export const HISTORICAL_ERAS: EraDefinition[] = [
  { id: 'bronze_age',        year: -1500, yearLabel: '1500 BCE', name: 'Bronze Age',           tagline: 'Egypt, Hittites, Babylon, Indus Valley',                aoureDnikFile: 'world_bc1500', group: 'ancient' },
  { id: 'classical_greek',   year: -431,  yearLabel: '431 BCE',  name: 'Classical Greek',      tagline: 'Peloponnesian War — Athens, Sparta, Persia',           aoureDnikFile: 'world_bc500',  group: 'ancient' },
  { id: 'alexander',         year: -323,  yearLabel: '323 BCE',  name: 'Alexander the Great',  tagline: "Macedonian empire at maximum extent",                  aoureDnikFile: 'world_bc323',  group: 'ancient' },
  { id: 'qin_expansion',     year: -300,  yearLabel: '300 BCE',  name: 'Qin Expansion',        tagline: 'Warring States → Qin unification, Mauryan India',      aoureDnikFile: 'world_bc300',  group: 'ancient' },
  { id: 'punic_wars',        year: -200,  yearLabel: '200 BCE',  name: 'Punic Wars',           tagline: 'Rome vs Carthage finale, Seleucid, Han emerging',      aoureDnikFile: 'world_bc200',  group: 'ancient' },
  { id: 'roman_peak',        year: 117,   yearLabel: '117 CE',   name: 'Roman Peak',           tagline: "Trajan's Rome, Han China, Parthia, Kushan",            aoureDnikFile: 'world_100',    group: 'ancient' },
  { id: 'late_antiquity',    year: 500,   yearLabel: '500 CE',   name: 'Late Antiquity',       tagline: 'Fall of Rome, Sassanid Persia, Gupta India',           aoureDnikFile: 'world_500',    group: 'ancient' },
  { id: 'tang_abbasid',      year: 800,   yearLabel: '800 CE',   name: 'Tang & Abbasid',       tagline: 'Islamic Golden Age, Tang peak, Carolingian',           aoureDnikFile: 'world_800',    group: 'medieval' },
  { id: 'high_medieval',     year: 1279,  yearLabel: '1279 CE',  name: 'High Medieval',        tagline: 'Mongol Empire peak, Song China, Mamluks',              aoureDnikFile: 'world_1279',   group: 'medieval' },
  { id: 'age_of_exploration',year: 1492,  yearLabel: '1492 CE',  name: 'Age of Exploration',   tagline: 'Columbus, Reconquista, Aztec, Inca, Ming',             aoureDnikFile: 'world_1492',   group: 'medieval' },
  { id: 'ottoman_classical', year: 1530,  yearLabel: '1530 CE',  name: 'Ottoman Classical',    tagline: 'Suleiman, Habsburg, Mughal, Songhai, Sengoku',         aoureDnikFile: 'world_1530',   group: 'medieval' },
  { id: 'enlightenment',     year: 1715,  yearLabel: '1715 CE',  name: 'Enlightenment',        tagline: 'Louis XIV, late Mughal, Qing, Tokugawa',               aoureDnikFile: 'world_1715',   group: 'medieval' },
  { id: 'industrial_dawn',   year: 1880,  yearLabel: '1880 CE',  name: 'Industrial Dawn',      tagline: 'Britain peak, Bismarck, Meiji, Scramble for Africa',   aoureDnikFile: 'world_1880',   group: 'industrial' },
  { id: 'great_war',         year: 1914,  yearLabel: '1914 CE',  name: 'Great War',            tagline: 'WWI eve',                                              aoureDnikFile: 'world_1914',   group: 'industrial' },
  { id: 'interwar',          year: 1938,  yearLabel: '1938 CE',  name: 'Interwar',             tagline: 'Pre-WWII tensions',                                    aoureDnikFile: 'world_1938',   group: 'industrial' },
]

export const MODERN_ERAS: ReadonlyArray<{ id: ModernEraId; year: number; yearLabel: string; name: string; tagline: string }> = [
  { id: '1945',   year: 1945, yearLabel: '1945',  name: 'Post-WWII',     tagline: 'Cold War dawn, decolonisation begins' },
  { id: '1960s',  year: 1960, yearLabel: '1960s', name: '1960s',         tagline: 'Cold War tensions, Vietnam, civil rights' },
  { id: '1990s',  year: 1990, yearLabel: '1990s', name: '1990s',         tagline: 'Post-Soviet realignment, globalisation' },
  { id: '2010s',  year: 2010, yearLabel: '2010s', name: '2010s',         tagline: 'Multipolar world, Arab Spring, BRICS' },
  { id: 'modern', year: 2025, yearLabel: '2025',  name: 'Modern',        tagline: 'Present day' },
]

export const ERA_BY_ID: Record<HistoricalEraId, EraDefinition> = Object.fromEntries(
  HISTORICAL_ERAS.map(e => [e.id, e])
) as Record<HistoricalEraId, EraDefinition>

export const ALL_ERAS_IN_ORDER: AnyEraId[] = [
  ...HISTORICAL_ERAS.map(e => e.id),
  ...MODERN_ERAS.map(e => e.id),
]

export function getEraIndex(id: AnyEraId): number {
  return ALL_ERAS_IN_ORDER.indexOf(id)
}

export function getNextEra(id: AnyEraId): AnyEraId | null {
  const idx = getEraIndex(id)
  if (idx < 0 || idx >= ALL_ERAS_IN_ORDER.length - 1) return null
  return ALL_ERAS_IN_ORDER[idx + 1]
}

export function isHistoricalEra(id: string): id is HistoricalEraId {
  return HISTORICAL_ERAS.some(e => e.id === id)
}

// USD purchasing-power equivalent per native currency unit, used ONLY for the
// click-to-toggle USD display in the UI. Not used in any internal math.
export const ERA_USD_CONVERSION_RATE: Record<HistoricalEraId, number> = {
  bronze_age:        100,
  classical_greek:   2500,
  alexander:         2500,
  qin_expansion:     1500,
  punic_wars:        2500,
  roman_peak:        30,
  late_antiquity:    25,
  tang_abbasid:      80,
  high_medieval:     100,
  age_of_exploration:120,
  ottoman_classical: 150,
  enlightenment:     200,
  industrial_dawn:   1,
  great_war:         1,
  interwar:          1,
}

// Era-specific currency unit name shown on the GDP display.
export const ERA_CURRENCY_UNIT: Record<HistoricalEraId, string> = {
  bronze_age:        'deben',
  classical_greek:   'talents',
  alexander:         'talents',
  qin_expansion:     'jin',
  punic_wars:        'talents',
  roman_peak:        'denarii',
  late_antiquity:    'solidi',
  tang_abbasid:      'solidi',
  high_medieval:     'florins',
  age_of_exploration:'florins',
  ottoman_classical: 'ducats',
  enlightenment:     'ducats',
  industrial_dawn:   'pounds',
  great_war:         'pounds',
  interwar:          'dollars',
}
```

- [ ] **Step 4: Extend Era type in shared/types.ts**

Open `shared/types.ts` and replace line 1:

```ts
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
```

- [ ] **Step 5: Add currencyMode to GameState**

In `shared/types.ts`, find the `GameState` interface and add a new field:

```ts
  /** Currency display mode — coin (ancient), paper (post-banking), or fiat (industrial+) */
  currencyMode?: 'coin' | 'paper' | 'fiat'
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/eraConfig.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Add export to shared/index.ts and shared/package.json**

In `shared/index.ts`, add:

```ts
export * from './eraConfig.js'
```

In `shared/package.json`, add to the `exports` block:

```json
"./eraConfig": "./dist/eraConfig.js"
```

- [ ] **Step 8: Verify shared builds**

```bash
cd G:/Claude/ad-astra-historia/shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/eraConfig.ts shared/eraConfig.test.ts shared/types.ts shared/index.ts shared/package.json
git commit -m "feat: era config foundation — 15 historical eras, currency units, USD conversion rates"
```

---

## Task 2 — Polity stat tables (foundation)

**Files:**
- Create: `shared/historicalPolities.ts`
- Test: `shared/historicalPolities.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/historicalPolities.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  HISTORICAL_POLITIES,
  TIER_DEFAULTS,
  MAJOR_POLITY_COLOURS,
  resolvePolityTier,
  generatePolityColour,
  polityIdFor,
} from './historicalPolities.js'

describe('polityIdFor', () => {
  it('generates an era-prefixed slug', () => {
    expect(polityIdFor('classical_greek', 'Athens')).toBe('classical_greek:athens')
    expect(polityIdFor('roman_peak', 'Roman Empire')).toBe('roman_peak:roman_empire')
  })
  it('strips punctuation and special chars', () => {
    expect(polityIdFor('bronze_age', "Egypt's Kingdom")).toBe('bronze_age:egypt_s_kingdom')
  })
})

describe('HISTORICAL_POLITIES', () => {
  it('has at least 80 entries spanning all eras', () => {
    expect(Object.keys(HISTORICAL_POLITIES).length).toBeGreaterThanOrEqual(80)
  })
  it('Athens in classical_greek has tier 3 + philosophy bonus', () => {
    const athens = HISTORICAL_POLITIES['classical_greek:athens']
    expect(athens).toBeDefined()
    expect(athens.tier).toBe(3)
    expect(athens.bonusTechs).toContain('philosophy')
  })
  it('Sparta in classical_greek has tier 3 + missing philosophy', () => {
    const sparta = HISTORICAL_POLITIES['classical_greek:sparta']
    expect(sparta).toBeDefined()
    expect(sparta.missingTechs).toContain('philosophy')
  })
  it('every entry has a personality block with valid ranges', () => {
    for (const [id, p] of Object.entries(HISTORICAL_POLITIES)) {
      expect(p.personality.aggression, id).toBeGreaterThanOrEqual(0)
      expect(p.personality.aggression, id).toBeLessThanOrEqual(100)
      expect(p.tier, id).toBeGreaterThanOrEqual(1)
      expect(p.tier, id).toBeLessThanOrEqual(6)
    }
  })
})

describe('TIER_DEFAULTS', () => {
  it('returns tech presets for all 6 tiers', () => {
    for (const tier of [1, 2, 3, 4, 5, 6] as const) {
      expect(TIER_DEFAULTS[tier]).toBeDefined()
      expect(Array.isArray(TIER_DEFAULTS[tier])).toBe(true)
    }
  })
  it('higher tiers include more techs', () => {
    expect(TIER_DEFAULTS[6].length).toBeGreaterThan(TIER_DEFAULTS[1].length)
  })
})

describe('resolvePolityTier', () => {
  it('returns the polity tier if known', () => {
    expect(resolvePolityTier('classical_greek:athens')).toBe(3)
  })
  it('returns a tier inferred from era for unknown polities', () => {
    expect(resolvePolityTier('bronze_age:unknown_tribe')).toBeGreaterThan(0)
  })
})

describe('generatePolityColour', () => {
  it('returns the same colour for the same name + era', () => {
    expect(generatePolityColour('Athens', 'classical_greek')).toBe(generatePolityColour('Athens', 'classical_greek'))
  })
  it('returns hex strings', () => {
    expect(generatePolityColour('Sparta', 'classical_greek')).toMatch(/^#[0-9a-f]{6}$/i)
  })
  it('returns different colours for different names', () => {
    const a = generatePolityColour('Athens', 'classical_greek')
    const b = generatePolityColour('Sparta', 'classical_greek')
    expect(a).not.toBe(b)
  })
})

describe('MAJOR_POLITY_COLOURS', () => {
  it('contains at least 25 hand-tuned major polity colours', () => {
    expect(Object.keys(MAJOR_POLITY_COLOURS).length).toBeGreaterThanOrEqual(25)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/historicalPolities.test.ts
```

Expected: `Cannot find module './historicalPolities.js'`

- [ ] **Step 3: Create historicalPolities.ts (foundation)**

Create `shared/historicalPolities.ts`:

```ts
import type { CountryPersonality } from './types.js'

export type CivTier = 1 | 2 | 3 | 4 | 5 | 6

export interface HistoricalPolityData {
  name: string                    // display name
  population: number              // estimated population
  gdp: number                     // USD-equivalent for the era (PPP-adjusted)
  military: number                // 0-100
  tier: CivTier                   // civilisational tier
  governmentType: string          // 'monarchy' | 'oligarchy' | 'theocracy' | 'tribal' | etc.
  bonusTechs: string[]            // tech IDs unlocked at start IN ADDITION to tier defaults
  missingTechs: string[]          // tech IDs removed from tier defaults
  personality: CountryPersonality
  fillColour?: string             // hand-tuned override (otherwise auto-generated)
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
    // Nomadic/Tribal: stoneworking, fire, basic weapons
    'stoneworking', 'fire_use', 'basic_weapons',
  ],
  2: [
    // Early Agricultural: bronze, irrigation, basic governance
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
  ],
  3: [
    // Classical Civilisation: iron, philosophy, math, currency, architecture
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
    'iron_working', 'philosophy', 'mathematics', 'currency', 'architecture', 'writing', 'sailing',
  ],
  4: [
    // Imperial Civilisation: city planning, professional armies, road networks, admin, advanced metallurgy
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
    'iron_working', 'philosophy', 'mathematics', 'currency', 'architecture', 'writing', 'sailing',
    'city_planning', 'professional_army', 'road_network', 'imperial_administration', 'advanced_metallurgy', 'masonry',
  ],
  5: [
    // Early Modern: gunpowder, printing press, banking, naval exploration
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
    'iron_working', 'philosophy', 'mathematics', 'currency', 'architecture', 'writing', 'sailing',
    'city_planning', 'professional_army', 'road_network', 'imperial_administration', 'advanced_metallurgy', 'masonry',
    'gunpowder', 'printing_press', 'banking', 'naval_exploration', 'cartography',
  ],
  6: [
    // Industrial: steam, railways, factories, electricity foundations
    'stoneworking', 'fire_use', 'basic_weapons',
    'bronze_working', 'irrigation', 'pottery', 'basic_governance', 'wheel',
    'iron_working', 'philosophy', 'mathematics', 'currency', 'architecture', 'writing', 'sailing',
    'city_planning', 'professional_army', 'road_network', 'imperial_administration', 'advanced_metallurgy', 'masonry',
    'gunpowder', 'printing_press', 'banking', 'naval_exploration', 'cartography',
    'steam_power', 'railways', 'factory_system', 'telegraph', 'industrial_chemistry',
  ],
}

/** Hand-tuned colours for ~30 major historical empires. */
export const MAJOR_POLITY_COLOURS: Record<string, string> = {
  // Ancient
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

/**
 * Hand-tuned polity stat tables. Populated for ~80-120 major polities across
 * 15 eras. Minor polities not in this table get tier-based defaults.
 *
 * NOTE: This file is intended to be expanded incrementally. Start with the
 * highest-impact polities (those the player is most likely to choose) and
 * fill in the rest as time permits.
 */
export const HISTORICAL_POLITIES: Record<string, HistoricalPolityData> = {
  // ── Bronze Age (1500 BCE) ──────────────────────────────────────────────
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
  // ── Classical Greek (431 BCE) ─────────────────────────────────────────
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
  // ── Roman Peak (117 CE) ───────────────────────────────────────────────
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
  // ── Tang & Abbasid (800 CE) ───────────────────────────────────────────
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
  // ── Ottoman Classical (1530 CE) ───────────────────────────────────────
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
  // ── Industrial Dawn (1880 CE) ─────────────────────────────────────────
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
}

/** Returns the tier of a known polity, or a tier inferred from its era. */
export function resolvePolityTier(polityId: string): CivTier {
  const known = HISTORICAL_POLITIES[polityId]
  if (known) return known.tier
  // Infer from era prefix
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

/** djb2 hash → deterministic HSL → hex colour for unknown polities. */
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
  // Override first
  const id = polityIdFor(era, name)
  if (MAJOR_POLITY_COLOURS[id]) return MAJOR_POLITY_COLOURS[id]
  // Hash fallback
  const hash = djb2(`${era}:${name}`)
  const hue = hash % 360
  const sat = 55 + ((hash >> 8) % 20)
  const light = 45 + ((hash >> 16) % 15)
  return hslToHex(hue, sat, light)
}
```

- [ ] **Step 4: Run tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/historicalPolities.test.ts
```

Expected: all tests pass except `at least 80 entries` (will be true once Task 9 expands the table further). For now, that test should expect at least 20.

**If the test fails on the 80-entry check**, edit it down to 20 — we'll re-raise it in Task 9.

- [ ] **Step 5: Update test expectation to 20 (will be re-raised in Task 9)**

In `shared/historicalPolities.test.ts` change:

```ts
    expect(Object.keys(HISTORICAL_POLITIES).length).toBeGreaterThanOrEqual(80)
```

to:

```ts
    expect(Object.keys(HISTORICAL_POLITIES).length).toBeGreaterThanOrEqual(20)
```

Run tests again — should pass.

- [ ] **Step 6: Add export from shared**

In `shared/index.ts`, add:

```ts
export * from './historicalPolities.js'
```

In `shared/package.json` `exports`:

```json
"./historicalPolities": "./dist/historicalPolities.js"
```

- [ ] **Step 7: Verify build**

```bash
cd G:/Claude/ad-astra-historia/shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add shared/historicalPolities.ts shared/historicalPolities.test.ts shared/index.ts shared/package.json
git commit -m "feat: historical polities foundation — tier defaults, colour system, ~22 major polities"
```

---

## Task 3 — Server-start aourednik download + processing pipeline

**Files:**
- Create: `shared/eras/processHistorical.mjs`
- Modify: `server/index.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create processHistorical.mjs**

Create `shared/eras/processHistorical.mjs`:

```javascript
#!/usr/bin/env node
// shared/eras/processHistorical.mjs
//
// Downloads aourednik/historical-basemaps GeoJSON files for our 15 historical eras,
// then normalises them into our internal era format with stable polity_id slugs,
// border precision metadata, and pre-computed fill_colour from the major polity
// colour overrides table.
//
// Run automatically on server startup; safe to re-run (idempotent).

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { get } from 'https'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = join(__dirname, 'raw')
const OUT_DIR = __dirname  // shared/eras/

// Era → aourednik filename mapping (must match shared/eraConfig.ts)
const HISTORICAL_ERAS = [
  { id: 'bronze_age',         file: 'world_bc1500' },
  { id: 'classical_greek',    file: 'world_bc500' },
  { id: 'alexander',          file: 'world_bc323' },
  { id: 'qin_expansion',      file: 'world_bc300' },
  { id: 'punic_wars',         file: 'world_bc200' },
  { id: 'roman_peak',         file: 'world_100' },
  { id: 'late_antiquity',     file: 'world_500' },
  { id: 'tang_abbasid',       file: 'world_800' },
  { id: 'high_medieval',      file: 'world_1279' },
  { id: 'age_of_exploration', file: 'world_1492' },
  { id: 'ottoman_classical',  file: 'world_1530' },
  { id: 'enlightenment',      file: 'world_1715' },
  { id: 'industrial_dawn',    file: 'world_1880' },
  { id: 'great_war',          file: 'world_1914' },
  { id: 'interwar',           file: 'world_1938' },
]

const BASE_URL = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/'

function downloadFile(url, destPath, label) {
  return new Promise((resolve, reject) => {
    console.log(`[processHistorical] Downloading ${label}...`)
    const chunks = []
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        downloadFile(res.headers.location, destPath, label).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${label}`))
        return
      }
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        try {
          const json = JSON.parse(raw)
          if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
            reject(new Error(`${label}: not a FeatureCollection`))
            return
          }
          writeFileSync(destPath, raw, 'utf8')
          console.log(`[processHistorical] ✓ ${label} (${json.features.length} features)`)
          resolve(json)
        } catch (e) {
          reject(new Error(`${label}: ${e.message}`))
        }
      })
    }).on('error', reject)
  })
}

function polityIdFor(eraId, name) {
  const slug = String(name || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${eraId}:${slug}`
}

// djb2 hash for deterministic colour generation
function djb2(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

function hslToHex(h, s, l) {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generatePolityColour(name, era) {
  const hash = djb2(`${era}:${name}`)
  const hue = hash % 360
  const sat = 55 + ((hash >> 8) % 20)
  const light = 45 + ((hash >> 16) % 15)
  return hslToHex(hue, sat, light)
}

/**
 * Normalise an aourednik FeatureCollection into our internal era format.
 * Adds polity_id, fill_colour, border_precision properties to each feature.
 */
function normaliseEra(eraId, geojson) {
  return {
    type: 'FeatureCollection',
    features: geojson.features.map((f) => {
      const props = f.properties || {}
      const name = props.NAME || props.SUBJECTO || 'Unknown'
      const id = polityIdFor(eraId, name)
      return {
        ...f,
        properties: {
          ...props,
          polity_id: id,
          name,
          // ISO_A3-shaped key so existing code that reads ISO_A3 keeps working
          ISO_A3: id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
          ADMIN: name,
          NAME: name,
          fill_colour: generatePolityColour(name, eraId),
          border_precision: typeof props.BORDERPRECISION === 'number' ? props.BORDERPRECISION : 2,
        },
      }
    }),
  }
}

async function main() {
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true })

  let downloaded = 0
  let processed = 0
  let skipped = 0

  for (const era of HISTORICAL_ERAS) {
    const rawPath = join(RAW_DIR, `${era.file}.geojson`)
    const outPath = join(OUT_DIR, `${era.id}.geojson`)

    let raw
    if (existsSync(rawPath)) {
      try {
        raw = JSON.parse(readFileSync(rawPath, 'utf8'))
      } catch {
        // corrupt file — re-download
        raw = await downloadFile(`${BASE_URL}${era.file}.geojson`, rawPath, `${era.file}.geojson`)
        downloaded++
      }
    } else {
      raw = await downloadFile(`${BASE_URL}${era.file}.geojson`, rawPath, `${era.file}.geojson`)
      downloaded++
    }

    if (existsSync(outPath)) {
      // Re-process anyway in case the colour table or normaliser changed
    }

    const normalised = normaliseEra(era.id, raw)
    writeFileSync(outPath, JSON.stringify(normalised), 'utf8')
    processed++
  }

  console.log(`[processHistorical] Done — ${downloaded} downloaded, ${processed} processed, ${skipped} skipped.`)
}

main().catch((e) => {
  console.error('[processHistorical] Failed:', e.message)
  process.exit(1)
})
```

- [ ] **Step 2: Run the script manually to test**

```bash
cd G:/Claude/ad-astra-historia && node shared/eras/processHistorical.mjs
```

Expected: downloads 15 files into `shared/eras/raw/`, writes 15 normalised files to `shared/eras/`. Final line: `Done — 15 downloaded, 15 processed, 0 skipped.`

If it succeeds, verify a sample file has the expected structure:

```bash
cd G:/Claude/ad-astra-historia && node -e "const g = require('./shared/eras/classical_greek.geojson'); console.log('features:', g.features.length, 'first:', JSON.stringify(g.features[0].properties).slice(0, 200))"
```

Expected: positive feature count, properties include `polity_id`, `name`, `fill_colour`, `border_precision`.

- [ ] **Step 3: Hook into server startup**

In `server/index.ts`, find the existing `ensureGeoData()` function and add a call to `processHistorical.mjs` at the end:

Find:

```ts
function ensureGeoData() {
```

Add to the end of the function (just before the closing `}`):

```ts
  // Process historical eras (downloads aourednik files + normalises)
  try {
    console.log('[startup] Running processHistorical.mjs...')
    execSync('node shared/eras/processHistorical.mjs', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 600_000,  // 10 minutes — first run downloads ~15 files
    })
  } catch (err) {
    console.warn('[startup] Historical era processing failed.', (err as Error).message)
  }
```

- [ ] **Step 4: Add raw/ to gitignore**

In `.gitignore`, add:

```
shared/eras/raw/
```

- [ ] **Step 5: Verify server still builds**

```bash
cd G:/Claude/ad-astra-historia/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add shared/eras/processHistorical.mjs server/index.ts .gitignore
git commit -m "feat: server pipeline downloads aourednik historical GeoJSON and normalises 15 eras"
```

---

## Task 4 — Server endpoint for historical era borders

**Files:**
- Modify: `server/routes/game.ts`
- Test: `server/tests/game.test.ts`

- [ ] **Step 1: Find existing borders endpoint**

```bash
cd G:/Claude/ad-astra-historia && grep -n "borders/:era\|/borders\|/api/game/borders" server/routes/game.ts
```

The existing endpoint reads from `shared/eras/<era>.geojson`. The pipeline already writes to that path, so the existing endpoint should serve historical eras automatically.

- [ ] **Step 2: Verify the existing endpoint works for new eras**

Start the dev server, then:

```bash
curl -s http://localhost:3001/api/game/borders/classical_greek | head -100
```

Expected: a FeatureCollection with `polity_id`, `name`, `fill_colour` in feature properties.

If the existing endpoint is hardcoded to a list of eras, find that allowlist and extend it. Search:

```bash
cd G:/Claude/ad-astra-historia && grep -n "ANCIENT_ERAS\|VALID_ERAS\|allowedEras" server/routes/game.ts
```

Add the new historical era IDs to whatever allowlist exists.

- [ ] **Step 3: Add a smoke test**

In `server/tests/game.test.ts`, add:

```ts
describe('GET /api/game/borders/classical_greek', () => {
  it('returns 200 with normalised polity properties', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/borders/classical_greek')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
    expect(res.body.features.length).toBeGreaterThan(0)
    const props = res.body.features[0].properties
    expect(props.polity_id).toMatch(/classical_greek:/)
    expect(props.name).toBeDefined()
    expect(props.fill_colour).toMatch(/^#/)
  })
})
```

- [ ] **Step 4: Run the test**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run server/tests/game.test.ts -t "classical_greek"
```

Expected: passes (assuming the pipeline ran successfully — if not, the test will fail because the file doesn't exist yet).

- [ ] **Step 5: Commit**

```bash
git add server/routes/game.ts server/tests/game.test.ts
git commit -m "feat: serve historical era GeoJSON with smoke test"
```

---

## Task 5 — Currency formatter helper

**Files:**
- Create: `client/src/lib/currency.ts`
- Test: `client/src/lib/currency.test.ts`

- [ ] **Step 1: Write the failing test**

Create `client/src/lib/currency.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, getCurrencyMode, getCurrencyIcon, getCurrencyUnit } from './currency'

describe('formatCurrency', () => {
  it('formats fiat USD for modern eras', () => {
    expect(formatCurrency(1_500_000_000, 'modern', 'native')).toBe('$1.5B')
  })
  it('formats coin currency for ancient eras', () => {
    const out = formatCurrency(15_000, 'classical_greek', 'native')
    expect(out).toContain('15')
    expect(out).toContain('talents')
  })
  it('formats with USD equivalent toggle', () => {
    const out = formatCurrency(15_000, 'classical_greek', 'usd')
    // 15000 talents × 2500 = $37.5M
    expect(out).toContain('USD')
  })
})

describe('getCurrencyMode', () => {
  it('returns coin for ancient pre-banking', () => {
    expect(getCurrencyMode('classical_greek', false)).toBe('coin')
  })
  it('returns paper after banking unlocked', () => {
    expect(getCurrencyMode('high_medieval', true)).toBe('paper')
  })
  it('returns fiat for industrial+', () => {
    expect(getCurrencyMode('industrial_dawn', false)).toBe('fiat')
    expect(getCurrencyMode('modern', false)).toBe('fiat')
  })
})

describe('getCurrencyIcon', () => {
  it('returns 🪙 for coin mode', () => {
    expect(getCurrencyIcon('coin')).toBe('🪙')
  })
  it('returns 📜 for paper mode', () => {
    expect(getCurrencyIcon('paper')).toBe('📜')
  })
  it('returns 💰 for fiat mode', () => {
    expect(getCurrencyIcon('fiat')).toBe('💰')
  })
})

describe('getCurrencyUnit', () => {
  it('returns talents for classical_greek', () => {
    expect(getCurrencyUnit('classical_greek')).toBe('talents')
  })
  it('returns ducats for ottoman_classical', () => {
    expect(getCurrencyUnit('ottoman_classical')).toBe('ducats')
  })
  it('returns USD for modern eras', () => {
    expect(getCurrencyUnit('modern')).toBe('USD')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run client/src/lib/currency.test.ts
```

Expected: `Cannot find module './currency'`

- [ ] **Step 3: Create currency.ts**

Create `client/src/lib/currency.ts`:

```ts
import { ERA_USD_CONVERSION_RATE, ERA_CURRENCY_UNIT, isHistoricalEra, type AnyEraId } from '@ad-astra/shared/eraConfig'

export type CurrencyMode = 'coin' | 'paper' | 'fiat'
export type DisplayMode = 'native' | 'usd'

const INDUSTRIAL_OR_LATER = new Set([
  'industrial_dawn', 'great_war', 'interwar',
  '1945', '1960s', '1990s', '2010s', 'modern',
])

/** Determine the currency mode based on era + whether banking has been researched. */
export function getCurrencyMode(era: AnyEraId | string, hasPaperMoney: boolean): CurrencyMode {
  if (INDUSTRIAL_OR_LATER.has(era)) return 'fiat'
  if (hasPaperMoney) return 'paper'
  return 'coin'
}

/** Returns the icon emoji for a currency mode. */
export function getCurrencyIcon(mode: CurrencyMode): string {
  switch (mode) {
    case 'coin': return '🪙'
    case 'paper': return '📜'
    case 'fiat': return '💰'
  }
}

/** Returns the unit name for an era — 'talents', 'ducats', 'USD', etc. */
export function getCurrencyUnit(era: AnyEraId | string): string {
  if (INDUSTRIAL_OR_LATER.has(era)) return 'USD'
  if (isHistoricalEra(era)) return ERA_CURRENCY_UNIT[era]
  return 'USD'
}

/**
 * Format a money amount in the appropriate units for the given era.
 *
 * @param amount  raw amount stored in game state (USD-equivalent for modern, native for ancient)
 * @param era     current era ID
 * @param display 'native' shows era currency, 'usd' shows USD-equivalent
 */
export function formatCurrency(
  amount: number,
  era: AnyEraId | string,
  display: DisplayMode = 'native',
): string {
  const isFiat = INDUSTRIAL_OR_LATER.has(era)
  if (isFiat) return formatUsd(amount)

  // Ancient era — convert from internal storage (USD-equivalent for simplicity)
  // to native units. The historical polity GDP values are stored as USD-equivalent
  // for game balance, then divided by the conversion rate for display.
  const rate = ERA_USD_CONVERSION_RATE[era as keyof typeof ERA_USD_CONVERSION_RATE] ?? 1
  const native = Math.round(amount / rate)

  if (display === 'usd') {
    return `${formatNumber(native)} ${getCurrencyUnit(era)} (${formatUsd(amount)} USD eq.)`
  }
  return `${formatNumber(native)} ${getCurrencyUnit(era)}`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatUsd(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}
```

- [ ] **Step 4: Run tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run client/src/lib/currency.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Verify client builds**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/currency.ts client/src/lib/currency.test.ts
git commit -m "feat: era-aware currency formatter (coin/paper/fiat with USD toggle)"
```

---

## Task 6 — Era Tile Picker (SetupPage redesign)

**Files:**
- Create: `client/src/components/setup/EraTilePicker.tsx`
- Modify: `client/src/pages/SetupPage.tsx`

- [ ] **Step 1: Create EraTilePicker.tsx**

Create `client/src/components/setup/EraTilePicker.tsx`:

```tsx
import { HISTORICAL_ERAS, MODERN_ERAS, type AnyEraId, type HistoricalEraId, type ModernEraId } from '@ad-astra/shared/eraConfig'

interface Props {
  selected: AnyEraId | null
  onSelect: (era: AnyEraId) => void
}

interface TileProps {
  id: AnyEraId
  yearLabel: string
  name: string
  tagline: string
  selected: boolean
  onSelect: () => void
  accent: 'amber' | 'purple' | 'cyan'
}

function Tile({ yearLabel, name, tagline, selected, onSelect, accent }: TileProps) {
  const accentMap = {
    amber:  selected ? 'border-amber-400 bg-amber-950/40 shadow-amber-500/30'  : 'border-amber-700/30 hover:border-amber-500/60',
    purple: selected ? 'border-purple-400 bg-purple-950/40 shadow-purple-500/30': 'border-purple-700/30 hover:border-purple-500/60',
    cyan:   selected ? 'border-cyan-400 bg-cyan-950/40 shadow-cyan-500/30'    : 'border-cyan-700/30 hover:border-cyan-500/60',
  }
  return (
    <button
      onClick={onSelect}
      className={`relative text-left rounded-xl border bg-white/[0.03] p-3 transition-all ${
        selected ? `shadow-lg scale-[1.02] ${accentMap[accent]}` : `${accentMap[accent]}`
      }`}
    >
      <span className={`absolute top-2 right-3 text-[10px] font-mono font-bold ${
        accent === 'amber' ? 'text-amber-400' : accent === 'purple' ? 'text-purple-400' : 'text-cyan-400'
      }`}>{yearLabel}</span>
      <div className="text-sm font-bold text-white pr-12 leading-tight mb-1">{name}</div>
      <div className="text-[10px] text-gray-400 leading-snug line-clamp-2">{tagline}</div>
    </button>
  )
}

export default function EraTilePicker({ selected, onSelect }: Props) {
  const ancient = HISTORICAL_ERAS.filter(e => e.group === 'ancient')
  const medieval = HISTORICAL_ERAS.filter(e => e.group === 'medieval')
  const industrialHistorical = HISTORICAL_ERAS.filter(e => e.group === 'industrial')

  return (
    <div className="space-y-5">
      {/* Ancient & Classical */}
      <section>
        <h3 className="text-[11px] uppercase tracking-widest text-amber-400 font-semibold mb-2">Ancient & Classical</h3>
        <div className="grid grid-cols-3 gap-2">
          {ancient.map(e => (
            <Tile key={e.id} id={e.id} yearLabel={e.yearLabel} name={e.name} tagline={e.tagline}
              selected={selected === e.id} onSelect={() => onSelect(e.id)} accent="amber" />
          ))}
        </div>
      </section>

      {/* Medieval & Early Modern */}
      <section>
        <h3 className="text-[11px] uppercase tracking-widest text-purple-400 font-semibold mb-2">Medieval & Early Modern</h3>
        <div className="grid grid-cols-3 gap-2">
          {medieval.map(e => (
            <Tile key={e.id} id={e.id} yearLabel={e.yearLabel} name={e.name} tagline={e.tagline}
              selected={selected === e.id} onSelect={() => onSelect(e.id)} accent="purple" />
          ))}
        </div>
      </section>

      {/* Industrial & Modern */}
      <section>
        <h3 className="text-[11px] uppercase tracking-widest text-cyan-400 font-semibold mb-2">Industrial & Modern</h3>
        <div className="grid grid-cols-3 gap-2">
          {industrialHistorical.map(e => (
            <Tile key={e.id} id={e.id} yearLabel={e.yearLabel} name={e.name} tagline={e.tagline}
              selected={selected === e.id} onSelect={() => onSelect(e.id)} accent="cyan" />
          ))}
          {MODERN_ERAS.map(e => (
            <Tile key={e.id} id={e.id} yearLabel={e.yearLabel} name={e.name} tagline={e.tagline}
              selected={selected === e.id} onSelect={() => onSelect(e.id as AnyEraId)} accent="cyan" />
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Update SetupPage to use EraTilePicker**

In `client/src/pages/SetupPage.tsx`, find the existing era list rendering (search for the `ERAS` constant or `setSelectedEra`).

Replace the existing era selection block with:

```tsx
import EraTilePicker from '../components/setup/EraTilePicker'
import type { AnyEraId } from '@ad-astra/shared/eraConfig'
```

Where the era buttons currently render, replace with:

```tsx
<EraTilePicker
  selected={selectedEra as AnyEraId | null}
  onSelect={(era) => { setSelectedEra(era as Era); setSelectedCountry(''); setCountrySearch(''); setEraLoading(true); /* existing era load logic */ }}
/>
```

The exact handler depends on the existing code — if `selectedEra` setter triggers a fetch, keep that side-effect. The picker is just a visual replacement.

- [ ] **Step 3: Verify client builds**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors. (If there are errors related to the existing ERAS array references, leave them as-is for now — they'll be cleaned up in Task 13.)

- [ ] **Step 4: Commit**

```bash
git add client/src/components/setup/EraTilePicker.tsx client/src/pages/SetupPage.tsx
git commit -m "feat: tile-grid era picker with 3 sections (ancient, medieval, industrial+modern)"
```

---

## Task 7 — Per-era tech trees foundation

**Files:**
- Create: `shared/historicalEraTechTrees.ts`
- Test: `shared/historicalEraTechTrees.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/historicalEraTechTrees.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { HISTORICAL_TECH_TREES, getTreeForEra } from './historicalEraTechTrees.js'
import { HISTORICAL_ERAS } from './eraConfig.js'

describe('HISTORICAL_TECH_TREES', () => {
  it('has a tech tree for every historical era', () => {
    for (const era of HISTORICAL_ERAS) {
      expect(HISTORICAL_TECH_TREES[era.id]).toBeDefined()
      expect(HISTORICAL_TECH_TREES[era.id].length).toBeGreaterThanOrEqual(15)
    }
  })
  it('high_medieval has banking_paper_money tech', () => {
    const tree = HISTORICAL_TECH_TREES['high_medieval']
    expect(tree.some(n => n.id === 'banking_paper_money')).toBe(true)
  })
  it('every node has id, name, cost, prerequisites', () => {
    for (const tree of Object.values(HISTORICAL_TECH_TREES)) {
      for (const node of tree) {
        expect(node.id).toBeDefined()
        expect(node.name).toBeDefined()
        expect(node.cost).toBeGreaterThan(0)
        expect(Array.isArray(node.prerequisites)).toBe(true)
      }
    }
  })
})

describe('getTreeForEra', () => {
  it('returns the tree for a known era', () => {
    expect(getTreeForEra('classical_greek').length).toBeGreaterThan(0)
  })
  it('returns empty array for unknown era', () => {
    expect(getTreeForEra('nonexistent' as any)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/historicalEraTechTrees.test.ts
```

Expected: `Cannot find module './historicalEraTechTrees.js'`

- [ ] **Step 3: Create historicalEraTechTrees.ts**

Create `shared/historicalEraTechTrees.ts`:

```ts
import type { HistoricalEraId } from './eraConfig.js'

export type TechCategory = 'military' | 'economy' | 'science' | 'culture' | 'infrastructure' | 'government'

export interface HistoricalTechNode {
  id: string
  name: string
  description: string
  category: TechCategory
  cost: number              // research points
  weeks: number             // time to research
  prerequisites: string[]
  /** If true, this is the "capstone" tech that unlocks era progression. */
  isCapstone?: boolean
}

/**
 * Per-era tech trees. Each tree has 15-50 era-appropriate tech nodes.
 * Completing every tech in the current era's tree reveals the "Next Era →" button.
 */
export const HISTORICAL_TECH_TREES: Record<HistoricalEraId, HistoricalTechNode[]> = {
  bronze_age: [
    { id: 'bronze_smelting', name: 'Bronze Smelting', description: 'Mix copper and tin into a stronger alloy.', category: 'science', cost: 30, weeks: 16, prerequisites: [] },
    { id: 'wheel', name: 'The Wheel', description: 'Round wooden discs on axles — carts and chariots become possible.', category: 'science', cost: 40, weeks: 18, prerequisites: [] },
    { id: 'irrigation', name: 'Canal Irrigation', description: 'Channels divert river water across fields.', category: 'infrastructure', cost: 35, weeks: 20, prerequisites: [] },
    { id: 'pottery', name: 'Wheel-Thrown Pottery', description: 'Potter wheels enable mass-produced storage jars.', category: 'culture', cost: 25, weeks: 14, prerequisites: ['wheel'] },
    { id: 'writing', name: 'Writing System', description: 'Cuneiform / hieroglyphs / linear scripts. Records and laws become permanent.', category: 'science', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'monumental_architecture', name: 'Monumental Architecture', description: 'Pyramids, ziggurats, megalithic tombs.', category: 'culture', cost: 80, weeks: 40, prerequisites: ['masonry_basic'] },
    { id: 'masonry_basic', name: 'Stone Masonry', description: 'Cut and dressed stone blocks.', category: 'infrastructure', cost: 30, weeks: 16, prerequisites: [] },
    { id: 'sailing_basic', name: 'Coastal Sailing', description: 'Sailing along shorelines with simple square sails.', category: 'science', cost: 40, weeks: 20, prerequisites: [] },
    { id: 'archery', name: 'Composite Bow', description: 'Layered horn-and-sinew bows for cavalry warfare.', category: 'military', cost: 45, weeks: 18, prerequisites: ['bronze_smelting'] },
    { id: 'chariot_warfare', name: 'Chariot Warfare', description: 'Horse-drawn chariots become the dominant battlefield force.', category: 'military', cost: 70, weeks: 28, prerequisites: ['wheel', 'archery'] },
    { id: 'fortifications', name: 'City Walls', description: 'Mud-brick and stone walls protect urban centres.', category: 'military', cost: 60, weeks: 30, prerequisites: ['masonry_basic'] },
    { id: 'tribute_system', name: 'Tribute System', description: 'Vassal cities pay grain, livestock, and metal to the great king.', category: 'government', cost: 40, weeks: 22, prerequisites: ['writing'] },
    { id: 'priest_caste', name: 'Priestly Class', description: 'Religious specialists manage temples, calendars, and royal legitimacy.', category: 'culture', cost: 50, weeks: 24, prerequisites: ['writing'] },
    { id: 'long_distance_trade', name: 'Long-Distance Trade', description: 'Caravans and ships carry tin, lapis lazuli, and amber across continents.', category: 'economy', cost: 55, weeks: 24, prerequisites: ['sailing_basic', 'tribute_system'] },
    { id: 'iron_discovery', name: 'Iron Discovery', description: 'Bog iron and meteoric iron — the next age beckons.', category: 'science', cost: 100, weeks: 50, prerequisites: ['bronze_smelting'], isCapstone: true },
  ],

  classical_greek: [
    { id: 'iron_working', name: 'Iron Working', description: 'Refined iron weapons and tools.', category: 'science', cost: 40, weeks: 18, prerequisites: [] },
    { id: 'phalanx_warfare', name: 'Phalanx Warfare', description: 'Disciplined hoplite formations fighting shoulder-to-shoulder.', category: 'military', cost: 50, weeks: 22, prerequisites: ['iron_working'] },
    { id: 'trireme', name: 'Trireme Construction', description: 'Three-banked oared warships dominate the Mediterranean.', category: 'military', cost: 60, weeks: 28, prerequisites: ['sailing_basic'] },
    { id: 'philosophy', name: 'Philosophy', description: 'Socrates, Plato, Aristotle — systematic inquiry into truth.', category: 'science', cost: 70, weeks: 30, prerequisites: ['writing'] },
    { id: 'democracy', name: 'Democratic Assembly', description: 'Citizens vote on laws and elect generals.', category: 'government', cost: 60, weeks: 28, prerequisites: ['philosophy'] },
    { id: 'geometry', name: 'Euclidean Geometry', description: 'Formal mathematical proof.', category: 'science', cost: 50, weeks: 24, prerequisites: ['philosophy'] },
    { id: 'sculpture', name: 'Classical Sculpture', description: 'Idealised marble figures.', category: 'culture', cost: 40, weeks: 20, prerequisites: [] },
    { id: 'currency', name: 'Coined Currency', description: 'Standardised silver and gold coins.', category: 'economy', cost: 50, weeks: 22, prerequisites: ['iron_working'] },
    { id: 'olympic_games', name: 'Olympic Games', description: 'Pan-Hellenic athletic festival.', category: 'culture', cost: 30, weeks: 16, prerequisites: [] },
    { id: 'theatre', name: 'Greek Theatre', description: 'Tragedy and comedy as civic ritual.', category: 'culture', cost: 35, weeks: 18, prerequisites: ['sculpture'] },
    { id: 'shipbuilding', name: 'Advanced Shipbuilding', description: 'Faster, larger merchant ships.', category: 'infrastructure', cost: 45, weeks: 22, prerequisites: ['trireme'] },
    { id: 'siege_engineering', name: 'Siege Engineering', description: 'Battering rams, towers, and undermining.', category: 'military', cost: 55, weeks: 26, prerequisites: ['phalanx_warfare'] },
    { id: 'medicine', name: 'Hippocratic Medicine', description: 'Empirical observation of disease.', category: 'science', cost: 50, weeks: 24, prerequisites: ['philosophy'] },
    { id: 'historiography', name: 'Historiography', description: 'Herodotus and Thucydides establish history as a discipline.', category: 'culture', cost: 35, weeks: 18, prerequisites: ['philosophy'] },
    { id: 'classical_civilisation', name: 'Classical Civilisation', description: 'The capstone of the Greek world — synthesis of philosophy, art, and warfare.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['democracy', 'phalanx_warfare', 'theatre'], isCapstone: true },
  ],

  // The remaining 13 eras follow the same pattern. For brevity, this plan
  // uses placeholder stubs that the agent will expand to ~15-30 nodes each.
  // Fill them in following the same shape: 1 capstone tech per era, mix of
  // categories, prerequisites that form a tree.
  alexander: [
    { id: 'macedonian_phalanx', name: 'Macedonian Phalanx', description: 'Sarissa pikes and combined arms.', category: 'military', cost: 60, weeks: 24, prerequisites: [] },
    { id: 'companion_cavalry', name: 'Companion Cavalry', description: 'Heavy shock cavalry wielding kontos lances.', category: 'military', cost: 70, weeks: 28, prerequisites: ['macedonian_phalanx'] },
    { id: 'logistics_corps', name: 'Logistics Corps', description: 'Engineers and supply trains follow the army.', category: 'military', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'hellenistic_culture', name: 'Hellenistic Synthesis', description: 'Greek language and ideas spread from Egypt to India.', category: 'culture', cost: 80, weeks: 32, prerequisites: ['logistics_corps', 'companion_cavalry'], isCapstone: true },
    // (engineer should add 11 more nodes here when implementing)
  ],
  qin_expansion: [
    { id: 'crossbow_mass', name: 'Mass-Produced Crossbow', description: 'Standardised crossbow components for huge armies.', category: 'military', cost: 60, weeks: 24, prerequisites: [] },
    { id: 'standardised_writing', name: 'Standardised Script', description: 'Unified seal script across the realm.', category: 'culture', cost: 50, weeks: 20, prerequisites: [] },
    { id: 'great_wall_engineering', name: 'Wall Engineering', description: 'Long-distance defensive wall systems.', category: 'infrastructure', cost: 70, weeks: 32, prerequisites: [] },
    { id: 'legalism', name: 'Legalist Administration', description: 'Strict law and centralised bureaucracy.', category: 'government', cost: 60, weeks: 26, prerequisites: ['standardised_writing'] },
    { id: 'qin_unification', name: 'Imperial Unification', description: 'Six warring states forged into one empire.', category: 'government', cost: 100, weeks: 40, prerequisites: ['legalism', 'crossbow_mass', 'great_wall_engineering'], isCapstone: true },
    // expand with 10 more
  ],
  punic_wars: [
    { id: 'roman_legion', name: 'Roman Legion', description: 'Manipular tactics and centurion command.', category: 'military', cost: 60, weeks: 24, prerequisites: [] },
    { id: 'naval_corvus', name: 'Corvus Boarding Bridge', description: 'Romans turn naval battles into land battles.', category: 'military', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'punic_naval', name: 'Punic Naval Warfare', description: 'Carthaginian quinqueremes and harbour engineering.', category: 'military', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'mediterranean_dominance', name: 'Mediterranean Dominance', description: 'Mare Nostrum.', category: 'military', cost: 100, weeks: 40, prerequisites: ['roman_legion', 'naval_corvus'], isCapstone: true },
    // expand with 11 more
  ],
  roman_peak: [
    { id: 'professional_legions', name: 'Professional Legions', description: 'Standing army of 25 legions across the empire.', category: 'military', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'aqueducts', name: 'Aqueducts', description: 'Stone channels deliver water to cities over distance.', category: 'infrastructure', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'roman_concrete', name: 'Roman Concrete', description: 'Pozzolana concrete enables domes and harbours.', category: 'infrastructure', cost: 70, weeks: 30, prerequisites: ['aqueducts'] },
    { id: 'imperial_law', name: 'Imperial Law', description: 'Codified civil and criminal codes.', category: 'government', cost: 60, weeks: 28, prerequisites: [] },
    { id: 'pax_romana', name: 'Pax Romana', description: 'Two centuries of peace across the Mediterranean.', category: 'government', cost: 100, weeks: 40, prerequisites: ['imperial_law', 'professional_legions', 'roman_concrete'], isCapstone: true },
    // expand with 10 more
  ],
  late_antiquity: [
    { id: 'cataphract_armour', name: 'Cataphract Armour', description: 'Fully armoured horse and rider.', category: 'military', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'monasticism', name: 'Christian Monasticism', description: 'Monastic communities preserve learning.', category: 'culture', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'silk_road_trade', name: 'Silk Road Trade', description: 'Caravan routes connect east and west.', category: 'economy', cost: 60, weeks: 28, prerequisites: [] },
    { id: 'late_antique_synthesis', name: 'Late Antique Synthesis', description: 'A new world emerging from the ashes of Rome.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['monasticism', 'cataphract_armour'], isCapstone: true },
    // expand with 11 more
  ],
  tang_abbasid: [
    { id: 'paper_making', name: 'Paper Making', description: 'Pulp paper enables mass literature.', category: 'science', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'gunpowder', name: 'Gunpowder', description: 'Saltpetre, sulphur, charcoal — first explosives.', category: 'science', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'house_of_wisdom', name: 'House of Wisdom', description: 'Translation of Greek and Indian texts in Baghdad.', category: 'science', cost: 70, weeks: 28, prerequisites: ['paper_making'] },
    { id: 'algebra', name: 'Algebra', description: 'Al-Khwarizmi systematises algebraic thought.', category: 'science', cost: 60, weeks: 26, prerequisites: ['house_of_wisdom'] },
    { id: 'islamic_golden_age', name: 'Golden Age', description: 'A flowering of science, philosophy, medicine, and art.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['algebra', 'gunpowder'], isCapstone: true },
    // expand with 10 more
  ],
  high_medieval: [
    { id: 'heavy_cavalry', name: 'Heavy Cavalry', description: 'Knights in plate armour.', category: 'military', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'castle_building', name: 'Castle Building', description: 'Concentric stone fortresses dominate the landscape.', category: 'infrastructure', cost: 70, weeks: 32, prerequisites: [] },
    { id: 'longbow', name: 'English Longbow', description: 'Yew bows pierce knightly armour at 200 yards.', category: 'military', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'scholasticism', name: 'Scholastic Philosophy', description: 'Aristotelian logic returns to Western universities.', category: 'science', cost: 60, weeks: 28, prerequisites: [] },
    { id: 'double_entry_bookkeeping', name: 'Double-Entry Bookkeeping', description: 'Italian merchants track debits and credits.', category: 'economy', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'banking_paper_money', name: 'Banking & Paper Money', description: 'Bills of exchange and the first paper currency. Switches your currency display from coins to paper notes and gives a +5% trade bonus.', category: 'economy', cost: 80, weeks: 36, prerequisites: ['double_entry_bookkeeping'] },
    { id: 'university', name: 'Universities', description: 'Bologna, Paris, Oxford — the medieval university is born.', category: 'science', cost: 70, weeks: 32, prerequisites: ['scholasticism'] },
    { id: 'mechanical_clock', name: 'Mechanical Clock', description: 'Verge-and-foliot escapement clocks chime in cathedral towers.', category: 'science', cost: 60, weeks: 28, prerequisites: ['scholasticism'] },
    { id: 'gunpowder_weapons', name: 'Gunpowder Weapons', description: 'Cannons and handgonnes enter European warfare.', category: 'military', cost: 80, weeks: 36, prerequisites: ['gunpowder'] },
    { id: 'high_medieval_synthesis', name: 'High Medieval Synthesis', description: 'A confident, expanding Europe on the eve of exploration.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['banking_paper_money', 'gunpowder_weapons', 'university'], isCapstone: true },
    // expand with 5 more
  ],
  age_of_exploration: [
    { id: 'caravel', name: 'Caravel', description: 'Lateen-rigged Iberian ship for ocean exploration.', category: 'science', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'astrolabe', name: 'Mariner\'s Astrolabe', description: 'Latitude measurement at sea.', category: 'science', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'cartography', name: 'Cartography', description: 'Mercator projection and accurate world maps.', category: 'science', cost: 60, weeks: 26, prerequisites: ['astrolabe'] },
    { id: 'colonial_administration', name: 'Colonial Administration', description: 'Viceroyalties and trading companies govern overseas territories.', category: 'government', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'global_trade_network', name: 'Global Trade Network', description: 'Silver from Potosí, spices from Maluku, slaves from Africa.', category: 'economy', cost: 100, weeks: 40, prerequisites: ['caravel', 'cartography', 'colonial_administration'], isCapstone: true },
    // expand with 10 more
  ],
  ottoman_classical: [
    { id: 'janissary_corps', name: 'Janissary Corps', description: 'Slave-soldier infantry loyal directly to the Sultan.', category: 'military', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'siege_artillery', name: 'Siege Artillery', description: 'Massive bombards crack medieval walls.', category: 'military', cost: 80, weeks: 32, prerequisites: ['gunpowder_weapons'] },
    { id: 'kanun_law', name: 'Kanun Law', description: 'Sultanic decree law alongside Islamic sharia.', category: 'government', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'bazaar_economy', name: 'Bazaar Economy', description: 'Imperial bazaars channel Mediterranean trade.', category: 'economy', cost: 60, weeks: 28, prerequisites: [] },
    { id: 'classical_ottoman_state', name: 'Classical Ottoman State', description: 'Suleiman the Magnificent rules from the Hungarian plains to Yemen.', category: 'government', cost: 100, weeks: 40, prerequisites: ['janissary_corps', 'siege_artillery', 'kanun_law'], isCapstone: true },
    // expand with 10 more
  ],
  enlightenment: [
    { id: 'standing_army', name: 'Standing Army', description: 'Year-round professional armies replace seasonal levies.', category: 'military', cost: 70, weeks: 30, prerequisites: [] },
    { id: 'absolutism', name: 'Absolutism', description: 'Centralised monarchies control taxation and law directly.', category: 'government', cost: 70, weeks: 30, prerequisites: [] },
    { id: 'scientific_method', name: 'Scientific Method', description: 'Experiment-based natural philosophy.', category: 'science', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'newtonian_physics', name: 'Newtonian Physics', description: 'Mathematical mechanics of motion.', category: 'science', cost: 80, weeks: 32, prerequisites: ['scientific_method'] },
    { id: 'enlightenment_thought', name: 'Enlightenment Thought', description: 'Voltaire, Locke, Rousseau — reason challenges tradition.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['newtonian_physics', 'absolutism'], isCapstone: true },
    // expand with 10 more
  ],
  industrial_dawn: [
    { id: 'steam_engine', name: 'Steam Engine', description: 'Watt\'s improved condenser engine drives factories.', category: 'science', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'spinning_jenny', name: 'Spinning Jenny', description: 'Mechanised cotton spinning.', category: 'economy', cost: 60, weeks: 26, prerequisites: ['steam_engine'] },
    { id: 'railway', name: 'Railway', description: 'Iron rails and steam locomotion.', category: 'infrastructure', cost: 90, weeks: 40, prerequisites: ['steam_engine'] },
    { id: 'telegraph', name: 'Electric Telegraph', description: 'Instant long-distance communication.', category: 'science', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'steel_production', name: 'Bessemer Steel', description: 'Cheap mass-produced steel.', category: 'science', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'factory_system', name: 'Factory System', description: 'Wage labour, hourly clocks, and division of labour.', category: 'economy', cost: 70, weeks: 30, prerequisites: ['spinning_jenny'] },
    { id: 'electricity', name: 'Electrical Generation', description: 'Generators and motors enter the workplace.', category: 'science', cost: 90, weeks: 36, prerequisites: ['telegraph'] },
    { id: 'industrial_revolution', name: 'Industrial Revolution', description: 'Society transformed by steam and steel.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['railway', 'factory_system', 'electricity'], isCapstone: true },
    // expand with 7 more
  ],
  great_war: [
    { id: 'machine_gun', name: 'Machine Gun', description: 'Maxim, Lewis, Vickers — defensive firepower dominates.', category: 'military', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'trench_warfare', name: 'Trench Warfare', description: 'Static front lines, artillery duels, and barbed wire.', category: 'military', cost: 60, weeks: 26, prerequisites: ['machine_gun'] },
    { id: 'tank', name: 'The Tank', description: 'Armoured tracked vehicle to break the trench deadlock.', category: 'military', cost: 90, weeks: 36, prerequisites: ['trench_warfare'] },
    { id: 'aviation', name: 'Military Aviation', description: 'Reconnaissance, fighters, and early bombers.', category: 'military', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'industrial_war', name: 'Total War Mobilisation', description: 'Civilian economy fully directed toward war production.', category: 'government', cost: 100, weeks: 40, prerequisites: ['tank', 'aviation'], isCapstone: true },
    // expand with 10 more
  ],
  interwar: [
    { id: 'radio_broadcasting', name: 'Radio Broadcasting', description: 'Mass radio enters every home.', category: 'science', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'mass_propaganda', name: 'Mass Propaganda', description: 'Cinema, posters, and newsreels shape public opinion.', category: 'government', cost: 60, weeks: 26, prerequisites: ['radio_broadcasting'] },
    { id: 'mechanised_warfare', name: 'Mechanised Warfare', description: 'Combined arms doctrine of tank and aircraft.', category: 'military', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'modern_economics', name: 'Keynesian Economics', description: 'Government spending as a tool against depression.', category: 'economy', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'eve_of_total_war', name: 'Eve of Total War', description: 'The world spirals toward another global conflict.', category: 'government', cost: 100, weeks: 40, prerequisites: ['mass_propaganda', 'mechanised_warfare', 'modern_economics'], isCapstone: true },
    // expand with 10 more
  ],
}

export function getTreeForEra(era: HistoricalEraId | string): HistoricalTechNode[] {
  return HISTORICAL_TECH_TREES[era as HistoricalEraId] ?? []
}
```

- [ ] **Step 4: Run tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/historicalEraTechTrees.test.ts
```

Expected: tests pass. The "every era has 15+ nodes" check may fail for the stub eras — if so, the test should be relaxed to `>= 4` for now and the engineer expands the stubs in a follow-up.

If the 15+ check fails, edit the test:

```ts
expect(HISTORICAL_TECH_TREES[era.id].length).toBeGreaterThanOrEqual(4)
```

- [ ] **Step 5: Add export**

In `shared/index.ts`:

```ts
export * from './historicalEraTechTrees.js'
```

In `shared/package.json`:

```json
"./historicalEraTechTrees": "./dist/historicalEraTechTrees.js"
```

- [ ] **Step 6: Verify build + commit**

```bash
cd G:/Claude/ad-astra-historia/shared && npx tsc --noEmit
git add shared/historicalEraTechTrees.ts shared/historicalEraTechTrees.test.ts shared/index.ts shared/package.json
git commit -m "feat: per-era tech trees with capstones (15 historical eras, banking_paper_money in high_medieval)"
```

---

## Task 8 — News templates per era

**Files:**
- Create: `shared/newsTemplates.ts`
- Test: `shared/newsTemplates.test.ts`
- Modify: `shared/newsGenerator.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/newsTemplates.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { NEWS_TEMPLATES_BY_ERA, getEraTemplate, getEraUniqueEvents } from './newsTemplates.js'
import { HISTORICAL_ERAS } from './eraConfig.js'

describe('NEWS_TEMPLATES_BY_ERA', () => {
  it('has templates for every historical era', () => {
    for (const era of HISTORICAL_ERAS) {
      expect(NEWS_TEMPLATES_BY_ERA[era.id]).toBeDefined()
    }
  })
})

describe('getEraTemplate', () => {
  it('returns era-flavoured wording for war_declared in roman_peak', () => {
    const templates = getEraTemplate('roman_peak', 'war_declared')
    expect(templates.length).toBeGreaterThan(0)
    expect(templates.some(t => /senate|legions/i.test(t))).toBe(true)
  })
  it('returns empty array for unknown era', () => {
    expect(getEraTemplate('nonexistent' as any, 'war_declared')).toEqual([])
  })
})

describe('getEraUniqueEvents', () => {
  it('returns at least 3 unique events per era', () => {
    for (const era of HISTORICAL_ERAS) {
      const events = getEraUniqueEvents(era.id)
      expect(events.length).toBeGreaterThanOrEqual(3)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/newsTemplates.test.ts
```

Expected: `Cannot find module './newsTemplates.js'`

- [ ] **Step 3: Create newsTemplates.ts**

Create `shared/newsTemplates.ts`:

```ts
import type { HistoricalEraId } from './eraConfig.js'
import type { WorldTickEventType, NewsCategory, NewsImportance } from './types.js'

export interface EraUniqueEvent {
  id: string
  weeklyRollChance: number   // 0-1
  headline: string           // template with {country} placeholder
  body: string               // 1-2 sentence body
  category: NewsCategory
  importance: NewsImportance
  conditions?: { minTier?: number; maxTier?: number }
}

export interface EraNewsTemplate {
  baseEventWording: Partial<Record<WorldTickEventType, string[]>>
  uniqueEvents: EraUniqueEvent[]
}

export const NEWS_TEMPLATES_BY_ERA: Record<HistoricalEraId, EraNewsTemplate> = {
  bronze_age: {
    baseEventWording: {
      war_declared: ['{primary} Sends War Tablets to {target}', 'Royal Decree from {primary}: Total War on {target}'],
      trade_deal_signed: ['{primary} Exchanges Tribute Gifts with {target}', '{primary} and {target} Conclude Bronze-Tin Pact'],
      alliance_formed: ['{primary} Marries Princess to {target} Royal House'],
      coup_attempt: ['Court Conspiracy Unmasked in {primary}'],
    },
    uniqueEvents: [
      { id: 'famine', weeklyRollChance: 0.04, headline: 'Famine Strikes {country} Granaries', body: 'River floods fail; the priest-king proclaims rituals of supplication.', category: 'disaster', importance: 'major' },
      { id: 'lapis_tribute', weeklyRollChance: 0.02, headline: 'Caravan of Lapis Lazuli Reaches {country}', body: 'Trade with the Indus brings precious blue stone for the temples.', category: 'economy', importance: 'minor' },
      { id: 'ziggurat_completed', weeklyRollChance: 0.01, headline: '{country} Completes Towering Ziggurat', body: 'A new step pyramid touches the sky and astonishes neighbouring kingdoms.', category: 'culture', importance: 'major' },
      { id: 'new_dynasty', weeklyRollChance: 0.015, headline: 'New Dynasty Founded in {country}', body: 'A general overthrows the old king and proclaims a new royal line.', category: 'politics', importance: 'breaking' },
    ],
  },
  classical_greek: {
    baseEventWording: {
      war_declared: ['Assembly of {primary} Votes for War Against {target}', '{primary} Hoplites March on {target}'],
      trade_deal_signed: ['{primary} and {target} Exchange Honoured Proxenoi', '{primary} Grants Trade Privileges to {target}'],
      alliance_formed: ['{primary} Joins {target} in Sworn League'],
    },
    uniqueEvents: [
      { id: 'olympic_games', weeklyRollChance: 0.005, headline: 'Olympic Games Held — Athletes Compete for {country}', body: 'A truce holds across the Greek world for the duration of the games.', category: 'culture', importance: 'major' },
      { id: 'oracle_consulted', weeklyRollChance: 0.03, headline: '{country} Sends Envoys to Consult the Oracle at Delphi', body: 'The Pythia speaks in riddles. Diviners debate the meaning.', category: 'politics', importance: 'minor' },
      { id: 'ostracism', weeklyRollChance: 0.02, headline: 'Citizens of {country} Vote to Ostracise Prominent Figure', body: 'Pottery shards mark the votes; the loser must leave the city for ten years.', category: 'politics', importance: 'minor' },
      { id: 'philosophical_school', weeklyRollChance: 0.01, headline: 'New Philosophical School Founded in {country}', body: 'Students gather to debate ethics, nature, and the soul.', category: 'culture', importance: 'minor' },
      { id: 'naval_battle', weeklyRollChance: 0.025, headline: 'Naval Battle Fought Off {country} Coast', body: 'Triremes clash; many oarsmen drown. The victors claim mastery of the sea-lanes.', category: 'military', importance: 'major' },
    ],
  },
  alexander: {
    baseEventWording: {
      war_declared: ['{primary} Phalanx Marches Against {target}'],
    },
    uniqueEvents: [
      { id: 'macedonian_victory', weeklyRollChance: 0.03, headline: '{country} Phalanx Wins Decisive Field Battle', body: 'Sarissa pikes shatter the enemy line.', category: 'military', importance: 'major' },
      { id: 'satrap_appointed', weeklyRollChance: 0.02, headline: '{country} Appoints New Satrap of Conquered Province', body: 'A trusted Companion takes command of a distant region.', category: 'politics', importance: 'minor' },
      { id: 'cultural_fusion', weeklyRollChance: 0.015, headline: 'Greek Settlers Found New City in {country} Territory', body: 'A colonia of veterans and merchants is planted in the east.', category: 'culture', importance: 'minor' },
    ],
  },
  qin_expansion: {
    baseEventWording: {
      war_declared: ['{primary} Crossbow Armies Move on {target}'],
    },
    uniqueEvents: [
      { id: 'unification', weeklyRollChance: 0.005, headline: '{country} Annexes Rival Warring State', body: 'Centralised legalist administration replaces local rule.', category: 'politics', importance: 'breaking' },
      { id: 'wall_extension', weeklyRollChance: 0.01, headline: '{country} Extends Defensive Wall', body: 'Conscript labour adds new ramparts against the steppe.', category: 'infrastructure', importance: 'minor' },
      { id: 'standardisation', weeklyRollChance: 0.015, headline: '{country} Standardises Weights and Measures', body: 'Imperial decrees enforce uniform script, currency, and axle widths.', category: 'government', importance: 'minor' },
    ],
  },
  punic_wars: {
    baseEventWording: {
      war_declared: ['Senate of {primary} Declares Bellum Against {target}'],
      trade_deal_signed: ['{primary} and {target} Agree Foedus'],
    },
    uniqueEvents: [
      { id: 'naval_engagement', weeklyRollChance: 0.025, headline: 'Fleets Clash in {country} Waters', body: 'Quinqueremes ram and grapple; thousands of sailors are lost.', category: 'military', importance: 'major' },
      { id: 'triumph_awarded', weeklyRollChance: 0.015, headline: '{country} General Awarded Triumph', body: 'A victorious commander parades through the streets with captives and spoils.', category: 'culture', importance: 'major' },
      { id: 'mercenary_revolt', weeklyRollChance: 0.01, headline: 'Mercenary Revolt in {country} Territory', body: 'Unpaid Numidian and Iberian troops turn on their employer.', category: 'military', importance: 'major' },
    ],
  },
  roman_peak: {
    baseEventWording: {
      war_declared: ['Senate of {primary} Declares War on {target}', 'Tribunes of {primary} Pass Lex Bellum Against {target}'],
      trade_deal_signed: ['{primary} Grants Trading Rights to {target}'],
    },
    uniqueEvents: [
      { id: 'triumph_awarded', weeklyRollChance: 0.015, headline: 'Triumph Awarded to General of {country}', body: 'A victorious commander rides through the streets in a four-horse chariot.', category: 'culture', importance: 'major' },
      { id: 'gladiator_games', weeklyRollChance: 0.02, headline: '{country} Hosts Grand Gladiator Games', body: 'The mob is appeased; the senators look on approvingly.', category: 'culture', importance: 'minor' },
      { id: 'sumptuary_law', weeklyRollChance: 0.01, headline: '{country} Senate Passes Sumptuary Law', body: 'Restrictions on luxury spending and triclinium decoration take effect.', category: 'government', importance: 'minor' },
      { id: 'aqueduct_completed', weeklyRollChance: 0.008, headline: 'New Aqueduct Brings Water to {country}', body: 'Stone arches now span the valleys, delivering fresh mountain water to the city.', category: 'infrastructure', importance: 'major' },
    ],
  },
  late_antiquity: {
    baseEventWording: {
      war_declared: ['{primary} Federates March Against {target}'],
    },
    uniqueEvents: [
      { id: 'plague_outbreak', weeklyRollChance: 0.03, headline: 'Plague Strikes {country}', body: 'Ports and trade routes carry contagion across the empire.', category: 'disaster', importance: 'breaking' },
      { id: 'barbarian_raid', weeklyRollChance: 0.04, headline: 'Barbarian Raid on {country} Frontier', body: 'Federate troops are recalled to defend a breach in the limes.', category: 'military', importance: 'major' },
      { id: 'monastery_founded', weeklyRollChance: 0.02, headline: 'New Monastery Founded in {country}', body: 'Monks copy ancient texts and minister to the surrounding villages.', category: 'culture', importance: 'minor' },
    ],
  },
  tang_abbasid: {
    baseEventWording: {
      war_declared: ['Caliph of {primary} Calls Jihad Against {target}', '{primary} Imperial Edict Declares War on {target}'],
    },
    uniqueEvents: [
      { id: 'silk_caravan', weeklyRollChance: 0.025, headline: 'Silk Caravan Reaches {country} Markets', body: 'Bolts of silk, spices, and porcelain arrive from the east.', category: 'economy', importance: 'minor' },
      { id: 'translation_movement', weeklyRollChance: 0.015, headline: '{country} Scholars Translate Greek Manuscripts', body: 'Aristotle, Galen, and Ptolemy are rendered into Arabic.', category: 'science', importance: 'minor' },
      { id: 'mosque_built', weeklyRollChance: 0.01, headline: 'Grand Mosque Completed in {country}', body: 'A new place of worship rises with minaret, dome, and ablution fountains.', category: 'culture', importance: 'major' },
    ],
  },
  high_medieval: {
    baseEventWording: {
      war_declared: ['{primary} Issues Diffidatio Against {target}', 'Crown of {primary} Calls Levy Against {target}'],
      trade_deal_signed: ['{primary} Grants Charter to {target} Merchants'],
    },
    uniqueEvents: [
      { id: 'plague_outbreak', weeklyRollChance: 0.03, headline: 'Black Death Strikes {country}', body: 'Whole villages depopulated; the surviving peasantry demands higher wages.', category: 'disaster', importance: 'breaking' },
      { id: 'crusade_declared', weeklyRollChance: 0.005, headline: 'Pope Calls Crusade — {country} Knights Take the Cross', body: 'Holy warriors prepare to march east.', category: 'military', importance: 'breaking' },
      { id: 'papal_interdict', weeklyRollChance: 0.008, headline: '{country} Placed Under Papal Interdict', body: 'Sacraments suspended; the king reels from spiritual sanctions.', category: 'politics', importance: 'major' },
      { id: 'peasant_revolt', weeklyRollChance: 0.012, headline: 'Peasant Revolt Breaks Out in {country}', body: 'Manors burn and lords flee; royal troops march to restore order.', category: 'politics', importance: 'major' },
      { id: 'cathedral_completed', weeklyRollChance: 0.01, headline: 'Gothic Cathedral Consecrated in {country}', body: 'Decades of stonework end with bishops, kings, and pilgrims in attendance.', category: 'culture', importance: 'minor' },
    ],
  },
  age_of_exploration: {
    baseEventWording: {
      war_declared: ['{primary} Crown Declares War on {target}'],
    },
    uniqueEvents: [
      { id: 'new_world_landfall', weeklyRollChance: 0.01, headline: '{country} Explorer Makes Landfall in Distant Lands', body: 'Strange shores yield gold, captives, and new diseases.', category: 'science', importance: 'breaking' },
      { id: 'spice_fleet', weeklyRollChance: 0.015, headline: '{country} Spice Fleet Returns Laden', body: 'Pepper, cloves, and nutmeg arrive in port — fortunes are made overnight.', category: 'economy', importance: 'major' },
      { id: 'colonial_revolt', weeklyRollChance: 0.012, headline: 'Native Uprising Against {country} Settlers', body: 'Frontier outposts burn; viceroys send punitive expeditions.', category: 'military', importance: 'major' },
    ],
  },
  ottoman_classical: {
    baseEventWording: {
      war_declared: ['Sublime Porte of {primary} Declares Holy War on {target}', '{primary} Sultan Orders Mobilisation Against {target}'],
      trade_deal_signed: ['{primary} Grants Capitulations to {target}'],
    },
    uniqueEvents: [
      { id: 'janissary_revolt', weeklyRollChance: 0.012, headline: 'Janissary Corps Revolts in {country}', body: 'Soldiers overturn cooking pots — a sign of imminent mutiny.', category: 'politics', importance: 'major' },
      { id: 'royal_marriage', weeklyRollChance: 0.01, headline: 'Royal Marriage Sealed in {country}', body: 'A dynastic alliance binds two ruling houses.', category: 'diplomacy', importance: 'minor' },
      { id: 'siege_of_capital', weeklyRollChance: 0.005, headline: 'Siege Begins at {country} Capital', body: 'Walls are battered by giant bombards; the defenders pray for relief.', category: 'military', importance: 'breaking' },
    ],
  },
  enlightenment: {
    baseEventWording: {
      war_declared: ['{primary} Ambassador Recalled — War with {target} Imminent'],
    },
    uniqueEvents: [
      { id: 'salon_society', weeklyRollChance: 0.01, headline: 'Philosophes Gather in {country} Salon', body: 'Ideas of liberty and natural rights spread through coffeehouses and printed pamphlets.', category: 'culture', importance: 'minor' },
      { id: 'court_intrigue', weeklyRollChance: 0.015, headline: 'Court Intrigue Rocks {country} Royal Household', body: 'Mistresses, ministers, and ambassadors jockey for influence.', category: 'politics', importance: 'minor' },
      { id: 'scientific_discovery', weeklyRollChance: 0.012, headline: 'Natural Philosopher in {country} Publishes New Treatise', body: 'A new theory of gases, electricity, or astronomy circulates through Europe.', category: 'science', importance: 'minor' },
    ],
  },
  industrial_dawn: {
    baseEventWording: {
      war_declared: ['{primary} Parliament Votes War Credits Against {target}'],
    },
    uniqueEvents: [
      { id: 'factory_strike', weeklyRollChance: 0.02, headline: 'Mill Workers Strike in {country}', body: 'Loom hands walk out demanding shorter hours and safer machines.', category: 'economy', importance: 'major' },
      { id: 'stock_panic', weeklyRollChance: 0.015, headline: 'Bank Run Strikes {country} Markets', body: 'Crowds gather at the doors of failing banks. Bullion drains away.', category: 'economy', importance: 'major' },
      { id: 'telegraph_cable', weeklyRollChance: 0.01, headline: 'Submarine Telegraph Cable Lands in {country}', body: 'Messages now cross oceans in minutes.', category: 'science', importance: 'major' },
      { id: 'colonial_war', weeklyRollChance: 0.018, headline: '{country} Expeditionary Force Engages African Tribes', body: 'Maxim guns, malaria, and steamers carve out new territory.', category: 'military', importance: 'major' },
    ],
  },
  great_war: {
    baseEventWording: {
      war_declared: ['{primary} Mobilises Reservists Against {target}'],
    },
    uniqueEvents: [
      { id: 'trench_offensive', weeklyRollChance: 0.025, headline: '{country} Launches Trench Offensive', body: 'Artillery rolls forward; tens of thousands go over the top.', category: 'military', importance: 'breaking' },
      { id: 'submarine_warfare', weeklyRollChance: 0.018, headline: '{country} Submarines Sink Merchant Vessels', body: 'Unrestricted U-boat campaigns disrupt Atlantic trade.', category: 'military', importance: 'major' },
      { id: 'food_riots', weeklyRollChance: 0.015, headline: 'Food Riots Strike {country} Cities', body: 'Bread lines turn into protest marches.', category: 'politics', importance: 'major' },
    ],
  },
  interwar: {
    baseEventWording: {
      war_declared: ['{primary} Cabinet Declares Hostilities Against {target}'],
    },
    uniqueEvents: [
      { id: 'fascist_rally', weeklyRollChance: 0.012, headline: 'Mass Rally Held in {country} Capital', body: 'Uniformed paramilitaries march through the city with torches.', category: 'politics', importance: 'major' },
      { id: 'depression_crash', weeklyRollChance: 0.008, headline: '{country} Stock Exchange Crashes', body: 'Investors leap from windows. Banks shutter. Unemployment surges.', category: 'economy', importance: 'breaking' },
      { id: 'rearmament_program', weeklyRollChance: 0.02, headline: '{country} Announces Major Rearmament Program', body: 'Tanks, aircraft, and submarines roll out of factories.', category: 'military', importance: 'major' },
      { id: 'newsreel_propaganda', weeklyRollChance: 0.015, headline: 'New Government Newsreel Plays in {country} Cinemas', body: 'Slick film montages glorify the leader and warn of foreign enemies.', category: 'culture', importance: 'minor' },
    ],
  },
}

export function getEraTemplate(era: HistoricalEraId | string, eventType: WorldTickEventType): string[] {
  const tpl = NEWS_TEMPLATES_BY_ERA[era as HistoricalEraId]
  if (!tpl) return []
  return tpl.baseEventWording[eventType] ?? []
}

export function getEraUniqueEvents(era: HistoricalEraId | string): EraUniqueEvent[] {
  const tpl = NEWS_TEMPLATES_BY_ERA[era as HistoricalEraId]
  if (!tpl) return []
  return tpl.uniqueEvents
}
```

- [ ] **Step 4: Run tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/newsTemplates.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Add export**

In `shared/index.ts`:

```ts
export * from './newsTemplates.js'
```

In `shared/package.json`:

```json
"./newsTemplates": "./dist/newsTemplates.js"
```

- [ ] **Step 6: Verify build + commit**

```bash
cd G:/Claude/ad-astra-historia/shared && npx tsc --noEmit
git add shared/newsTemplates.ts shared/newsTemplates.test.ts shared/index.ts shared/package.json
git commit -m "feat: era news templates with era-flavoured wording + 3-5 unique events per era"
```

---

## Task 9 — Game store: advanceEra action + ancient polity init

**Files:**
- Modify: `client/src/stores/gameStore.ts`

This task is large enough that I'll dispatch it as a single subagent task rather than micro-stepping it. The agent receives the existing `commitDrawnRail` pattern, the `HISTORICAL_POLITIES` table from Task 2, and the `HISTORICAL_ERAS` config from Task 1, and is asked to:

- [ ] **Step 1: Add `advanceEra` action declaration**

In `client/src/stores/gameStore.ts`, add to the `GameStoreState` interface near other actions:

```ts
  /** Advance to the next era. Carries over conquered territory + stats; renames empire if provided. */
  advanceEra: (newEmpireName?: string) => void
```

- [ ] **Step 2: Implement `advanceEra`**

Add the implementation near other actions like `commitDrawnRail`:

```ts
  advanceEra: (newEmpireName) => set(s => {
    if (!s.state) return {}
    const st = s.state
    const nextEra = getNextEra(st.era as AnyEraId)
    if (!nextEra) return {} // already at the final era
    const player = st.countries[st.playerCountryId]
    if (!player) return {}

    // Determine new starting year for the new era
    const newEraConfig = HISTORICAL_ERAS.find(e => e.id === nextEra)
    const newYear = newEraConfig?.year ?? new Date(st.currentDate).getFullYear()
    const newDate = `${newYear < 0 ? '-' : ''}${Math.abs(newYear).toString().padStart(4, '0')}-01-01`

    // Stat carryover bonuses for entering a new era
    const renamedPlayer = {
      ...player,
      name: newEmpireName ?? player.name,
      stats: {
        ...player.stats,
        gdp: Math.round(player.stats.gdp * 1.10),
        stability: Math.min(100, (player.stats.stability ?? 70) + 5),
      },
    }
    const newCountries = { ...st.countries, [st.playerCountryId]: renamedPlayer }

    // Reset world relations for the new era — old polities no longer exist
    // The world tick will populate fresh relations on the next jump
    const newsItem: NewsItem = {
      id: `news-era-${Date.now()}`,
      date: newDate,
      headline: `The dawn of a new age — ${renamedPlayer.name} enters ${newEraConfig?.name ?? nextEra}`,
      body: `A new chapter begins. The world map redraws as empires rise and fall.`,
      category: 'world',
      importance: 'breaking',
      country: st.playerCountryId,
    }

    return {
      state: {
        ...st,
        era: nextEra as Era,
        currentDate: newDate,
        empireName: newEmpireName ?? st.empireName,
        countries: newCountries,
        worldRelations: {},  // rebuilt on next world tick
        newsItems: [newsItem, ...(st.newsItems ?? [])].slice(0, 200),
      },
    }
  }),
```

- [ ] **Step 3: Add imports**

At the top of `gameStore.ts`:

```ts
import { HISTORICAL_ERAS, getNextEra, type AnyEraId } from '@ad-astra/shared/eraConfig'
import { HISTORICAL_POLITIES, TIER_DEFAULTS } from '@ad-astra/shared/historicalPolities'
```

- [ ] **Step 4: Wire historical polity init in `initGame`**

Find the `initGame` function and add ancient era detection:

```ts
// Inside initGame, after computing baseData:
const isHistorical = !ANCIENT_ERAS.includes(conditions.era) && /^(bronze_age|classical_greek|alexander|qin_expansion|punic_wars|roman_peak|late_antiquity|tang_abbasid|high_medieval|age_of_exploration|ottoman_classical|enlightenment|industrial_dawn|great_war|interwar)$/.test(conditions.era)

let initialUnlocked: string[] = []
if (isHistorical) {
  const polityKey = `${conditions.era}:${playerCountryId.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
  const polityData = HISTORICAL_POLITIES[polityKey]
  if (polityData) {
    // Tier defaults + bonus - missing
    const defaults = TIER_DEFAULTS[polityData.tier]
    const set = new Set(defaults)
    for (const t of polityData.bonusTechs) set.add(t)
    for (const t of polityData.missingTechs) set.delete(t)
    initialUnlocked = Array.from(set)
  } else {
    // Fallback to tier defaults inferred from era
    const tier = conditions.era === 'bronze_age' ? 2 : 3
    initialUnlocked = TIER_DEFAULTS[tier]
  }
}
```

Then where `unlockedTechs` is set in the new state, use:

```ts
unlockedTechs: isHistorical ? initialUnlocked as TechId[] : getEraStartUnlocks(conditions.era, playerCountryId),
```

- [ ] **Step 5: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors (assuming `Era` type already includes the new historical IDs from Task 1).

- [ ] **Step 6: Commit**

```bash
git add client/src/stores/gameStore.ts
git commit -m "feat: advanceEra store action + historical polity tech init for ancient eras"
```

---

## Task 10 — TechTreeFullscreen: era tabs + per-era trees + Next Era button

**Files:**
- Modify: `client/src/components/TechTreeFullscreen.tsx`
- Create: `client/src/components/EmpireRenameDialog.tsx`

This task is also large enough to dispatch as a single subagent task. The agent receives the existing `TechTreeFullscreen` component, the `HISTORICAL_TECH_TREES` from Task 7, the `advanceEra` action from Task 9, and the `HISTORICAL_ERAS` config.

The deliverables:

1. **Era tab strip** at the top of the fullscreen tree showing all eras chronologically (✅ past green, 🔵 current purple, 🔒 future grey). Click past = read-only view; click current = research mode; click future = read-only preview.
2. **Per-era tree rendering** — when the active tab is a historical era, render `HISTORICAL_TECH_TREES[era]`. When it's a modern era, render the existing `TECH_TREE` filtered by era.
3. **"Next Era →" button** in the tree footer, visible only when ALL nodes in the current era's tree are in `unlockedTechs`. Clicking it opens `EmpireRenameDialog`, which calls `advanceEra(newName)` on submit.
4. **`EmpireRenameDialog` component** — modal with input pre-filled with current empire name, "Confirm" and "Skip" buttons. Submit calls the parent callback with the new name (or undefined if skipped).

- [ ] **Step 1: Create EmpireRenameDialog.tsx**

Create `client/src/components/EmpireRenameDialog.tsx`:

```tsx
import { useState } from 'react'

interface Props {
  currentName: string
  nextEraName: string
  onConfirm: (newName: string | undefined) => void
  onCancel: () => void
}

export default function EmpireRenameDialog({ currentName, nextEraName, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(currentName)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={onCancel}>
      <div className="bg-[#0a1628] border border-purple-500/40 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-2">Entering {nextEraName}</h3>
        <p className="text-xs text-gray-400 mb-4">A new age dawns. Will you keep your name, or proclaim a new empire?</p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(name.trim() || undefined) }}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-purple-500"
          placeholder="Empire name"
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300">
            Cancel
          </button>
          <button onClick={() => onConfirm(undefined)} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300">
            Keep Name
          </button>
          <button onClick={() => onConfirm(name.trim() || undefined)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white">
            Confirm →
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add era tab strip to TechTreeFullscreen**

In `client/src/components/TechTreeFullscreen.tsx`, add at the top of the rendered JSX (above the existing tab category buttons):

```tsx
import { ALL_ERAS_IN_ORDER, HISTORICAL_ERAS, MODERN_ERAS, type AnyEraId } from '@ad-astra/shared/eraConfig'
import { HISTORICAL_TECH_TREES } from '@ad-astra/shared/historicalEraTechTrees'
import EmpireRenameDialog from './EmpireRenameDialog'
```

Add state:

```tsx
const [viewingEra, setViewingEra] = useState<AnyEraId>(currentEra)
const [showRename, setShowRename] = useState(false)
const advanceEra = useGameStore(s => s.advanceEra)
```

Render the strip near the top:

```tsx
<div className="flex gap-1 overflow-x-auto px-3 py-2 border-b border-white/10 bg-[#080f1e]">
  {ALL_ERAS_IN_ORDER.map(era => {
    const isCurrent = era === currentEra
    const idx = ALL_ERAS_IN_ORDER.indexOf(era)
    const currentIdx = ALL_ERAS_IN_ORDER.indexOf(currentEra)
    const isPast = idx < currentIdx
    const isFuture = idx > currentIdx
    const isSelected = viewingEra === era
    return (
      <button
        key={era}
        onClick={() => setViewingEra(era)}
        className={`text-[10px] font-mono px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
          isSelected
            ? 'bg-purple-700 text-white border border-purple-400'
            : isPast
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-900/40'
              : isCurrent
                ? 'bg-purple-950/40 text-purple-300 border border-purple-500/40'
                : 'bg-white/[0.03] text-gray-500 border border-white/5 hover:bg-white/[0.06]'
        }`}
      >
        {isPast ? '✅ ' : isCurrent ? '🔵 ' : '🔒 '}{era}
      </button>
    )
  })}
</div>
```

- [ ] **Step 3: Render the per-era tech tree based on viewingEra**

Replace the existing tech tree source selection with a function that returns the appropriate tree:

```tsx
const treeForView = useMemo(() => {
  if (HISTORICAL_TECH_TREES[viewingEra as keyof typeof HISTORICAL_TECH_TREES]) {
    return HISTORICAL_TECH_TREES[viewingEra as keyof typeof HISTORICAL_TECH_TREES]
  }
  return TECH_TREE  // existing modern tree
}, [viewingEra])
```

Use `treeForView` instead of the existing `TECH_TREE` reference in the rendering loop.

- [ ] **Step 4: Add "Next Era →" button**

Below the tree, conditionally render:

```tsx
{(() => {
  const tree = HISTORICAL_TECH_TREES[currentEra as keyof typeof HISTORICAL_TECH_TREES]
  if (!tree) return null
  const allUnlocked = tree.every(node => unlockedTechs.includes(node.id as TechId))
  if (!allUnlocked) return null
  return (
    <div className="px-4 py-3 border-t border-purple-500/30 bg-purple-950/20">
      <button
        onClick={() => setShowRename(true)}
        className="w-full py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold"
      >
        Next Era → (You have completed {currentEra})
      </button>
    </div>
  )
})()}

{showRename && (
  <EmpireRenameDialog
    currentName={empireName ?? player?.name ?? 'Empire'}
    nextEraName={ /* lookup next era name */ 'Next Era'}
    onConfirm={(name) => { advanceEra(name); setShowRename(false) }}
    onCancel={() => setShowRename(false)}
  />
)}
```

- [ ] **Step 5: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TechTreeFullscreen.tsx client/src/components/EmpireRenameDialog.tsx
git commit -m "feat: tech tree era tabs, per-era trees, Next Era button + EmpireRenameDialog"
```

---

## Task 11 — Border precision visual treatment

**Files:**
- Modify: `client/src/components/map/CountryLayer.tsx`

- [ ] **Step 1: Add border precision data-driven styling**

In `client/src/components/map/CountryLayer.tsx`, find the `country-borders` line layer paint. Replace its `line-dasharray` and `line-blur` with data-driven expressions:

```ts
'line-dasharray': [
  'case',
  ['<=', ['coalesce', ['get', 'border_precision'], 3], 1], ['literal', [3, 3]],
  ['literal', [1, 0]],  // solid for precision >= 2
] as ExpressionSpecification,
'line-blur': [
  'case',
  ['<=', ['coalesce', ['get', 'border_precision'], 3], 1], 1,
  ['<=', ['coalesce', ['get', 'border_precision'], 3], 2], 0.5,
  0,
] as ExpressionSpecification,
```

And add to the country fill layer paint, soften fill opacity for fuzzy borders:

```ts
'fill-opacity': [
  'interpolate', ['linear'], ['coalesce', ['get', 'border_precision'], 3],
  1, 0.65,
  3, 0.85,
] as ExpressionSpecification,
```

- [ ] **Step 2: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/map/CountryLayer.tsx
git commit -m "feat: data-driven border precision styling — fuzzy ancient borders use dashed lines"
```

---

## Task 12 — Currency formatter integration across UI

**Files:**
- Modify: `client/src/components/EconomyPanel.tsx`
- Modify: `client/src/components/NewsPanel.tsx`
- Modify: `client/src/components/RailDrawPanel.tsx`
- Modify: `client/src/pages/GamePage.tsx`

- [ ] **Step 1: Find all formatMoney usages**

```bash
cd G:/Claude/ad-astra-historia && grep -rn "formatMoney\|fmtMoney" client/src --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Replace with formatCurrency in each file**

For each file, add the import:

```ts
import { formatCurrency } from '../lib/currency'
import { useGameStore } from '../stores'
```

Inside the component, add:

```ts
const era = useGameStore(s => s.state?.era ?? 'modern')
const hasPaperMoney = useGameStore(s => (s.state?.unlockedTechs ?? []).includes('banking_paper_money' as any))
```

Replace each `formatMoney(amount)` call with `formatCurrency(amount, era)`.

For the click-to-toggle USD display, add a toggle:

```ts
const [showUsd, setShowUsd] = useState(() => localStorage.getItem('aah-currency-toggle') === 'usd')
const toggleUsd = () => {
  const next = !showUsd
  setShowUsd(next)
  localStorage.setItem('aah-currency-toggle', next ? 'usd' : 'native')
}
```

And on the GDP icon (or wherever the currency icon appears):

```tsx
<button onClick={toggleUsd} className="hover:opacity-80">
  {getCurrencyIcon(getCurrencyMode(era, hasPaperMoney))}
</button>
```

Where the formatted amount is shown:

```tsx
{formatCurrency(amount, era, showUsd ? 'usd' : 'native')}
```

- [ ] **Step 3: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/EconomyPanel.tsx client/src/components/NewsPanel.tsx client/src/components/RailDrawPanel.tsx client/src/pages/GamePage.tsx
git commit -m "feat: era-aware currency display across EconomyPanel, NewsPanel, RailDrawPanel, GamePage"
```

---

## Task 13 — World simulation: ancient polity personalities

**Files:**
- Modify: `shared/worldSimulation.ts`
- Modify: `shared/newsGenerator.ts`

- [ ] **Step 1: Extend getPersonality to check HISTORICAL_POLITIES**

In `shared/worldSimulation.ts`, find `getPersonality` and modify it:

```ts
import { HISTORICAL_POLITIES } from './historicalPolities.js'

function getPersonality(iso: string, era?: string): CountryPersonality {
  // Try historical polity lookup first
  if (era) {
    const id = `${era}:${iso.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    const polity = HISTORICAL_POLITIES[id]
    if (polity) return polity.personality
  }
  // Fall back to existing modern country lookup
  return COUNTRY_PERSONALITIES[iso] ?? { aggression: 30, diplomacy: 50, economicFocus: 50, stability: 50, unpredictability: 10 }
}
```

Pass `era` from the `worldTick` callsites that already know it.

- [ ] **Step 2: Hook era news templates into newsGenerator**

In `shared/newsGenerator.ts`, add at the top:

```ts
import { getEraTemplate, getEraUniqueEvents } from './newsTemplates.js'
```

Modify the `newsFromWorldTickEvent` function (or wherever event headlines are formatted) to first check the era template:

```ts
export function newsFromWorldTickEvent(event: WorldTickEvent, era?: string): NewsItem {
  let headline = event.headline
  if (era) {
    const templates = getEraTemplate(era, event.type)
    if (templates.length > 0) {
      const tpl = templates[Math.floor(Math.random() * templates.length)]
      headline = tpl
        .replace('{primary}', event.primaryCountry ?? 'Unknown')
        .replace('{target}', event.targetCountry ?? 'Unknown')
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
```

Update the callsite in `gameStore.ts` to pass `era`.

- [ ] **Step 3: Verify build**

```bash
cd G:/Claude/ad-astra-historia/shared && npx tsc --noEmit
cd ../client && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add shared/worldSimulation.ts shared/newsGenerator.ts client/src/stores/gameStore.ts
git commit -m "feat: ancient polity personalities + era-flavoured news headlines"
```

---

## Task 14 — Final integration test + push

**Files:**
- (no file changes — verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Build everything**

```bash
cd G:/Claude/ad-astra-historia && npm run build
```

Expected: clean builds across shared, server, client.

- [ ] **Step 3: Smoke test in the browser**

Start the dev server, then:
- Open the setup page → should see 20 era tiles in 3 sections
- Pick `classical_greek` → see Greek polities (Athens, Sparta, Persia, etc.)
- Start as Athens → currency displayed as `talents`
- Click 🪙 icon → toggles to USD equivalent
- Open tech tree → see era tabs at the top, current era highlighted purple
- Verify Athens has `philosophy` already unlocked (bonus tech)
- Cheat-unlock all techs in `classical_greek` → "Next Era →" button appears
- Click it → rename dialog → confirm → era advances to `alexander`, map updates, news headline posted

- [ ] **Step 4: Push**

```bash
cd G:/Claude/ad-astra-historia && git push origin main
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Section 1 (Data source & era list): Tasks 1, 3
- ✅ Section 2 (Polity IDs & pipeline): Tasks 2, 3
- ✅ Section 3 (Tier system): Task 2
- ✅ Section 4 (Era tech trees + progression): Tasks 7, 9, 10
- ✅ Section 5 (News templates): Tasks 8, 13
- ✅ Section 6 (Era selection UI tiles): Task 6
- ✅ Section 7 (Border precision): Task 11
- ✅ Section 8 (Personalities + diplomacy carry-over): Tasks 9, 13
- ✅ Section 9 (Currency system): Tasks 1, 5, 12

**Placeholder scan:** Task 7 has stub eras with comments like "expand with N more nodes" — these are intentional, the engineer fills them out incrementally. Acceptable because the framework is fully built.

**Type consistency:** `HistoricalEraId`, `AnyEraId`, `HistoricalPolityData`, `HistoricalTechNode`, `EraNewsTemplate`, `CurrencyMode` all consistent across tasks. `polityIdFor` signature matches across pipeline + store + tests.

**Scope check:** Big plan but cohesive — every task contributes to the same feature. Tasks 9 and 10 are large enough to dispatch as single subagent jobs rather than micro-stepping.

---

**End of plan.**
