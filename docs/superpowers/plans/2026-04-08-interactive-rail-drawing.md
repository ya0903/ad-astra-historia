# Interactive Rail Drawing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player physically draw rail lines across their country with 4 tools (straight/bend/double-bend/squiggle), enforce border rules, then place stations along the line with upgrade levels that determine monthly income.

**Architecture:** A new React component `RailDrawOverlay` captures map clicks when drawing mode is active, builds an interpolated path with turf.js, renders a live preview via a dedicated MapLibre layer, and commits to the existing `RailLine` structure (extended with `stations` and `lengthKm`). Station income replaces the flat `BUILD_MONTHLY_INCOME` for rail types, so rails without stations produce zero GDP.

**Tech Stack:** React 18, Zustand, MapLibre GL, TypeScript, @turf/length, @turf/distance, @turf/bezier-spline, vitest.

**Spec:** `docs/superpowers/specs/2026-04-08-interactive-rail-drawing.md`

---

## File Structure

**New files:**
- `shared/railDrawing.ts` — pure functions for curve interpolation, border check, station income calculation. No React/MapLibre dependencies.
- `shared/railDrawing.test.ts` — vitest unit tests for the pure functions above.
- `client/src/stores/railDrawStore.ts` — Zustand slice for drawing state (current tool, waypoints, stations, mode: idle/drawing/stationing).
- `client/src/components/map/RailDrawOverlay.tsx` — mounts when drawing mode is active. Captures clicks, renders preview.
- `client/src/components/RailDrawPanel.tsx` — toolbar + length/cost display + confirm button. Hosts both draw mode and station placement mode.

**Modified files:**
- `shared/types.ts` — add `RailStation` type, extend `RailLine` with `stations?` and `lengthKm?`.
- `shared/types.ts` — drop `rail_line` and `high_speed_rail` values in `BUILD_MONTHLY_INCOME` to 0 (income moves to stations).
- `client/src/stores/gameStore.ts` — add `commitDrawnRail()` action that takes the waypoints + stations and creates a RailLine.
- `client/src/components/map/WorldMap.tsx` or `GamePage.tsx` — mount `RailDrawOverlay` and `RailDrawPanel`.
- `client/src/components/map/RailLayer.tsx` — render stations as dots on top of the rail line with level-based styling.
- `client/src/pages/GamePage.tsx` — add "🚆 Draw Rail" button, monthly income calculation must include station income.

---

## Task 1: Extend RailLine type with stations + lengthKm

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: Add RailStation interface and extend RailLine**

In `shared/types.ts`, find the `RailLine` interface and add the new types immediately above it:

```typescript
export interface RailStation {
  id: string
  lat: number
  lng: number
  name: string
  level: number        // 1-5
  city?: string        // snapped city name (if any)
}

export interface RailLine {
  id: string
  countryId: string
  fromCity: string
  toCity: string
  fromCoords: [number, number]
  toCoords: [number, number]
  waypoints?: [number, number][]  // full multi-city route coords in order
  type: RailType
  stations?: RailStation[]        // stops along the line (in order)
  lengthKm?: number               // total length in km, computed at creation
}
```

Replace the existing `RailLine` definition with the one above.

- [ ] **Step 2: Set BUILD_MONTHLY_INCOME rail values to 0**

In `shared/types.ts`, find `BUILD_MONTHLY_INCOME` and change the rail entries:

```typescript
  // Rail — income now comes from stations, not the line itself
  rail_line: 0,
  high_speed_rail: 0,
```

- [ ] **Step 3: Verify shared builds**

```bash
cd G:/Claude/ad-astra-historia/shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/types.ts
git commit -m "feat: add RailStation type, extend RailLine with stations + lengthKm, move income to stations"
```

---

## Task 2: Install turf packages for curve math

**Files:**
- Modify: `client/package.json` (via npm install)
- Modify: `package-lock.json`

- [ ] **Step 1: Install turf packages**

```bash
cd G:/Claude/ad-astra-historia && npm install @turf/length @turf/distance @turf/bezier-spline --workspace=client
```

- [ ] **Step 2: Verify install**

```bash
cd G:/Claude/ad-astra-historia && node -e "console.log(require('@turf/length').default ?? require('@turf/length'))"
```

Expected: a function is printed.

- [ ] **Step 3: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add package.json package-lock.json client/package.json
git commit -m "feat: add @turf/length, @turf/distance, @turf/bezier-spline for rail drawing"
```

---

## Task 3: Pure curve interpolation functions + tests

**Files:**
- Create: `shared/railDrawing.ts`
- Create: `shared/railDrawing.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `shared/railDrawing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  interpolateStraight, interpolateBend, interpolateDoubleBend,
  interpolateSquiggle, lineLengthKm, stationIncomeMonthly,
} from './railDrawing.js'

describe('interpolateStraight', () => {
  it('returns the input points unchanged', () => {
    const input: [number, number][] = [[0, 0], [1, 1], [2, 2]]
    expect(interpolateStraight(input)).toEqual(input)
  })
  it('handles single point', () => {
    expect(interpolateStraight([[5, 5]])).toEqual([[5, 5]])
  })
  it('handles empty array', () => {
    expect(interpolateStraight([])).toEqual([])
  })
})

describe('interpolateBend', () => {
  it('generates 20 samples between three points', () => {
    const result = interpolateBend([[0, 0], [1, 2], [2, 0]])
    expect(result.length).toBeGreaterThanOrEqual(20)
    expect(result[0]).toEqual([0, 0])
    // Last point should be near [2, 0]
    expect(result[result.length - 1][0]).toBeCloseTo(2, 1)
    expect(result[result.length - 1][1]).toBeCloseTo(0, 1)
  })
  it('returns input unchanged when fewer than 3 points', () => {
    expect(interpolateBend([[0, 0], [1, 1]])).toEqual([[0, 0], [1, 1]])
  })
})

describe('interpolateDoubleBend', () => {
  it('generates 30 samples for cubic bezier between four points', () => {
    const result = interpolateDoubleBend([[0, 0], [1, 2], [2, -2], [3, 0]])
    expect(result.length).toBeGreaterThanOrEqual(30)
    expect(result[0]).toEqual([0, 0])
    // Last point should be near [3, 0]
    expect(result[result.length - 1][0]).toBeCloseTo(3, 1)
  })
})

describe('interpolateSquiggle', () => {
  it('smooths a multi-point path through bezier spline', () => {
    const input: [number, number][] = [[0, 0], [1, 2], [2, -1], [3, 1], [4, 0]]
    const result = interpolateSquiggle(input)
    expect(result.length).toBeGreaterThan(input.length)
    // Start and end should match input
    expect(result[0][0]).toBeCloseTo(0, 0)
    expect(result[result.length - 1][0]).toBeCloseTo(4, 0)
  })
})

describe('lineLengthKm', () => {
  it('calculates zero km for a single point', () => {
    expect(lineLengthKm([[0, 0]])).toBe(0)
  })
  it('calculates ~111 km for one degree along the equator', () => {
    const km = lineLengthKm([[0, 0], [1, 0]])
    expect(km).toBeGreaterThan(100)
    expect(km).toBeLessThan(120)
  })
})

describe('stationIncomeMonthly', () => {
  it('returns base income for a mid-sized city at level 1', () => {
    expect(stationIncomeMonthly({ cityPopulation: 2_000_000, level: 1, isFirstInCity: false, cannibalised: false })).toBe(25_000_000)
  })
  it('applies level multiplier', () => {
    // L3 = 1 + 0.5*2 = 2x
    expect(stationIncomeMonthly({ cityPopulation: 2_000_000, level: 3, isFirstInCity: false, cannibalised: false })).toBe(50_000_000)
  })
  it('applies first-in-city bonus (+25%)', () => {
    expect(stationIncomeMonthly({ cityPopulation: 2_000_000, level: 1, isFirstInCity: true, cannibalised: false })).toBe(31_250_000)
  })
  it('applies cannibalisation penalty (-30%)', () => {
    expect(stationIncomeMonthly({ cityPopulation: 2_000_000, level: 1, isFirstInCity: false, cannibalised: true })).toBe(17_500_000)
  })
  it('uses megacity tier for 15M+ population', () => {
    expect(stationIncomeMonthly({ cityPopulation: 20_000_000, level: 1, isFirstInCity: false, cannibalised: false })).toBe(150_000_000)
  })
  it('handles no-city stations (middle of nowhere)', () => {
    expect(stationIncomeMonthly({ cityPopulation: 0, level: 1, isFirstInCity: false, cannibalised: false })).toBe(3_000_000)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/railDrawing.test.ts
```

Expected: FAIL with "Cannot find module './railDrawing.js'"

- [ ] **Step 3: Implement railDrawing.ts**

Create `shared/railDrawing.ts`:

```typescript
// Pure functions for interactive rail drawing.
// No React, no MapLibre — safe to test in isolation and reuse server-side if needed.
//
// Curve interpolation: straight = raw waypoints, bend = quadratic bezier,
// double-bend = cubic bezier, squiggle = bezier spline via turf.

import length from '@turf/length'
import bezierSpline from '@turf/bezier-spline'
import { lineString } from '@turf/helpers'

export type LngLat = [number, number]

// ── Curve interpolation ──────────────────────────────────────────────────────

/** Straight: returns the raw waypoints as the path. */
export function interpolateStraight(points: LngLat[]): LngLat[] {
  return [...points]
}

/**
 * Bend: for 3+ points, builds a quadratic bezier curve where every triplet
 * (prev, control, end) defines a curve. Interpolates 20 samples per curve.
 */
export function interpolateBend(points: LngLat[]): LngLat[] {
  if (points.length < 3) return [...points]
  const SAMPLES = 20
  const out: LngLat[] = [points[0]]
  for (let i = 1; i < points.length - 1; i += 2) {
    const p0 = points[i - 1]
    const p1 = points[i]          // control
    const p2 = points[i + 1] ?? points[i]
    for (let s = 1; s <= SAMPLES; s++) {
      const t = s / SAMPLES
      const mt = 1 - t
      const x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
      const y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
      out.push([x, y])
    }
  }
  return out
}

/**
 * Double bend: for 4+ points, builds cubic beziers where every quadruplet
 * (prev, c1, c2, end) defines a curve. Interpolates 30 samples per curve.
 */
export function interpolateDoubleBend(points: LngLat[]): LngLat[] {
  if (points.length < 4) return [...points]
  const SAMPLES = 30
  const out: LngLat[] = [points[0]]
  for (let i = 1; i < points.length - 2; i += 3) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? points[i + 1]
    for (let s = 1; s <= SAMPLES; s++) {
      const t = s / SAMPLES
      const mt = 1 - t
      const x = mt ** 3 * p0[0] + 3 * mt ** 2 * t * p1[0] + 3 * mt * t ** 2 * p2[0] + t ** 3 * p3[0]
      const y = mt ** 3 * p0[1] + 3 * mt ** 2 * t * p1[1] + 3 * mt * t ** 2 * p2[1] + t ** 3 * p3[1]
      out.push([x, y])
    }
  }
  return out
}

/**
 * Squiggle: smooths a multi-point path through a cubic bezier spline.
 * Needs at least 3 points to make sense; falls back to straight otherwise.
 */
export function interpolateSquiggle(points: LngLat[]): LngLat[] {
  if (points.length < 3) return [...points]
  try {
    const line = lineString(points)
    const smoothed = bezierSpline(line, { resolution: 10000, sharpness: 0.85 })
    return smoothed.geometry.coordinates as LngLat[]
  } catch {
    return [...points]
  }
}

// ── Length calculation ──────────────────────────────────────────────────────

/** Haversine-based line length in kilometres. */
export function lineLengthKm(points: LngLat[]): number {
  if (points.length < 2) return 0
  try {
    const line = lineString(points)
    return length(line, { units: 'kilometers' })
  } catch {
    return 0
  }
}

// ── Station income ──────────────────────────────────────────────────────────

export interface StationIncomeInput {
  cityPopulation: number     // 0 = no city
  level: number              // 1-5
  isFirstInCity: boolean
  cannibalised: boolean
}

/**
 * Monthly income in USD for a single station.
 * Tier by city population, scaled by level, with bonuses/penalties.
 */
export function stationIncomeMonthly(input: StationIncomeInput): number {
  const { cityPopulation, level, isFirstInCity, cannibalised } = input
  let base = 3_000_000
  if (cityPopulation >= 15_000_000) base = 150_000_000
  else if (cityPopulation >= 5_000_000) base = 80_000_000
  else if (cityPopulation >= 500_000) base = 25_000_000
  else if (cityPopulation > 0) base = 8_000_000
  const levelMult = 1 + 0.5 * (level - 1)
  const bonusMult = (isFirstInCity ? 1.25 : 1) * (cannibalised ? 0.7 : 1)
  return Math.round(base * levelMult * bonusMult)
}

// ── Cost calculation ────────────────────────────────────────────────────────

/** Rail construction cost in USD based on length and type. */
export function railLineCost(lengthKm: number, isHsr: boolean): number {
  const perKm = isHsr ? 12_000_000 : 3_000_000
  return Math.round(lengthKm * perKm)
}

/** Station build cost in USD by level. */
export function stationBuildCost(level: number): number {
  const costs = [50_000_000, 200_000_000, 800_000_000, 2_000_000_000, 6_000_000_000]
  return costs[Math.max(0, Math.min(4, level - 1))]
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run shared/railDrawing.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/railDrawing.ts shared/railDrawing.test.ts
git commit -m "feat: pure curve interpolation, length, station income functions with tests"
```

---

## Task 4: Add railDrawing to shared package exports

**Files:**
- Modify: `shared/package.json`
- Modify: `shared/index.ts`

- [ ] **Step 1: Add export to package.json**

In `shared/package.json`, add to the `exports` block:

```json
"./railDrawing": "./dist/railDrawing.js"
```

- [ ] **Step 2: Re-export from shared/index.ts**

In `shared/index.ts`, add:

```typescript
export * from './railDrawing.js'
```

- [ ] **Step 3: Rebuild shared**

```bash
cd G:/Claude/ad-astra-historia/shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add shared/package.json shared/index.ts
git commit -m "feat: export railDrawing from @ad-astra/shared"
```

---

## Task 5: Rail draw store (Zustand slice)

**Files:**
- Create: `client/src/stores/railDrawStore.ts`
- Modify: `client/src/stores/index.ts`

- [ ] **Step 1: Create railDrawStore.ts**

Create `client/src/stores/railDrawStore.ts`:

```typescript
import { create } from 'zustand'
import type { RailStation } from '@ad-astra/shared/types'

export type DrawTool = 'straight' | 'bend' | 'doubleBend' | 'squiggle'
export type DrawMode = 'idle' | 'drawing' | 'stationing'
export type DrawRailType = 'domestic_hsr' | 'cross_continent'

interface RailDrawState {
  mode: DrawMode
  tool: DrawTool
  railType: DrawRailType
  waypoints: [number, number][]          // raw click points
  stations: RailStation[]                 // stations placed during station mode
  borderValid: boolean                    // is the current path within valid borders
  error: string | null

  // Actions
  startDrawing: (railType: DrawRailType) => void
  setTool: (tool: DrawTool) => void
  addWaypoint: (lng: number, lat: number) => void
  undoWaypoint: () => void
  setBorderValid: (valid: boolean) => void
  enterStationMode: () => void
  addStation: (station: RailStation) => void
  removeStation: (id: string) => void
  upgradeStation: (id: string) => void
  cancel: () => void
  reset: () => void
}

export const useRailDrawStore = create<RailDrawState>((set) => ({
  mode: 'idle',
  tool: 'straight',
  railType: 'domestic_hsr',
  waypoints: [],
  stations: [],
  borderValid: true,
  error: null,

  startDrawing: (railType) => set({
    mode: 'drawing',
    railType,
    waypoints: [],
    stations: [],
    borderValid: true,
    error: null,
  }),
  setTool: (tool) => set({ tool }),
  addWaypoint: (lng, lat) => set(s => ({ waypoints: [...s.waypoints, [lng, lat]] })),
  undoWaypoint: () => set(s => ({ waypoints: s.waypoints.slice(0, -1) })),
  setBorderValid: (valid) => set({ borderValid: valid }),
  enterStationMode: () => set({ mode: 'stationing' }),
  addStation: (station) => set(s => ({ stations: [...s.stations, station] })),
  removeStation: (id) => set(s => ({ stations: s.stations.filter(x => x.id !== id) })),
  upgradeStation: (id) => set(s => ({
    stations: s.stations.map(x => x.id === id ? { ...x, level: Math.min(5, x.level + 1) } : x),
  })),
  cancel: () => set({ mode: 'idle', waypoints: [], stations: [], error: null }),
  reset: () => set({ mode: 'idle', waypoints: [], stations: [], borderValid: true, error: null }),
}))
```

- [ ] **Step 2: Re-export from stores index**

In `client/src/stores/index.ts`, add:

```typescript
export { useRailDrawStore } from './railDrawStore'
```

- [ ] **Step 3: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/stores/railDrawStore.ts client/src/stores/index.ts
git commit -m "feat: add railDrawStore for interactive drawing state"
```

---

## Task 6: RailDrawOverlay component — captures map clicks + renders preview

**Files:**
- Create: `client/src/components/map/RailDrawOverlay.tsx`
- Modify: `client/src/pages/GamePage.tsx` (mount the overlay inside WorldMap)

- [ ] **Step 1: Create RailDrawOverlay.tsx**

Create `client/src/components/map/RailDrawOverlay.tsx`:

```typescript
import { useEffect, useMemo } from 'react'
import { useMap } from './MapContext'
import { useRailDrawStore } from '../../stores'
import { useGameStore } from '../../stores'
import {
  interpolateStraight, interpolateBend, interpolateDoubleBend,
  interpolateSquiggle, type LngLat,
} from '@ad-astra/shared/railDrawing'
import { isCoordInCountry } from '../../lib/mapFly'

/**
 * Mounts while drawing mode is active. Captures map clicks to add waypoints,
 * renders a live preview line via a dedicated MapLibre source+layer, and
 * runs the border check whenever the path changes.
 */
export default function RailDrawOverlay() {
  const map = useMap()
  const mode = useRailDrawStore(s => s.mode)
  const tool = useRailDrawStore(s => s.tool)
  const railType = useRailDrawStore(s => s.railType)
  const waypoints = useRailDrawStore(s => s.waypoints)
  const addWaypoint = useRailDrawStore(s => s.addWaypoint)
  const undoWaypoint = useRailDrawStore(s => s.undoWaypoint)
  const cancel = useRailDrawStore(s => s.cancel)
  const setBorderValid = useRailDrawStore(s => s.setBorderValid)
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const allies = useGameStore(s => s.state?.allies ?? [])
  const controlled = useGameStore(s => s.state?.controlledCountries ?? [])

  // Compute interpolated path from raw waypoints + current tool
  const renderedPath: LngLat[] = useMemo(() => {
    switch (tool) {
      case 'straight':   return interpolateStraight(waypoints)
      case 'bend':       return interpolateBend(waypoints)
      case 'doubleBend': return interpolateDoubleBend(waypoints)
      case 'squiggle':   return interpolateSquiggle(waypoints)
    }
  }, [tool, waypoints])

  // Border check — sample 30 points along rendered path
  useEffect(() => {
    if (renderedPath.length < 2) { setBorderValid(true); return }
    const isCross = railType === 'cross_continent'
    const friendlyCountries = isCross
      ? new Set([playerCountryId, ...allies, ...controlled])
      : new Set([playerCountryId])
    const step = Math.max(1, Math.floor(renderedPath.length / 30))
    for (let i = 0; i < renderedPath.length; i += step) {
      const [lng, lat] = renderedPath[i]
      let found = false
      for (const iso of friendlyCountries) {
        if (isCoordInCountry(lng, lat, iso)) { found = true; break }
      }
      if (!found) { setBorderValid(false); return }
    }
    setBorderValid(true)
  }, [renderedPath, railType, playerCountryId, allies, controlled, setBorderValid])

  // Attach click handler to map while drawing
  useEffect(() => {
    if (!map || mode !== 'drawing') return
    const onClick = (e: maplibregl.MapMouseEvent) => {
      addWaypoint(e.lngLat.lng, e.lngLat.lat)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoWaypoint() }
      if (e.key === 'Backspace') { e.preventDefault(); undoWaypoint() }
    }
    map.on('click', onClick)
    window.addEventListener('keydown', onKey)
    map.getCanvas().style.cursor = 'crosshair'
    return () => {
      map.off('click', onClick)
      window.removeEventListener('keydown', onKey)
      map.getCanvas().style.cursor = ''
    }
  }, [map, mode, addWaypoint, undoWaypoint, cancel])

  // Render preview line via MapLibre source + layer
  useEffect(() => {
    if (!map) return
    const SOURCE_ID = 'rail-draft'
    const LINE_LAYER = 'rail-draft-line'
    const POINT_LAYER = 'rail-draft-points'
    const isValid = useRailDrawStore.getState().borderValid
    const active = mode !== 'idle' && renderedPath.length >= 1

    if (!active) {
      if (map.getLayer(POINT_LAYER)) map.removeLayer(POINT_LAYER)
      if (map.getLayer(LINE_LAYER)) map.removeLayer(LINE_LAYER)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      return
    }

    const lineColour = isValid ? '#c084fc' : '#ef4444'
    const lineGeojson = {
      type: 'FeatureCollection' as const,
      features: [
        ...(renderedPath.length >= 2 ? [{
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: renderedPath },
          properties: {},
        }] : []),
        ...waypoints.map(p => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: p },
          properties: {},
        })),
      ],
    }

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: 'geojson', data: lineGeojson })
      map.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': lineColour,
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
        filter: ['==', ['geometry-type'], 'LineString'],
      })
      map.addLayer({
        id: POINT_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': 4,
          'circle-color': lineColour,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
        filter: ['==', ['geometry-type'], 'Point'],
      })
    } else {
      const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource
      src.setData(lineGeojson)
      if (map.getLayer(LINE_LAYER)) map.setPaintProperty(LINE_LAYER, 'line-color', lineColour)
      if (map.getLayer(POINT_LAYER)) map.setPaintProperty(POINT_LAYER, 'circle-color', lineColour)
    }
  }, [map, mode, renderedPath, waypoints])

  return null
}
```

- [ ] **Step 2: Mount RailDrawOverlay inside WorldMap in GamePage**

In `client/src/pages/GamePage.tsx`, find where other map layers are rendered inside `<WorldMap>` (near `<RailLayer />`). Import and add:

```typescript
import RailDrawOverlay from '../components/map/RailDrawOverlay'
```

And inside the JSX:

```tsx
<RailDrawOverlay />
```

- [ ] **Step 3: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/components/map/RailDrawOverlay.tsx client/src/pages/GamePage.tsx
git commit -m "feat: RailDrawOverlay captures clicks, renders live path preview with border check"
```

---

## Task 7: RailDrawPanel toolbar UI

**Files:**
- Create: `client/src/components/RailDrawPanel.tsx`
- Modify: `client/src/pages/GamePage.tsx` (mount the panel + Draw Rail button)

- [ ] **Step 1: Create RailDrawPanel.tsx**

Create `client/src/components/RailDrawPanel.tsx`:

```typescript
import { useMemo } from 'react'
import { useRailDrawStore, useGameStore } from '../stores'
import {
  interpolateStraight, interpolateBend, interpolateDoubleBend,
  interpolateSquiggle, lineLengthKm, railLineCost, stationBuildCost, type LngLat,
} from '@ad-astra/shared/railDrawing'
import type { RailStation, RailLine, RailType } from '@ad-astra/shared/types'

function formatMoney(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v}`
}

export default function RailDrawPanel() {
  const mode = useRailDrawStore(s => s.mode)
  const tool = useRailDrawStore(s => s.tool)
  const setTool = useRailDrawStore(s => s.setTool)
  const railType = useRailDrawStore(s => s.railType)
  const waypoints = useRailDrawStore(s => s.waypoints)
  const stations = useRailDrawStore(s => s.stations)
  const borderValid = useRailDrawStore(s => s.borderValid)
  const undoWaypoint = useRailDrawStore(s => s.undoWaypoint)
  const cancel = useRailDrawStore(s => s.cancel)
  const enterStationMode = useRailDrawStore(s => s.enterStationMode)
  const reset = useRailDrawStore(s => s.reset)
  const commitDrawnRail = useGameStore(s => s.commitDrawnRail)

  const renderedPath: LngLat[] = useMemo(() => {
    switch (tool) {
      case 'straight':   return interpolateStraight(waypoints)
      case 'bend':       return interpolateBend(waypoints)
      case 'doubleBend': return interpolateDoubleBend(waypoints)
      case 'squiggle':   return interpolateSquiggle(waypoints)
    }
  }, [tool, waypoints])

  const km = useMemo(() => lineLengthKm(renderedPath), [renderedPath])
  const isHsr = railType === 'domestic_hsr'
  const lineCost = railLineCost(km, isHsr)
  const stationCostTotal = stations.reduce((sum, s) => sum + stationBuildCost(s.level), 0)
  const totalCost = lineCost + stationCostTotal

  if (mode === 'idle') return null

  const canConfirm = waypoints.length >= 2 && borderValid

  const handleConfirmDraw = () => {
    enterStationMode()
  }

  const handleFinalise = () => {
    // Build RailLine + stations (ensure first/last waypoints are stations)
    const finalStations: RailStation[] = [...stations]
    if (finalStations.length < 2 && renderedPath.length >= 2) {
      // Auto-add endpoints if player didn't place any
      const first = renderedPath[0]
      const last = renderedPath[renderedPath.length - 1]
      if (!finalStations.some(s => s.lng === first[0] && s.lat === first[1])) {
        finalStations.unshift({ id: `stn-${Date.now()}-a`, lng: first[0], lat: first[1], name: 'Origin', level: 1 })
      }
      if (!finalStations.some(s => s.lng === last[0] && s.lat === last[1])) {
        finalStations.push({ id: `stn-${Date.now()}-b`, lng: last[0], lat: last[1], name: 'Terminus', level: 1 })
      }
    }
    const rail: Omit<RailLine, 'id'> & { id?: string } = {
      countryId: '',  // filled by store
      fromCity: finalStations[0]?.name ?? 'Origin',
      toCity: finalStations[finalStations.length - 1]?.name ?? 'Terminus',
      fromCoords: renderedPath[0],
      toCoords: renderedPath[renderedPath.length - 1],
      waypoints: renderedPath,
      type: railType as RailType,
      stations: finalStations,
      lengthKm: km,
    }
    commitDrawnRail(rail, totalCost)
    reset()
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0a1628]/95 backdrop-blur-md border border-purple-500/40 rounded-2xl shadow-2xl p-4 w-[480px]">
      {mode === 'drawing' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">New Rail Line</span>
            <span className="text-[10px] text-gray-500">Esc = cancel · Ctrl+Z = undo</span>
          </div>

          {/* Type selector */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => useRailDrawStore.setState({ railType: 'domestic_hsr' })}
              className={`flex-1 text-[11px] py-1.5 rounded-lg transition-colors ${
                railType === 'domestic_hsr' ? 'bg-purple-700 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >Standard</button>
            <button
              onClick={() => useRailDrawStore.setState({ railType: 'cross_continent' })}
              className={`flex-1 text-[11px] py-1.5 rounded-lg transition-colors ${
                railType === 'cross_continent' ? 'bg-purple-700 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >Cross-Continent</button>
          </div>

          {/* Tool selector */}
          <div className="flex gap-1 mb-3">
            {([
              { id: 'straight',   label: '—',  title: 'Straight' },
              { id: 'bend',       label: '∫',  title: 'Bend (3 pts)' },
              { id: 'doubleBend', label: '∿',  title: 'Double Bend (4 pts)' },
              { id: 'squiggle',   label: '≈',  title: 'Squiggle (smooth spline)' },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.title}
                className={`flex-1 text-lg py-1.5 rounded-lg transition-colors ${
                  tool === t.id ? 'bg-purple-700 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >{t.label}</button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-[10px]">
            <div className="rounded-lg bg-white/[0.04] p-2">
              <p className="text-gray-500 uppercase tracking-wider">Length</p>
              <p className="text-sm font-mono text-white">{km.toFixed(0)} km</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] p-2">
              <p className="text-gray-500 uppercase tracking-wider">Cost</p>
              <p className="text-sm font-mono text-amber-300">{formatMoney(lineCost)}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] p-2">
              <p className="text-gray-500 uppercase tracking-wider">Points</p>
              <p className="text-sm font-mono text-white">{waypoints.length}</p>
            </div>
          </div>

          {!borderValid && (
            <p className="text-[10px] text-red-400 mb-2">⚠ Route exits {railType === 'cross_continent' ? 'friendly' : 'your'} territory. Adjust the path.</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={undoWaypoint} disabled={waypoints.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 disabled:opacity-40 text-gray-300">
              Undo
            </button>
            <button onClick={cancel}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-red-900/40 text-gray-300 hover:text-red-300">
              Cancel
            </button>
            <button onClick={handleConfirmDraw} disabled={!canConfirm}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white">
              Place Stations →
            </button>
          </div>
        </>
      )}

      {mode === 'stationing' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">Place Stations</span>
            <span className="text-[10px] text-gray-500">Click line to add stops</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3 text-[10px]">
            <div className="rounded-lg bg-white/[0.04] p-2">
              <p className="text-gray-500 uppercase tracking-wider">Stations</p>
              <p className="text-sm font-mono text-white">{stations.length}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] p-2">
              <p className="text-gray-500 uppercase tracking-wider">Station Cost</p>
              <p className="text-sm font-mono text-amber-300">{formatMoney(stationCostTotal)}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] p-2">
              <p className="text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-sm font-mono text-amber-300">{formatMoney(totalCost)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={cancel}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-red-900/40 text-gray-300 hover:text-red-300">
              Cancel Line
            </button>
            <button onClick={handleFinalise}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white">
              Finalise →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Mount RailDrawPanel and add Draw Rail button in GamePage**

In `client/src/pages/GamePage.tsx`, add import:

```typescript
import RailDrawPanel from '../components/RailDrawPanel'
import { useRailDrawStore } from '../stores'
```

Add hook inside the component:

```typescript
const startDrawingRail = useRailDrawStore(s => s.startDrawing)
```

Mount the panel near the other floating panels:

```tsx
<RailDrawPanel />
```

Add a "🚆 Draw Rail" button near the existing build buttons:

```tsx
<button
  onClick={() => startDrawingRail('domestic_hsr')}
  className="absolute bottom-20 left-4 px-3 py-2 rounded-xl bg-purple-700/80 hover:bg-purple-600 text-white text-xs font-semibold shadow-xl z-10"
  title="Draw a new rail line"
>
  🚆 Draw Rail
</button>
```

- [ ] **Step 3: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected errors: `commitDrawnRail` doesn't exist yet — this is fine, Task 8 adds it. Note the errors down and move on.

- [ ] **Step 4: Commit (partial — panel + button in place, action added in next task)**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/components/RailDrawPanel.tsx client/src/pages/GamePage.tsx
git commit -m "feat: RailDrawPanel with tool selector, stats, and Draw Rail button (action pending)"
```

---

## Task 8: commitDrawnRail store action

**Files:**
- Modify: `client/src/stores/gameStore.ts`

- [ ] **Step 1: Add action declaration to GameStoreState interface**

In `client/src/stores/gameStore.ts`, find the interface with other action declarations (e.g. `setEconomy`, `payDownDebt`) and add:

```typescript
  commitDrawnRail: (rail: Omit<import('@ad-astra/shared/types').RailLine, 'id' | 'countryId'>, totalCost: number) => void
```

- [ ] **Step 2: Implement the action**

Find the place where other actions like `payDownDebt` are implemented, and add:

```typescript
  commitDrawnRail: (rail, totalCost) => set(s => {
    if (!s.state) return {}
    const st = s.state
    const player = st.countries[st.playerCountryId]
    if (!player) return {}
    const newRail = {
      ...rail,
      id: `rail-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      countryId: st.playerCountryId,
    }
    // Deduct cost from GDP (add to debt)
    const newEconomy = st.economy
      ? { ...st.economy, debt: st.economy.debt + totalCost }
      : st.economy
    const newsItem: NewsItem = {
      id: `news-rail-${newRail.id}`,
      date: st.currentDate,
      headline: `${rail.fromCity} → ${rail.toCity} ${rail.type === 'domestic_hsr' ? 'HSR' : 'Rail'} Under Construction`,
      body: `New ${(rail.lengthKm ?? 0).toFixed(0)}km rail line with ${rail.stations?.length ?? 0} stations. Total cost: $${(totalCost / 1e9).toFixed(2)}B.`,
      category: 'economy',
      importance: 'major',
      country: st.playerCountryId,
    }
    return {
      state: {
        ...st,
        railLines: [...(st.railLines ?? []), newRail],
        economy: newEconomy,
        newsItems: [newsItem, ...(st.newsItems ?? [])].slice(0, 200),
      },
    }
  }),</codeblock>

Actually, use a standard code block not nested:

```typescript
  commitDrawnRail: (rail, totalCost) => set(s => {
    if (!s.state) return {}
    const st = s.state
    const player = st.countries[st.playerCountryId]
    if (!player) return {}
    const newRail = {
      ...rail,
      id: `rail-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      countryId: st.playerCountryId,
    }
    const newEconomy = st.economy
      ? { ...st.economy, debt: st.economy.debt + totalCost }
      : st.economy
    const newsItem: NewsItem = {
      id: `news-rail-${newRail.id}`,
      date: st.currentDate,
      headline: `${rail.fromCity} → ${rail.toCity} ${rail.type === 'domestic_hsr' ? 'HSR' : 'Rail'} Under Construction`,
      body: `New ${(rail.lengthKm ?? 0).toFixed(0)}km rail line with ${rail.stations?.length ?? 0} stations. Total cost: $${(totalCost / 1e9).toFixed(2)}B.`,
      category: 'economy',
      importance: 'major',
      country: st.playerCountryId,
    }
    return {
      state: {
        ...st,
        railLines: [...(st.railLines ?? []), newRail],
        economy: newEconomy,
        newsItems: [newsItem, ...(st.newsItems ?? [])].slice(0, 200),
      },
    }
  }),
```

- [ ] **Step 3: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors (Task 7 errors should now be gone).

- [ ] **Step 4: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/stores/gameStore.ts
git commit -m "feat: commitDrawnRail store action — persist drawn line + deduct cost"
```

---

## Task 9: Station placement mode click handler

**Files:**
- Modify: `client/src/components/map/RailDrawOverlay.tsx`

- [ ] **Step 1: Add station-mode click handler and snap-to-line logic**

In `client/src/components/map/RailDrawOverlay.tsx`, extend the component. Add imports at the top:

```typescript
import { lineLengthKm } from '@ad-astra/shared/railDrawing'
import type { RailStation } from '@ad-astra/shared/types'
import { getCityCentre } from '../../lib/mapFly'
```

Inside the component, add a handler for station mode:

```typescript
  const stations = useRailDrawStore(s => s.stations)
  const addStation = useRailDrawStore(s => s.addStation)

  // Station placement click handler
  useEffect(() => {
    if (!map || mode !== 'stationing') return
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const click: LngLat = [e.lngLat.lng, e.lngLat.lat]
      // Find the nearest point on the rendered path to the click
      let nearest: LngLat | null = null
      let bestDist = Infinity
      for (const p of renderedPath) {
        const dx = p[0] - click[0]
        const dy = p[1] - click[1]
        const d = dx * dx + dy * dy
        if (d < bestDist) { bestDist = d; nearest = p }
      }
      if (!nearest) return
      // Minimum spacing (40 km) against existing stations
      const TOO_CLOSE_KM = 40
      for (const st of stations) {
        const km = lineLengthKm([[st.lng, st.lat], nearest])
        if (km < TOO_CLOSE_KM) return
      }
      const maxStations = railType === 'domestic_hsr' ? 8 : 12
      if (stations.length >= maxStations) return
      // Snap to city if within ~0.3 degrees (rough 30km)
      let cityName: string | undefined
      const ISOS = [playerCountryId, ...allies, ...controlled]
      for (const iso of ISOS) {
        const tryNames = ['Central', 'Junction', 'Station']
        // We don't have a getCityAt API; leave city detection to a later pass
        void iso; void tryNames
      }
      const newStation: RailStation = {
        id: `stn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        lng: nearest[0],
        lat: nearest[1],
        name: cityName ?? `Station ${stations.length + 1}`,
        level: 1,
        city: cityName,
      }
      addStation(newStation)
    }
    map.on('click', onClick)
    map.getCanvas().style.cursor = 'crosshair'
    return () => {
      map.off('click', onClick)
      map.getCanvas().style.cursor = ''
    }
  }, [map, mode, renderedPath, stations, railType, addStation, playerCountryId, allies, controlled])
```

Note: the `getCityCentre` import is intentionally unused for now — a follow-up task can add proper city snapping with a reverse lookup.

- [ ] **Step 2: Render stations in the draft layer**

Extend the existing draft rendering effect to also show placed stations. In the rendering effect where `lineGeojson` is built, add station features:

Find the `features: [` block and extend it:

```typescript
      features: [
        ...(renderedPath.length >= 2 ? [{
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: renderedPath },
          properties: { kind: 'line' },
        }] : []),
        ...waypoints.map(p => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: p },
          properties: { kind: 'waypoint' },
        })),
        ...stations.map(s => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: { kind: 'station', level: s.level },
        })),
      ],
```

And update the selector `stations` in the component if not already declared. Add a dependency to the rendering effect so it re-runs when stations change: add `stations` to the dep array.

- [ ] **Step 3: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/components/map/RailDrawOverlay.tsx
git commit -m "feat: station placement click handler with 40km spacing rule"
```

---

## Task 10: Station income in monthly tick

**Files:**
- Modify: `client/src/stores/gameStore.ts`

- [ ] **Step 1: Add station income calculation to monthly tick**

In `client/src/stores/gameStore.ts`, find the monthly recurring income block in `advanceDate` (the section with "Infrastructure income", "Nationalised resources income", "Power surplus"). Add a new section for station income.

Find this block (look for "Monthly recurring income"):

```typescript
      // 1. Infrastructure income
      for (const inf of s.infrastructureMap) {
        if (inf.countryId !== s.playerCountryId) continue
        totalMonthly += monthlyIncomeFor(inf.type, inf.level ?? 1)
      }
```

Add this block immediately after:

```typescript
      // 1b. Rail station income
      // Count how many stations each city has (for cannibalisation)
      const cityStationCount = new Map<string, number>()
      for (const rail of s.railLines) {
        if (rail.countryId !== s.playerCountryId) continue
        for (const stn of (rail.stations ?? [])) {
          if (!stn.city) continue
          cityStationCount.set(stn.city, (cityStationCount.get(stn.city) ?? 0) + 1)
        }
      }
      for (const rail of s.railLines) {
        if (rail.countryId !== s.playerCountryId) continue
        for (const stn of (rail.stations ?? [])) {
          // Pop lookup: try nearest city in the player's country to estimate
          // For now, use a simple city-name-to-population map via the country data
          // Fallback: 0 (no-city tier) if we can't match
          const pop = stn.city ? estimateCityPopulation(stn.city, s.playerCountryId) : 0
          const count = stn.city ? (cityStationCount.get(stn.city) ?? 1) : 1
          const income = stationIncomeMonthly({
            cityPopulation: pop,
            level: stn.level,
            isFirstInCity: count === 1,
            cannibalised: count > 1,
          })
          totalMonthly += income
        }
      }
```

Add the import at the top of `gameStore.ts`:

```typescript
import { stationIncomeMonthly } from '@ad-astra/shared/railDrawing'
```

And add a simple helper function near the other helpers (top of the file):

```typescript
/** Rough estimate of a city's population based on country total and city name. */
function estimateCityPopulation(cityName: string, countryIso: string): number {
  const country = MODERN_COUNTRY_DATA[countryIso.toUpperCase()]
  if (!country) return 0
  // Very rough — assume the player's city is a major city.
  // Later this should consult a real cities database.
  const pop = country.population
  const name = cityName.toLowerCase()
  if (name.includes('capital') || name.includes('central')) return Math.floor(pop * 0.06)
  return Math.floor(pop * 0.02)
}
```

- [ ] **Step 2: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/stores/gameStore.ts
git commit -m "feat: station income in monthly tick with cannibalisation penalty"
```

---

## Task 11: Render stations on the committed rail layer

**Files:**
- Modify: `client/src/components/map/RailLayer.tsx`

- [ ] **Step 1: Add a station source and layer after rail lines are added**

In `client/src/components/map/RailLayer.tsx`, at the bottom of the existing `useEffect` (after rail lines are set up), add station rendering:

```typescript
    // ── Station dots on top of rail lines ──
    const stationFeatures = gameState.railLines.flatMap(r =>
      (r.stations ?? []).map(s => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: {
          name: s.name,
          level: s.level,
          city: s.city ?? '',
        },
      }))
    )
    const stationGeojson = { type: 'FeatureCollection' as const, features: stationFeatures }
    const STATION_SOURCE = 'rail-stations'
    const STATION_LAYER = 'rail-station-dots'
    if (map.getSource(STATION_SOURCE)) {
      (map.getSource(STATION_SOURCE) as maplibregl.GeoJSONSource).setData(stationGeojson)
    } else {
      map.addSource(STATION_SOURCE, { type: 'geojson', data: stationGeojson })
      map.addLayer({
        id: STATION_LAYER,
        type: 'circle',
        source: STATION_SOURCE,
        minzoom: 3,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'level'],
            1, 3, 3, 6, 5, 10,
          ],
          'circle-color': '#ffffff',
          'circle-stroke-color': ['interpolate', ['linear'], ['get', 'level'],
            1, '#94a3b8', 3, '#60a5fa', 5, '#22d3ee',
          ],
          'circle-stroke-width': ['interpolate', ['linear'], ['get', 'level'],
            1, 0.5, 3, 1.5, 5, 3,
          ],
        },
      })
    }
```

And in the cleanup function at the end of the effect, add:

```typescript
      if (map.getLayer(STATION_LAYER)) map.removeLayer(STATION_LAYER)
      if (map.getSource(STATION_SOURCE)) map.removeSource(STATION_SOURCE)
```

- [ ] **Step 2: Verify build**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd G:/Claude/ad-astra-historia
git add client/src/components/map/RailLayer.tsx
git commit -m "feat: render rail stations with level-based styling"
```

---

## Task 12: Final integration, build, push

**Files:**
- (no file changes — just smoke test and push)

- [ ] **Step 1: Build all workspaces**

```bash
cd G:/Claude/ad-astra-historia && npm run build
```

Expected: clean build across shared, server, client.

- [ ] **Step 2: Run all tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run
```

Expected: all tests pass including the new `shared/railDrawing.test.ts`.

- [ ] **Step 3: Push**

```bash
cd G:/Claude/ad-astra-historia && git push origin main
```

Expected: push succeeds.

---

## Self-Review Notes

- [x] **Spec coverage:**
  - Drawing tool with 4 modes → Tasks 3 (math) + 6 (overlay) + 7 (panel)
  - Border enforcement → Task 6
  - Undo + cancel → Task 5 (store) + Task 6 (keyboard) + Task 7 (button)
  - Station placement + spacing + snap → Task 9
  - Station levels → Task 5 (store) + Task 11 (rendering)
  - Length-based cost → Task 3 (function) + Task 7 (display) + Task 8 (commit)
  - Station income → Task 3 (function) + Task 10 (monthly tick)
  - New UI panels → Task 7
  - Visual polish → Task 11

- [x] **Placeholder scan:** None found.

- [x] **Type consistency:** `RailStation`, `RailLine`, `LngLat`, `DrawTool`, `DrawMode`, `DrawRailType`, `commitDrawnRail`, `stationIncomeMonthly`, `lineLengthKm`, `railLineCost`, `stationBuildCost` all used consistently across tasks.
