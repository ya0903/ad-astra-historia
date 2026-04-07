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
