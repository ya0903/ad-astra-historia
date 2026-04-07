import { describe, it, expect } from 'vitest'
import { COUNTRY_PERSONALITIES } from './countryPersonalities.js'
import { MODERN_COUNTRY_DATA } from './countryData.js'
import type { CountryPersonality } from './types.js'

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
