import { ERA_USD_CONVERSION_RATE, ERA_CURRENCY_UNIT, isHistoricalEra, type AnyEraId } from '@ad-astra/shared/eraConfig'

export type CurrencyMode = 'coin' | 'paper' | 'fiat'
export type DisplayMode = 'native' | 'usd'

const INDUSTRIAL_OR_LATER = new Set([
  'industrial_dawn', 'great_war', 'interwar',
  '1945', '1960s', '1990s', '2010s', 'modern',
])

/** Determine the currency mode based on era + whether banking has been researched. */
export function getCurrencyMode(era: AnyEraId | string, hasPaperMoney: boolean): CurrencyMode {
  if (INDUSTRIAL_OR_LATER.has(era)) return 'fiat'
  if (hasPaperMoney) return 'paper'
  return 'coin'
}

/** Returns the icon emoji for a currency mode. */
export function getCurrencyIcon(mode: CurrencyMode): string {
  switch (mode) {
    case 'coin': return '🪙'
    case 'paper': return '📜'
    case 'fiat': return '💰'
  }
}

/** Returns the unit name for an era — 'talents', 'ducats', 'USD', etc. */
export function getCurrencyUnit(era: AnyEraId | string): string {
  if (INDUSTRIAL_OR_LATER.has(era)) return 'USD'
  if (isHistoricalEra(era)) return ERA_CURRENCY_UNIT[era]
  return 'USD'
}

/**
 * Format a money amount in the appropriate units for the given era.
 *
 * @param amount  raw amount stored in game state (USD-equivalent for modern, native for ancient)
 * @param era     current era ID
 * @param display 'native' shows era currency, 'usd' shows USD-equivalent
 */
export function formatCurrency(
  amount: number,
  era: AnyEraId | string,
  display: DisplayMode = 'native',
): string {
  const isFiat = INDUSTRIAL_OR_LATER.has(era)
  if (isFiat) return formatUsd(amount)

  const rate = ERA_USD_CONVERSION_RATE[era as keyof typeof ERA_USD_CONVERSION_RATE] ?? 1
  const native = Math.round(amount / rate)

  if (display === 'usd') {
    return `${formatNumber(native)} ${getCurrencyUnit(era)} (${formatUsd(amount)} USD eq.)`
  }
  return `${formatNumber(native)} ${getCurrencyUnit(era)}`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatUsd(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}
