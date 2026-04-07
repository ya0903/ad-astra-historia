import { describe, it, expect } from 'vitest'
import { worldTick } from './worldSimulation.js'
import type { Country, CountryStats } from './types.js'

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
    const result = worldTick(countries, {}, '2025-01-07', [])
    expect(Array.isArray(result.events)).toBe(true)
  })

  it('generates events when countries have tense relations', () => {
    const countries: Record<string, Country> = {
      AAA: makeCountry('AAA', { military: 80, stability: 40 }),
      BBB: makeCountry('BBB', { military: 30, stability: 80 }),
    }
    const relations: Record<string, number> = { 'AAA-BBB': -60 }
    let totalEvents = 0
    for (let i = 0; i < 100; i++) {
      const result = worldTick(countries, relations, '2025-01-07', [])
      totalEvents += result.events.length
    }
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

  it('caps weekly event count between 0 and 8', () => {
    const countries: Record<string, Country> = {}
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
