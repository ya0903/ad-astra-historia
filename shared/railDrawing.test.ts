import { describe, it, expect } from 'vitest'
import {
  interpolateStraight, interpolateBend, interpolateDoubleBend,
  interpolateSquiggle, lineLengthKm, stationIncomeMonthly,
  railLineCost, stationBuildCost,
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
  it('generates 20+ samples between three points', () => {
    const result = interpolateBend([[0, 0], [1, 2], [2, 0]])
    expect(result.length).toBeGreaterThanOrEqual(20)
    expect(result[0]).toEqual([0, 0])
    expect(result[result.length - 1][0]).toBeCloseTo(2, 1)
    expect(result[result.length - 1][1]).toBeCloseTo(0, 1)
  })
  it('returns input unchanged when fewer than 3 points', () => {
    expect(interpolateBend([[0, 0], [1, 1]])).toEqual([[0, 0], [1, 1]])
  })
})

describe('interpolateDoubleBend', () => {
  it('generates 30+ samples for cubic bezier between four points', () => {
    const result = interpolateDoubleBend([[0, 0], [1, 2], [2, -2], [3, 0]])
    expect(result.length).toBeGreaterThanOrEqual(30)
    expect(result[0]).toEqual([0, 0])
    expect(result[result.length - 1][0]).toBeCloseTo(3, 1)
  })
  it('returns input unchanged when fewer than 4 points', () => {
    expect(interpolateDoubleBend([[0, 0], [1, 1], [2, 2]])).toEqual([[0, 0], [1, 1], [2, 2]])
  })
})

describe('interpolateSquiggle', () => {
  it('smooths a multi-point path through bezier spline', () => {
    const input: [number, number][] = [[0, 0], [1, 2], [2, -1], [3, 1], [4, 0]]
    const result = interpolateSquiggle(input)
    expect(result.length).toBeGreaterThan(input.length)
  })
  it('falls back to straight for fewer than 3 points', () => {
    expect(interpolateSquiggle([[0, 0], [1, 1]])).toEqual([[0, 0], [1, 1]])
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
  it('handles empty array', () => {
    expect(lineLengthKm([])).toBe(0)
  })
})

describe('stationIncomeMonthly', () => {
  it('returns base income for a mid-sized city at level 1', () => {
    expect(stationIncomeMonthly({ cityPopulation: 2_000_000, level: 1, isFirstInCity: false, cannibalised: false })).toBe(25_000_000)
  })
  it('applies level multiplier (L3 = 2x)', () => {
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

describe('railLineCost', () => {
  it('HSR costs $12M per km', () => {
    expect(railLineCost(100, true)).toBe(1_200_000_000)
  })
  it('Standard rail costs $3M per km', () => {
    expect(railLineCost(100, false)).toBe(300_000_000)
  })
})

describe('stationBuildCost', () => {
  it('L1 = $50M', () => {
    expect(stationBuildCost(1)).toBe(50_000_000)
  })
  it('L5 = $6B', () => {
    expect(stationBuildCost(5)).toBe(6_000_000_000)
  })
  it('clamps out-of-range levels', () => {
    expect(stationBuildCost(0)).toBe(50_000_000)
    expect(stationBuildCost(99)).toBe(6_000_000_000)
  })
})
