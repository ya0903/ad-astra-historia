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
