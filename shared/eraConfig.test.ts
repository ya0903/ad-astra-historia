import { describe, it, expect } from 'vitest'
import {
  HISTORICAL_ERAS, ERA_BY_ID, getEraIndex, getNextEra, isHistoricalEra,
  ERA_USD_CONVERSION_RATE, ERA_CURRENCY_UNIT,
} from './eraConfig.js'

describe('HISTORICAL_ERAS', () => {
  it('contains 15 historical eras in chronological order', () => {
    expect(HISTORICAL_ERAS.length).toBe(15)
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

describe('getEraIndex', () => {
  it('returns index for known eras', () => {
    expect(getEraIndex('bronze_age')).toBe(0)
    expect(getEraIndex('modern')).toBe(19)
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
  it('has a unit for every historical era', () => {
    for (const e of HISTORICAL_ERAS) {
      expect(ERA_CURRENCY_UNIT[e.id]).toBeTypeOf('string')
    }
  })
})
