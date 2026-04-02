import type { Era } from './types.js'

export const COUNTRY_COLOURS: Record<string, string> = {
  // ── Americas ───────────────────────────────────────────────────────────────
  USA: '#3C3B6E', CAN: '#FF0000', MEX: '#006847', BRA: '#009C3B',
  ARG: '#74ACDF', CHL: '#D52B1E', COL: '#FCD116', VEN: '#CF142B',
  PER: '#D91023', BOL: '#D52B1E', URY: '#0038A8', PRY: '#D52B1E',
  ECU: '#003893', GUY: '#009E60', SUR: '#377E3F', TTO: '#CE1126',
  BLZ: '#003F87', GTM: '#4997D0', HND: '#0073CF', SLV: '#0F47AF',
  NIC: '#3A75C4', CRI: '#002B7F', PAN: '#0038A8', CUB: '#002A8F',
  DOM: '#002D62', HTI: '#00209F', JAM: '#009B3A',
  // ── Western Europe ────────────────────────────────────────────────────────
  GBR: '#012169', FRA: '#0055A4', DEU: '#DD0000', ITA: '#009246',
  ESP: '#AA151B', PRT: '#006600', NLD: '#AE1C28', BEL: '#EF3340',
  CHE: '#FF0000', AUT: '#ED2939', POL: '#DC143C', CZE: '#D7141A',
  HUN: '#CE2939', ROU: '#002B7F', BGR: '#009B74', GRC: '#0D5EAF',
  SWE: '#006AA7', NOR: '#EF2B2D', DNK: '#C60C30', FIN: '#003580',
  IRL: '#169B62', LUX: '#EF3340', ISL: '#003897', MLT: '#CF142B',
  CYP: '#4A90D9', AND: '#003DA5', MCO: '#CE1126', LIE: '#002B7F',
  SMR: '#5EB6E4',
  // ── Eastern Europe / Balkans ──────────────────────────────────────────────
  UKR: '#005BBB', BLR: '#CF101A', MDA: '#003DA5', LTU: '#FDB913',
  LVA: '#9E3039', EST: '#0072CE', RUS: '#0039A6',
  SVK: '#EE1C25', SVN: '#003DA5', HRV: '#FF0000', BIH: '#002395',
  SRB: '#C6363C', MKD: '#CE2028', MNE: '#D4AF37', ALB: '#E41E20',
  XKX: '#244AA5', KOS: '#244AA5',
  // ── Central Asia ─────────────────────────────────────────────────────────
  KAZ: '#00AFCA', UZB: '#1EB53A', TKM: '#1B9B4F', KGZ: '#E8112D',
  TJK: '#CC0000',
  // ── East Asia ─────────────────────────────────────────────────────────────
  CHN: '#DE2910', JPN: '#BC002D', KOR: '#CD2E3A', PRK: '#024FA2',
  MNG: '#C4272F', TWN: '#FE0000', HKG: '#DE2110',
  // ── South / SE Asia ───────────────────────────────────────────────────────
  IND: '#FF9933', PAK: '#01411C', BGD: '#006A4E', LKA: '#8D153A',
  NPL: '#CA0000', BTN: '#FF8000', MDV: '#D21034', AFG: '#009A44',
  VNM: '#DA251D', THA: '#A51931', MMR: '#FECB00', KHM: '#032EA1',
  LAO: '#CE1126', MYS: '#CC0001', SGP: '#EF3340', IDN: '#CE1126',
  PHL: '#0038A8', BRN: '#F7E017', TLS: '#DC241F',
  // ── Middle East ───────────────────────────────────────────────────────────
  IRN: '#239F40', IRQ: '#CE1126', SAU: '#006C35', ARE: '#00732F',
  KWT: '#007A3D', QAT: '#8D1B3D', BHR: '#CE1126', OMN: '#DB161B',
  YEM: '#CE1126', JOR: '#007A3D', ISR: '#0038B8', LBN: '#00A651',
  SYR: '#007A3D', TUR: '#E30A17', GEO: '#FF0000', ARM: '#D90012',
  AZE: '#0092BC', PSE: '#007A3D',
  // ── North Africa ──────────────────────────────────────────────────────────
  EGY: '#CE1126', LBY: '#239E46', TUN: '#E70013',
  DZA: '#006233', MAR: '#C1272D',
  // ── West Africa ───────────────────────────────────────────────────────────
  MRT: '#006233', MLI: '#009A00', NER: '#0DB02B', NGA: '#008751',
  GHA: '#006B3F', CIV: '#F77F00', SEN: '#00853F',
  GMB: '#3A7728', GNB: '#CE1126', GIN: '#CE1126', SLE: '#1EB53A',
  LBR: '#BF0A30', BFA: '#EF2B2D', BEN: '#008751', TGO: '#006A4E',
  GNQ: '#3E9A00', CMR: '#007A5E', GAB: '#009E60',
  // ── Central & East Africa ────────────────────────────────────────────────
  COD: '#007FFF', COG: '#009A44', CAF: '#003082', TCD: '#002664',
  SDN: '#007229', SSD: '#078930', ETH: '#078930', ERI: '#4189DD',
  DJI: '#6AB2E7', SOM: '#4189DD', UGA: '#CE1126', KEN: '#006600',
  TZA: '#1EB53A', RWA: '#20603D', BDI: '#CE1126',
  AGO: '#CC0000',
  // ── Southern Africa ───────────────────────────────────────────────────────
  ZAF: '#007A4D', ZWE: '#006400', ZMB: '#198A00', MOZ: '#009A44',
  MWI: '#CE1126', NAM: '#003580', BWA: '#75AADB', LSO: '#009A44',
  SWZ: '#3E5EB9', MDG: '#FC3D32',
  // ── Pacific / Oceania ─────────────────────────────────────────────────────
  AUS: '#012169', NZL: '#012169', PNG: '#CE1126', FJI: '#68BFE5',
  SLB: '#0120B8', VUT: '#009A44', WSM: '#CE1126', TON: '#C10000',
  // ── Historical ────────────────────────────────────────────────────────────
  SUN: '#CC0000',   // USSR
  DDR: '#CC0000',   // East Germany
  FRG: '#DD0000',   // West Germany
  YUG: '#0039A6',   // Yugoslavia
  CSK: '#D7141A',   // Czechoslovakia
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
