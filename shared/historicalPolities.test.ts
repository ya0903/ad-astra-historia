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
  it('has at least 20 entries spanning major eras', () => {
    expect(Object.keys(HISTORICAL_POLITIES).length).toBeGreaterThanOrEqual(20)
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
