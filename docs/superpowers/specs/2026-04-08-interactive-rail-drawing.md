# Interactive Rail Drawing + Station Placement

**Date:** 2026-04-08
**Status:** Approved for implementation

## Goal

Replace the AI-generated "here's a rail line from A to B" flow with an **interactive drawing tool** where the player physically traces rail routes across their country using a toolbar (straight / bend / double-bend / squiggle), then places stations along the route.

## Motivation

- Current rail routing feels abstract — the AI just picks city centroids and draws a line
- Players want to make tactile infrastructure decisions (avoid mountains, hug coastlines, connect specific cities)
- Station placement adds strategic depth (which cities to serve, what levels to upgrade them to)
- Real-length-based cost (km × price) replaces the current flat rail pricing, which is more realistic

## Scope

### In scope
1. **Rail drawing tool** — click-based waypoint drawing with 4 tools (straight, bend, double-bend, squiggle)
2. **Border enforcement** — cannot draw outside player's borders unless rail type is cross-continent
3. **Undo + cancel** — undo last click, cancel drawing in progress
4. **Station placement mode** — click points along the drawn line to place stations
5. **Station auto-naming + snap-to-city** — stations near cities inherit the city name
6. **Station levels (1-5)** — upgrade system with cost curve and income multipliers
7. **Length-based cost** — cost scales with actual kilometres drawn
8. **Income from stations** — each station generates monthly income based on served city population
9. **New UI panel** — toolbar for drawing mode, station placement mode
10. **Visual polish** — station dots scaled by level with hover tooltips

### Out of scope (phase 2)
- Freight vs passenger station types
- Freight stations connecting industrial zones
- Multi-country rail routes (beyond basic cross-continent check)
- Rail electrification upgrades
- Station "terminal" (end-of-line only) vs "through" semantics

## Architecture

### Data model extensions

`RailLine` currently has `waypoints?: [number, number][]`. Extend with:

```ts
export interface RailStation {
  id: string
  lat: number
  lng: number
  name: string
  level: number                // 1-5
  city?: string                // auto-detected city name (if snapped)
}

// New optional field on RailLine
interface RailLine {
  // ... existing fields ...
  stations?: RailStation[]     // ordered along the line from start to end
  lengthKm?: number            // computed from waypoints at creation time
}
```

### Drawing tools

Four tools that interpret waypoints differently:

- **Straight**: every click = a hard vertex. Segments are straight lines.
- **Bend**: every 3 clicks becomes a quadratic Bézier — point[n-2] = control, point[n-1] = end. Interpolate 20 samples.
- **Double Bend**: every 4 clicks becomes a cubic Bézier — point[n-3], point[n-2] = control, point[n-1] = end. Interpolate 30 samples.
- **Squiggle**: every click adds a smoothed waypoint. Path goes through all clicks as a cubic spline via `@turf/bezier-spline`.

All tools output a flat `[lng, lat][]` array of interpolated points (the "rendered path") PLUS the original click points (for display/undo).

### Border check

Sample the rendered path at ~30 points. For each:
- If player rail and any point fails `isCoordInCountry(lng, lat, playerIso)` → show red preview, block confirm
- If cross-continent rail → allow points in player country + allied countries + controlled countries

Run on every segment commit, not every mouse move (perf).

### Station placement

After the line is confirmed, enter "station mode". Click on the line (within 10px) snaps to the closest point. Rules:
- First and last waypoints auto-become stations (can't be removed)
- Minimum 40km between stations (turf.distance check)
- Max stations per line: `BASE_MAX × level` (8 for rail, 4 for HSR at level 1)
- Click within 30px of a city centre → snaps to city, auto-names "Karachi Central", "Lahore Junction", etc.

### Cost model

Drawing phase:
- `baseCostPerKm` × `lengthKm` = construction cost
- Rail: $3M/km
- HSR: $12M/km

Station phase:
- L1: $50M
- L2: $200M
- L3: $800M
- L4: $2B
- L5: $6B

Total cost = line cost + sum of station costs. Deducted from GDP/debt at confirm time.

### Income model

Income moves from the rail line itself to **stations**. Each station generates monthly income based on:
- City population tier:
  - <500k: $8M/mo
  - 500k-5M: $25M/mo
  - 5M-15M: $80M/mo
  - 15M+: $150M/mo
  - No city match: $3M/mo (middle-of-nowhere stop)
- Level multiplier: `1 + 0.5 × (level - 1)` (L1=1x, L5=3x)
- First-mover bonus: +25% if the city has no other rail stations
- Cannibalisation: -30% if another station exists in the same city

Existing `BUILD_MONTHLY_INCOME[rail_line]` and `BUILD_MONTHLY_INCOME[high_speed_rail]` drop to **0** — rails with no stations are dead weight.

## UI

### Rail Draw Panel (new)

Bottom-center floating panel, shown when player clicks "Draw New Rail" from the build menu:

```
┌─ New Rail Line ────────────────────┐
│ Type: [ Standard ] [ HSR ]         │
│ Tool: [—] [∫] [∿] [≈] (4 tool btns)│
│ Length: 342 km · Cost: $1.03B      │
│ Points: 5 · Border: ✓ in-country  │
│                                    │
│ [Undo]  [Cancel]  [Confirm →]      │
└────────────────────────────────────┘
```

Tools (as icons):
- **—** Straight
- **∫** Bend
- **∿** Double Bend
- **≈** Squiggle

Pressing Escape = cancel. Ctrl+Z or Backspace = undo.

### Station Placement Panel (new)

Shown after Confirm on the draw panel:

```
┌─ Place Stations ───────────────────┐
│ Line: Karachi → Lahore HSR         │
│ Stations: 2/4 (L1: $50M each)      │
│                                    │
│ • Karachi Central — start          │
│ • Lahore Junction — end            │
│                                    │
│ Click along the line to add stops. │
│ Total station cost: $100M          │
│                                    │
│ [Cancel Line]  [Finalise →]        │
└────────────────────────────────────┘
```

Click existing stations to open a mini-popover with upgrade/remove/rename.

### Entry point

In `GamePage.tsx`, add a "🚆 Draw Rail" button near the existing build action buttons. Clicking it enters draw mode.

### Rendering

- **Draft line (during drawing)**: dashed purple, 2px, green if valid, red if out-of-border
- **Committed line**: solid colour per rail type (already exists)
- **Stations**:
  - L1: 4px white dot
  - L2: 6px dot with thin border
  - L3: 8px dot with ring
  - L4: 10px dot with blue glow
  - L5: 12px star shape with strong cyan glow
- **Hover tooltip** on station: name, level, monthly income, served city population

## Testing Strategy

- Unit tests for curve interpolation (straight, bend, double-bend, squiggle)
- Unit tests for border check (point-in-polygon using fixture GeoJSON)
- Unit tests for station income calculation (all tier combinations)
- Unit tests for cost scaling (length × per-km, level × per-station)
- Integration: a simple "draw straight line in Pakistan, place 2 stations, confirm" flow via the store actions

## Acceptance Criteria

- [ ] Player can click "Draw Rail" to enter drawing mode
- [ ] All four tools produce correct geometry
- [ ] Border violations show a red preview and block confirmation
- [ ] Undo removes the last waypoint; Escape cancels
- [ ] Length + cost update live as the player draws
- [ ] Confirming opens station placement with first/last auto-placed
- [ ] Stations snap to nearby cities and auto-name
- [ ] 40km minimum spacing enforced
- [ ] Station income depends on served city population + level
- [ ] Upgrading a station costs money and increases income
- [ ] Rail lines with no stations generate no income
- [ ] All existing rail code (RailLine rendering, RailLayer) continues to work unchanged
