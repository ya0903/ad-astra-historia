import { describe, it, expect } from 'vitest'
import { formatCurrency, getCurrencyMode, getCurrencyIcon, getCurrencyUnit } from './currency'

describe('formatCurrency', () => {
  it('formats fiat USD for modern eras', () => {
    expect(formatCurrency(1_500_000_000, 'modern', 'native')).toBe('$1.5B')
  })
  it('formats coin currency for ancient eras', () => {
    const out = formatCurrency(37_500, 'classical_greek', 'native')
    expect(out).toContain('15')
    expect(out).toContain('talents')
  })
  it('formats with USD equivalent toggle', () => {
    const out = formatCurrency(37_500, 'classical_greek', 'usd')
    expect(out).toContain('USD')
  })
})

describe('getCurrencyMode', () => {
  it('returns coin for ancient pre-banking', () => {
    expect(getCurrencyMode('classical_greek', false)).toBe('coin')
  })
  it('returns paper after banking unlocked', () => {
    expect(getCurrencyMode('high_medieval', true)).toBe('paper')
  })
  it('returns fiat for industrial+', () => {
    expect(getCurrencyMode('industrial_dawn', false)).toBe('fiat')
    expect(getCurrencyMode('modern', false)).toBe('fiat')
  })
})

describe('getCurrencyIcon', () => {
  it('returns 🪙 for coin mode', () => {
    expect(getCurrencyIcon('coin')).toBe('🪙')
  })
  it('returns 📜 for paper mode', () => {
    expect(getCurrencyIcon('paper')).toBe('📜')
  })
  it('returns 💰 for fiat mode', () => {
    expect(getCurrencyIcon('fiat')).toBe('💰')
  })
})

describe('getCurrencyUnit', () => {
  it('returns talents for classical_greek', () => {
    expect(getCurrencyUnit('classical_greek')).toBe('talents')
  })
  it('returns ducats for ottoman_classical', () => {
    expect(getCurrencyUnit('ottoman_classical')).toBe('ducats')
  })
  it('returns USD for modern eras', () => {
    expect(getCurrencyUnit('modern')).toBe('USD')
  })
})
