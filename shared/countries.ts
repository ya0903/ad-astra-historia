import type { Era } from './types.js'

export const COUNTRY_COLOURS: Record<string, string> = {
  // ── Americas ───────────────────────────────────────────────────────────────
  USA: '#3b82f6', CAN: '#f97316', MEX: '#22c55e', BRA: '#eab308',
  ARG: '#06b6d4', CHL: '#8b5cf6', COL: '#f43f5e', VEN: '#84cc16',
  PER: '#ec4899', BOL: '#14b8a6', URY: '#f59e0b', PRY: '#6366f1',
  ECU: '#10b981', GUY: '#ef4444', SUR: '#0ea5e9', TTO: '#a78bfa',
  BLZ: '#22d3ee', GTM: '#f97316', HND: '#84cc16', SLV: '#ec4899',
  NIC: '#facc15', CRI: '#0ea5e9', PAN: '#f43f5e', CUB: '#f97316',
  DOM: '#3b82f6', HTI: '#a78bfa', JAM: '#22c55e',
  // ── Western Europe ────────────────────────────────────────────────────────
  GBR: '#dc2626', FRA: '#2563eb', DEU: '#16a34a', ITA: '#ca8a04',
  ESP: '#9333ea', PRT: '#0891b2', NLD: '#d97706', BEL: '#7c3aed',
  CHE: '#059669', AUT: '#db2777', POL: '#1d4ed8', CZE: '#65a30d',
  HUN: '#c2410c', ROU: '#0284c7', BGR: '#7e22ce', GRC: '#0f766e',
  SWE: '#b45309', NOR: '#1e40af', DNK: '#15803d', FIN: '#be185d',
  IRL: '#16a34a', LUX: '#f59e0b', ISL: '#06b6d4', MLT: '#dc2626',
  CYP: '#b45309', AND: '#9333ea', MCO: '#ef4444', LIE: '#0891b2',
  SMR: '#1d4ed8',
  // ── Eastern Europe / Balkans ──────────────────────────────────────────────
  UKR: '#1e3a8a', BLR: '#166534', MDA: '#92400e', LTU: '#8b5cf6',
  LVA: '#0284c7', EST: '#16a34a', RUS: '#7f1d1d',
  SVK: '#f43f5e', SVN: '#0ea5e9', HRV: '#f97316', BIH: '#6366f1',
  SRB: '#dc2626', MKD: '#f59e0b', MNE: '#14b8a6', ALB: '#b91c1c',
  XKX: '#a78bfa', KOS: '#a78bfa',
  // ── Central Asia ─────────────────────────────────────────────────────────
  KAZ: '#84cc16', UZB: '#f43f5e', TKM: '#0ea5e9', KGZ: '#f59e0b',
  TJK: '#a78bfa',
  // ── East Asia ─────────────────────────────────────────────────────────────
  CHN: '#ef4444', JPN: '#f9a8d4', KOR: '#818cf8', PRK: '#1e40af',
  MNG: '#a3e635', TWN: '#ec4899', HKG: '#84cc16',
  // ── South / SE Asia ───────────────────────────────────────────────────────
  IND: '#f97316', PAK: '#1d4ed8', BGD: '#10b981', LKA: '#9333ea',
  NPL: '#ca8a04', BTN: '#0f766e', MDV: '#7c3aed', AFG: '#8b5cf6',
  VNM: '#16a34a', THA: '#f59e0b', MMR: '#dc2626', KHM: '#8b5cf6',
  LAO: '#06b6d4', MYS: '#f97316', SGP: '#22c55e', IDN: '#eab308',
  PHL: '#3b82f6', BRN: '#f43f5e', TLS: '#22d3ee',
  // ── Middle East ───────────────────────────────────────────────────────────
  IRN: '#059669', IRQ: '#b91c1c', SAU: '#1e3a8a', ARE: '#164e63',
  KWT: '#8b5cf6', QAT: '#0c4a6e', BHR: '#5b21b6', OMN: '#b45309',
  YEM: '#92400e', JOR: '#ca8a04', ISR: '#1e40af', LBN: '#065f46',
  SYR: '#6b21a8', TUR: '#c2410c', GEO: '#0d9488', ARM: '#7c3aed',
  AZE: '#f59e0b', PSE: '#065f46',
  // ── North Africa ──────────────────────────────────────────────────────────
  EGY: '#15803d', LBY: '#be185d', TUN: '#0891b2',
  DZA: '#92400e', MAR: '#7e22ce',
  // ── West Africa ───────────────────────────────────────────────────────────
  MRT: '#1e3a8a', MLI: '#f59e0b', NER: '#0284c7', NGA: '#16a34a',
  GHA: '#f43f5e', CIV: '#f97316', SEN: '#6b21a8',
  GMB: '#14b8a6', GNB: '#84cc16', GIN: '#dc2626', SLE: '#0ea5e9',
  LBR: '#b91c1c', BFA: '#ca8a04', BEN: '#9333ea', TGO: '#22c55e',
  GNQ: '#0891b2', CMR: '#f59e0b', GAB: '#16a34a',
  // ── Central & East Africa ────────────────────────────────────────────────
  COD: '#b45309', COG: '#1e3a8a', CAF: '#dc2626', TCD: '#1d4ed8',
  SDN: '#b45309', SSD: '#16a34a', ETH: '#a78bfa', ERI: '#0ea5e9',
  DJI: '#f43f5e', SOM: '#f97316', UGA: '#ca8a04', KEN: '#ef4444',
  TZA: '#0284c7', RWA: '#f59e0b', BDI: '#9333ea',
  AGO: '#0d9488',
  // ── Southern Africa ───────────────────────────────────────────────────────
  ZAF: '#0c4a6e', ZWE: '#dc2626', ZMB: '#f97316', MOZ: '#5b21b6',
  MWI: '#22c55e', NAM: '#eab308', BWA: '#06b6d4', LSO: '#f43f5e',
  SWZ: '#84cc16', MDG: '#ca8a04',
  // ── Pacific / Oceania ─────────────────────────────────────────────────────
  AUS: '#f97316', NZL: '#3b82f6', PNG: '#22c55e', FJI: '#eab308',
  SLB: '#0ea5e9', VUT: '#16a34a', WSM: '#f43f5e', TON: '#f59e0b',
  // ── Historical ────────────────────────────────────────────────────────────
  SUN: '#7f1d1d',   // USSR
  DDR: '#4d7c0f',   // East Germany
  FRG: '#16a34a',   // West Germany
  YUG: '#0f766e',   // Yugoslavia
  CSK: '#1d4ed8',   // Czechoslovakia
}

export const ERA_START_DATES: Record<Era, string> = {
  '1945': '1945-09-02',
  '1960s': '1960-01-01',
  '1990s': '1991-01-01',
  '2010s': '2010-01-01',
  'modern': '2024-01-01',
}

export function getCountryColour(isoA3: string): string {
  // Fallback to a dark steel-blue — never grey
  return COUNTRY_COLOURS[isoA3] ?? '#1a4a7a'
}
