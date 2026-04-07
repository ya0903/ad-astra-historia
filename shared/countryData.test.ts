import { describe, it, expect } from 'vitest'
import { MODERN_COUNTRY_DATA, type CountryBaseData } from './countryData.js'

describe('MODERN_COUNTRY_DATA', () => {
  const entries = Object.entries(MODERN_COUNTRY_DATA)
  const countries = Object.values(MODERN_COUNTRY_DATA)

  it('contains at least 190 countries', () => {
    expect(entries.length).toBeGreaterThanOrEqual(190)
  })

  it('USA has correct data', () => {
    const usa = MODERN_COUNTRY_DATA['USA']
    expect(usa).toBeDefined()
    expect(usa.name).toBe('United States')
    expect(usa.population).toBeGreaterThan(320_000_000)
    expect(usa.population).toBeLessThan(350_000_000)
    expect(usa.gdp).toBeGreaterThan(20_000_000_000_000)
    expect(usa.nuclearCapable).toBe(true)
    expect(usa.governmentType).toBe('federal_republic')
  })

  it('China has correct data', () => {
    const chn = MODERN_COUNTRY_DATA['CHN']
    expect(chn).toBeDefined()
    expect(chn.population).toBeGreaterThan(1_400_000_000)
    expect(chn.gdp).toBeGreaterThan(15_000_000_000_000)
    expect(chn.nuclearCapable).toBe(true)
  })

  it('no zero-population countries', () => {
    for (const [code, country] of entries) {
      expect(country.population, `${code} has zero population`).toBeGreaterThan(0)
    }
  })

  it('no zero-GDP countries', () => {
    for (const [code, country] of entries) {
      expect(country.gdp, `${code} has zero GDP`).toBeGreaterThan(0)
    }
  })

  it('sector percentages sum to roughly 100 (between 90-110)', () => {
    for (const [code, country] of entries) {
      const sum = country.sectorAgriculture + country.sectorIndustry + country.sectorServices
      expect(sum, `${code} sectors sum to ${sum}`).toBeGreaterThanOrEqual(90)
      expect(sum, `${code} sectors sum to ${sum}`).toBeLessThanOrEqual(110)
    }
  })

  it('all required fields present for every country', () => {
    const requiredFields: (keyof CountryBaseData)[] = [
      'iso3', 'name', 'continent', 'subregion',
      'population', 'populationGrowthRate', 'urbanisationRate', 'medianAge',
      'gdp', 'gdpPerCapita', 'gdpGrowthRate',
      'sectorAgriculture', 'sectorIndustry', 'sectorServices',
      'debtToGdpRatio', 'inflationRate',
      'hdi', 'educationIndex', 'giniCoefficient',
      'activePersonnel', 'defenceSpendingPct', 'nuclearCapable',
      'governmentType', 'corruptionIndex',
      'areaKm2', 'landlocked', 'strategicPassages',
    ]

    for (const [code, country] of entries) {
      for (const field of requiredFields) {
        expect(country[field], `${code} missing field ${field}`).not.toBeUndefined()
      }
    }
  })

  it('ISO3 key matches iso3 field', () => {
    for (const [code, country] of entries) {
      expect(country.iso3, `Key ${code} does not match iso3 ${country.iso3}`).toBe(code)
    }
  })

  it('exactly 9 nuclear-capable countries', () => {
    const nuclear = countries.filter(c => c.nuclearCapable)
    expect(nuclear.map(c => c.iso3).sort()).toEqual(
      ['CHN', 'FRA', 'GBR', 'IND', 'ISR', 'PAK', 'PRK', 'RUS', 'USA']
    )
  })

  it('HDI values are between 0 and 1', () => {
    for (const [code, country] of entries) {
      expect(country.hdi, `${code} HDI out of range`).toBeGreaterThanOrEqual(0)
      expect(country.hdi, `${code} HDI out of range`).toBeLessThanOrEqual(1)
    }
  })

  it('government types are valid', () => {
    const validTypes = new Set([
      'democracy', 'federal_republic', 'republic', 'constitutional_monarchy',
      'absolute_monarchy', 'communist', 'authoritarian', 'theocracy',
      'military_junta', 'transitional',
    ])
    for (const [code, country] of entries) {
      expect(validTypes.has(country.governmentType), `${code} has invalid governmentType: ${country.governmentType}`).toBe(true)
    }
  })
})
