import { describe, it, expect } from 'vitest'
import { HISTORICAL_TECH_TREES, getTreeForEra } from './historicalEraTechTrees.js'
import { HISTORICAL_ERAS } from './eraConfig.js'

describe('HISTORICAL_TECH_TREES', () => {
  it('has a tech tree for every historical era', () => {
    for (const era of HISTORICAL_ERAS) {
      expect(HISTORICAL_TECH_TREES[era.id]).toBeDefined()
      expect(HISTORICAL_TECH_TREES[era.id].length).toBeGreaterThanOrEqual(4)
    }
  })
  it('every era has at least one capstone tech', () => {
    for (const era of HISTORICAL_ERAS) {
      const tree = HISTORICAL_TECH_TREES[era.id]
      expect(tree.some(n => n.isCapstone)).toBe(true)
    }
  })
  it('high_medieval has banking_paper_money tech', () => {
    const tree = HISTORICAL_TECH_TREES['high_medieval']
    expect(tree.some(n => n.id === 'banking_paper_money')).toBe(true)
  })
  it('every node has id, name, cost, prerequisites', () => {
    for (const tree of Object.values(HISTORICAL_TECH_TREES)) {
      for (const node of tree) {
        expect(node.id).toBeDefined()
        expect(node.name).toBeDefined()
        expect(node.cost).toBeGreaterThan(0)
        expect(Array.isArray(node.prerequisites)).toBe(true)
      }
    }
  })
})

describe('getTreeForEra', () => {
  it('returns the tree for a known era', () => {
    expect(getTreeForEra('classical_greek').length).toBeGreaterThan(0)
  })
  it('returns empty array for unknown era', () => {
    expect(getTreeForEra('nonexistent' as any)).toEqual([])
  })
})
