import type { Era } from './types.js'

export const COUNTRY_COLOURS: Record<string, string> = {
  USA: '#3b82f6', CAN: '#f97316', MEX: '#22c55e', BRA: '#eab308',
  ARG: '#06b6d4', CHL: '#8b5cf6', COL: '#f43f5e', VEN: '#84cc16',
  PER: '#ec4899', BOL: '#14b8a6', URY: '#f59e0b', PRY: '#6366f1',
  ECU: '#10b981', GUY: '#ef4444', SUR: '#0ea5e9', TTO: '#a78bfa',
  GBR: '#dc2626', FRA: '#2563eb', DEU: '#16a34a', ITA: '#ca8a04',
  ESP: '#9333ea', PRT: '#0891b2', NLD: '#d97706', BEL: '#7c3aed',
  CHE: '#059669', AUT: '#db2777', POL: '#1d4ed8', CZE: '#65a30d',
  HUN: '#c2410c', ROU: '#0284c7', BGR: '#7e22ce', GRC: '#0f766e',
  SWE: '#b45309', NOR: '#1e40af', DNK: '#15803d', FIN: '#be185d',
  UKR: '#1e3a8a', BLR: '#166534', MDA: '#92400e', LTU: '#5b21b6',
  LVA: '#0c4a6e', EST: '#14532d', RUS: '#1c1917', KAZ: '#365314',
  UZB: '#1e1b4b', TKM: '#064e3b', KGZ: '#422006', TJK: '#4a044e',
  CHN: '#ef4444', JPN: '#f9a8d4', KOR: '#818cf8', PRK: '#4b5563',
  MNG: '#a3e635', VNM: '#16a34a', THA: '#f59e0b', MMR: '#dc2626',
  KHM: '#8b5cf6', LAO: '#06b6d4', MYS: '#f97316', SGP: '#22c55e',
  IDN: '#eab308', PHL: '#3b82f6', TWN: '#ec4899', HKG: '#84cc16',
  BGD: '#10b981', IND: '#f97316', PAK: '#1d4ed8', LKA: '#9333ea',
  NPL: '#ca8a04', BTN: '#0f766e', MDV: '#7c3aed', AFG: '#374151',
  IRN: '#059669', IRQ: '#b91c1c', SAU: '#1e3a8a', ARE: '#164e63',
  KWT: '#4a044e', QAT: '#0c4a6e', BHR: '#5b21b6', OMN: '#78350f',
  YEM: '#422006', JOR: '#7f1d1d', ISR: '#1e40af', LBN: '#064e3b',
  SYR: '#365314', TUR: '#c2410c', GEO: '#6b21a8', ARM: '#0d9488',
  AZE: '#b45309', EGY: '#15803d', LBY: '#be185d', TUN: '#0891b2',
  DZA: '#92400e', MAR: '#7e22ce', MRT: '#166534', MLI: '#1c1917',
  NER: '#1e1b4b', NGA: '#065f46', CMR: '#4d7c0f', SDN: '#78350f',
  ETH: '#92400e', SOM: '#1f2937', KEN: '#064e3b', TZA: '#1a1a2e',
  UGA: '#365314', MOZ: '#5b21b6', ZAF: '#0c4a6e', ZWE: '#7f1d1d',
  ZMB: '#422006', AGO: '#0d9488', COD: '#b45309', COG: '#1e3a8a',
  GAB: '#166534', GHA: '#be185d', CIV: '#0891b2', SEN: '#6b21a8',
  AUS: '#f97316', NZL: '#3b82f6', PNG: '#22c55e', FJI: '#eab308',
  // USSR (used in 1945/1960s eras)
  SUN: '#7f1d1d',
  // East/West Germany
  DDR: '#374151', FRG: '#16a34a',
  // Yugoslavia
  YUG: '#0f766e',
  // Czechoslovakia
  CSK: '#1d4ed8',
}

export const ERA_START_DATES: Record<string, string> = {
  '1945': '1945-09-02',
  '1960s': '1960-01-01',
  '1990s': '1991-01-01',
  '2010s': '2010-01-01',
  'modern': '2024-01-01',
}

export function getCountryColour(isoA3: string): string {
  return COUNTRY_COLOURS[isoA3] ?? '#6b7280'
}
