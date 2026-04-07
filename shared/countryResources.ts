/**
 * Natural resources by country — real-world reserves used to calculate
 * monthly income from nationalised extraction + exports.
 *
 * Each entry maps a country ISO_A3 to the resources it has significant
 * reserves of. Monthly income = baseIncome * abundance * extractionLevel
 * (* exportMultiplier if exports enabled).
 */

export type ResourceType =
  | 'oil' | 'natural_gas' | 'coal'
  | 'copper' | 'iron' | 'gold' | 'silver' | 'lithium' | 'rare_earth' | 'uranium'
  | 'diamonds' | 'cobalt' | 'nickel' | 'aluminium' | 'zinc' | 'tin'
  | 'timber' | 'fisheries' | 'farmland' | 'coffee' | 'cocoa' | 'rubber'
  | 'phosphate' | 'potash'

export interface ResourceDeposit {
  type: ResourceType
  /** 1-5 abundance score. 5 = world-class reserves (Saudi oil, Chilean copper). */
  abundance: number
}

/** Base monthly income in USD from fully extracting one unit of abundance */
export const RESOURCE_BASE_INCOME: Record<ResourceType, number> = {
  oil:          80_000_000,   // $80M/mo per abundance unit — huge income
  natural_gas:  50_000_000,
  coal:         20_000_000,
  copper:       30_000_000,
  iron:         18_000_000,
  gold:         40_000_000,
  silver:       12_000_000,
  lithium:      45_000_000,   // strategic battery metal
  rare_earth:   55_000_000,   // strategic tech metals
  uranium:      25_000_000,
  diamonds:     22_000_000,
  cobalt:       30_000_000,
  nickel:       20_000_000,
  aluminium:    15_000_000,
  zinc:         10_000_000,
  tin:          8_000_000,
  timber:       10_000_000,
  fisheries:    12_000_000,
  farmland:     25_000_000,   // major agricultural exporters
  coffee:       15_000_000,
  cocoa:        12_000_000,
  rubber:       10_000_000,
  phosphate:    8_000_000,
  potash:       10_000_000,
}

/**
 * Resource deposits by country ISO_A3.
 * Only countries with significant real-world reserves are listed.
 * Abundance 1 = minor, 5 = world-class.
 */
export const COUNTRY_RESOURCES: Record<string, ResourceDeposit[]> = {
  // ── Major oil producers ──
  SAU: [{ type: 'oil', abundance: 5 }, { type: 'natural_gas', abundance: 3 }],
  RUS: [{ type: 'oil', abundance: 5 }, { type: 'natural_gas', abundance: 5 }, { type: 'coal', abundance: 4 }, { type: 'iron', abundance: 3 }, { type: 'gold', abundance: 3 }, { type: 'timber', abundance: 5 }, { type: 'uranium', abundance: 3 }],
  USA: [{ type: 'oil', abundance: 4 }, { type: 'natural_gas', abundance: 5 }, { type: 'coal', abundance: 4 }, { type: 'farmland', abundance: 5 }, { type: 'timber', abundance: 4 }, { type: 'copper', abundance: 3 }, { type: 'gold', abundance: 3 }],
  IRN: [{ type: 'oil', abundance: 5 }, { type: 'natural_gas', abundance: 5 }],
  IRQ: [{ type: 'oil', abundance: 5 }, { type: 'natural_gas', abundance: 3 }],
  VEN: [{ type: 'oil', abundance: 5 }, { type: 'gold', abundance: 3 }, { type: 'iron', abundance: 3 }],
  ARE: [{ type: 'oil', abundance: 4 }, { type: 'natural_gas', abundance: 3 }],
  KWT: [{ type: 'oil', abundance: 5 }, { type: 'natural_gas', abundance: 3 }],
  QAT: [{ type: 'natural_gas', abundance: 5 }, { type: 'oil', abundance: 3 }],
  NOR: [{ type: 'oil', abundance: 4 }, { type: 'natural_gas', abundance: 4 }, { type: 'fisheries', abundance: 5 }, { type: 'timber', abundance: 3 }],
  CAN: [{ type: 'oil', abundance: 4 }, { type: 'natural_gas', abundance: 3 }, { type: 'timber', abundance: 5 }, { type: 'uranium', abundance: 4 }, { type: 'nickel', abundance: 4 }, { type: 'gold', abundance: 3 }, { type: 'farmland', abundance: 4 }],
  LBY: [{ type: 'oil', abundance: 4 }, { type: 'natural_gas', abundance: 3 }],
  DZA: [{ type: 'natural_gas', abundance: 4 }, { type: 'oil', abundance: 3 }],
  NGA: [{ type: 'oil', abundance: 4 }, { type: 'natural_gas', abundance: 3 }],
  AGO: [{ type: 'oil', abundance: 4 }, { type: 'diamonds', abundance: 3 }],
  KAZ: [{ type: 'oil', abundance: 4 }, { type: 'uranium', abundance: 5 }, { type: 'coal', abundance: 3 }, { type: 'copper', abundance: 3 }],
  AZE: [{ type: 'oil', abundance: 3 }, { type: 'natural_gas', abundance: 3 }],
  BRN: [{ type: 'oil', abundance: 4 }, { type: 'natural_gas', abundance: 4 }],
  TKM: [{ type: 'natural_gas', abundance: 5 }],
  GBR: [{ type: 'oil', abundance: 2 }, { type: 'natural_gas', abundance: 2 }, { type: 'fisheries', abundance: 3 }],

  // ── Major mining countries ──
  AUS: [{ type: 'iron', abundance: 5 }, { type: 'coal', abundance: 5 }, { type: 'gold', abundance: 4 }, { type: 'lithium', abundance: 5 }, { type: 'uranium', abundance: 4 }, { type: 'aluminium', abundance: 4 }, { type: 'copper', abundance: 3 }, { type: 'zinc', abundance: 4 }, { type: 'rare_earth', abundance: 3 }, { type: 'farmland', abundance: 3 }],
  CHL: [{ type: 'copper', abundance: 5 }, { type: 'lithium', abundance: 5 }, { type: 'gold', abundance: 3 }, { type: 'fisheries', abundance: 3 }],
  PER: [{ type: 'copper', abundance: 4 }, { type: 'gold', abundance: 4 }, { type: 'silver', abundance: 4 }, { type: 'zinc', abundance: 4 }, { type: 'tin', abundance: 3 }, { type: 'fisheries', abundance: 4 }],
  COD: [{ type: 'cobalt', abundance: 5 }, { type: 'copper', abundance: 4 }, { type: 'diamonds', abundance: 4 }, { type: 'gold', abundance: 3 }, { type: 'tin', abundance: 3 }, { type: 'timber', abundance: 4 }],
  ZMB: [{ type: 'copper', abundance: 4 }, { type: 'cobalt', abundance: 3 }],
  ZAF: [{ type: 'gold', abundance: 4 }, { type: 'diamonds', abundance: 4 }, { type: 'coal', abundance: 4 }, { type: 'iron', abundance: 3 }, { type: 'rare_earth', abundance: 3 }, { type: 'farmland', abundance: 3 }],
  CHN: [{ type: 'rare_earth', abundance: 5 }, { type: 'coal', abundance: 5 }, { type: 'iron', abundance: 4 }, { type: 'gold', abundance: 3 }, { type: 'aluminium', abundance: 4 }, { type: 'farmland', abundance: 4 }, { type: 'tin', abundance: 3 }],
  BRA: [{ type: 'iron', abundance: 5 }, { type: 'farmland', abundance: 5 }, { type: 'timber', abundance: 5 }, { type: 'coffee', abundance: 5 }, { type: 'gold', abundance: 3 }, { type: 'oil', abundance: 3 }],
  IND: [{ type: 'coal', abundance: 4 }, { type: 'iron', abundance: 4 }, { type: 'farmland', abundance: 4 }, { type: 'rare_earth', abundance: 2 }],
  IDN: [{ type: 'coal', abundance: 4 }, { type: 'nickel', abundance: 5 }, { type: 'tin', abundance: 4 }, { type: 'timber', abundance: 4 }, { type: 'rubber', abundance: 4 }, { type: 'cocoa', abundance: 3 }, { type: 'gold', abundance: 3 }, { type: 'oil', abundance: 3 }, { type: 'natural_gas', abundance: 3 }],
  PHL: [{ type: 'nickel', abundance: 4 }, { type: 'copper', abundance: 3 }, { type: 'gold', abundance: 3 }],
  MEX: [{ type: 'silver', abundance: 5 }, { type: 'copper', abundance: 3 }, { type: 'gold', abundance: 3 }, { type: 'oil', abundance: 3 }, { type: 'farmland', abundance: 3 }],
  ARG: [{ type: 'lithium', abundance: 4 }, { type: 'farmland', abundance: 5 }, { type: 'natural_gas', abundance: 3 }, { type: 'oil', abundance: 3 }],
  BOL: [{ type: 'lithium', abundance: 5 }, { type: 'silver', abundance: 3 }, { type: 'tin', abundance: 3 }, { type: 'natural_gas', abundance: 3 }],
  GHA: [{ type: 'gold', abundance: 4 }, { type: 'cocoa', abundance: 4 }, { type: 'oil', abundance: 2 }],
  CIV: [{ type: 'cocoa', abundance: 5 }, { type: 'coffee', abundance: 3 }, { type: 'timber', abundance: 3 }],
  COL: [{ type: 'coffee', abundance: 4 }, { type: 'oil', abundance: 3 }, { type: 'coal', abundance: 3 }, { type: 'gold', abundance: 3 }],
  ECU: [{ type: 'oil', abundance: 3 }, { type: 'cocoa', abundance: 3 }, { type: 'fisheries', abundance: 3 }],
  MYS: [{ type: 'oil', abundance: 3 }, { type: 'natural_gas', abundance: 4 }, { type: 'rubber', abundance: 3 }, { type: 'tin', abundance: 4 }, { type: 'timber', abundance: 3 }],
  VNM: [{ type: 'coffee', abundance: 4 }, { type: 'rubber', abundance: 3 }, { type: 'oil', abundance: 2 }, { type: 'rare_earth', abundance: 3 }],
  THA: [{ type: 'rubber', abundance: 5 }, { type: 'farmland', abundance: 4 }, { type: 'tin', abundance: 3 }],
  MMR: [{ type: 'natural_gas', abundance: 3 }, { type: 'timber', abundance: 3 }, { type: 'rare_earth', abundance: 2 }],
  MNG: [{ type: 'coal', abundance: 4 }, { type: 'copper', abundance: 4 }, { type: 'gold', abundance: 3 }, { type: 'uranium', abundance: 3 }],
  UZB: [{ type: 'gold', abundance: 4 }, { type: 'uranium', abundance: 3 }, { type: 'natural_gas', abundance: 3 }],
  UKR: [{ type: 'iron', abundance: 4 }, { type: 'farmland', abundance: 5 }, { type: 'coal', abundance: 3 }, { type: 'potash', abundance: 2 }],
  BLR: [{ type: 'potash', abundance: 4 }, { type: 'timber', abundance: 3 }],
  FRA: [{ type: 'farmland', abundance: 4 }, { type: 'fisheries', abundance: 3 }, { type: 'timber', abundance: 3 }],
  DEU: [{ type: 'coal', abundance: 3 }, { type: 'farmland', abundance: 3 }, { type: 'timber', abundance: 3 }],
  POL: [{ type: 'coal', abundance: 4 }, { type: 'copper', abundance: 3 }, { type: 'farmland', abundance: 3 }],
  SWE: [{ type: 'iron', abundance: 4 }, { type: 'timber', abundance: 5 }, { type: 'rare_earth', abundance: 2 }],
  FIN: [{ type: 'timber', abundance: 5 }, { type: 'nickel', abundance: 2 }],
  NZL: [{ type: 'fisheries', abundance: 4 }, { type: 'farmland', abundance: 4 }, { type: 'timber', abundance: 3 }],
  ISL: [{ type: 'fisheries', abundance: 5 }, { type: 'aluminium', abundance: 3 }],
  JPN: [{ type: 'fisheries', abundance: 4 }],
  KOR: [{ type: 'fisheries', abundance: 3 }],
  TUR: [{ type: 'coal', abundance: 3 }, { type: 'farmland', abundance: 3 }, { type: 'rare_earth', abundance: 2 }],
  EGY: [{ type: 'natural_gas', abundance: 3 }, { type: 'phosphate', abundance: 3 }, { type: 'oil', abundance: 2 }, { type: 'farmland', abundance: 3 }],
  MAR: [{ type: 'phosphate', abundance: 5 }, { type: 'farmland', abundance: 3 }],
  ETH: [{ type: 'coffee', abundance: 4 }, { type: 'farmland', abundance: 3 }, { type: 'gold', abundance: 2 }],
  KEN: [{ type: 'coffee', abundance: 3 }, { type: 'farmland', abundance: 3 }],
  UGA: [{ type: 'coffee', abundance: 3 }],
  TZA: [{ type: 'gold', abundance: 3 }, { type: 'coffee', abundance: 2 }],
  NER: [{ type: 'uranium', abundance: 4 }],
  MLI: [{ type: 'gold', abundance: 4 }, { type: 'farmland', abundance: 3 }],
  GIN: [{ type: 'aluminium', abundance: 5 }, { type: 'iron', abundance: 3 }],
  ZWE: [{ type: 'gold', abundance: 3 }, { type: 'diamonds', abundance: 3 }, { type: 'rare_earth', abundance: 2 }],
  BWA: [{ type: 'diamonds', abundance: 5 }, { type: 'copper', abundance: 2 }],
  NAM: [{ type: 'diamonds', abundance: 4 }, { type: 'uranium', abundance: 4 }, { type: 'fisheries', abundance: 3 }],
  MOZ: [{ type: 'natural_gas', abundance: 4 }, { type: 'coal', abundance: 3 }, { type: 'aluminium', abundance: 3 }],
  PAK: [{ type: 'coal', abundance: 3 }, { type: 'farmland', abundance: 3 }, { type: 'natural_gas', abundance: 2 }],
  BGD: [{ type: 'natural_gas', abundance: 3 }, { type: 'farmland', abundance: 3 }],
  ISR: [{ type: 'natural_gas', abundance: 3 }, { type: 'phosphate', abundance: 2 }],
  OMN: [{ type: 'oil', abundance: 3 }, { type: 'natural_gas', abundance: 2 }],
  JOR: [{ type: 'phosphate', abundance: 4 }, { type: 'potash', abundance: 3 }],
  CUB: [{ type: 'nickel', abundance: 3 }, { type: 'farmland', abundance: 3 }],
  NIC: [{ type: 'coffee', abundance: 3 }],
  HND: [{ type: 'coffee', abundance: 3 }],
  CRI: [{ type: 'coffee', abundance: 3 }],
  GTM: [{ type: 'coffee', abundance: 3 }],
  PAN: [{ type: 'copper', abundance: 2 }],
  DOM: [{ type: 'gold', abundance: 3 }],
  LAO: [{ type: 'timber', abundance: 3 }, { type: 'copper', abundance: 3 }],
  KHM: [{ type: 'farmland', abundance: 3 }],
  PNG: [{ type: 'gold', abundance: 4 }, { type: 'copper', abundance: 4 }, { type: 'natural_gas', abundance: 3 }, { type: 'timber', abundance: 4 }],
  FJI: [{ type: 'gold', abundance: 2 }, { type: 'fisheries', abundance: 3 }],
}

/**
 * Returns the resource deposits for a country.
 * Empty array if the country has no significant resources.
 */
export function getCountryResources(iso: string): ResourceDeposit[] {
  return COUNTRY_RESOURCES[iso.toUpperCase()] ?? []
}

/**
 * Calculate monthly income from a nationalised resource.
 * - `level` is the player's extraction level (1-10 = small-scale to full-scale)
 * - `exportsAllowed` doubles the income (or 1.0 if domestic only)
 */
export function resourceMonthlyIncome(
  type: ResourceType,
  abundance: number,
  extractionLevel: number,
  exportsAllowed: boolean,
): number {
  const base = RESOURCE_BASE_INCOME[type] ?? 0
  // Extraction level scales 1x to 3.5x (level 1 = 1x, level 10 = 3.5x)
  const levelMultiplier = 1 + (extractionLevel - 1) * 0.28
  const exportMultiplier = exportsAllowed ? 2.0 : 1.0
  return Math.round(base * abundance * levelMultiplier * exportMultiplier)
}
