import type maplibregl from 'maplibre-gl'

// ISO_A3 → [lng, lat, zoom]
const COUNTRY_CENTRES: Record<string, [number, number, number]> = {
  AFG: [67.7, 33.9, 4],
  AGO: [17.9, -11.2, 4],
  ALB: [20.2, 41.2, 6],
  ARE: [53.8, 23.4, 6],
  ARG: [-63.6, -38.4, 3],
  ARM: [45.0, 40.1, 6],
  AUS: [133.8, -25.3, 3],
  AUT: [14.6, 47.7, 6],
  AZE: [47.6, 40.1, 6],
  BFA: [-1.6, 12.4, 5],
  BGD: [90.4, 23.7, 6],
  BGR: [25.5, 42.8, 6],
  BIH: [17.7, 44.2, 6],
  BLR: [28.0, 53.7, 5],
  BLZ: [-88.5, 17.2, 7],
  BOL: [-64.9, -16.3, 4],
  BRA: [-51.9, -14.2, 3],
  BRN: [114.7, 4.5, 7],
  CAF: [20.9, 6.6, 5],
  CAN: [-96.8, 56.1, 3],
  CHE: [8.2, 46.8, 7],
  CHL: [-71.5, -35.7, 4],
  CHN: [104.2, 35.9, 3],
  CIV: [-5.5, 7.5, 5],
  CMR: [12.4, 3.8, 5],
  COD: [23.6, -2.9, 4],
  COG: [15.3, -0.2, 5],
  COL: [-74.3, 4.6, 4],
  CUB: [-79.5, 21.5, 6],
  CYP: [33.4, 35.1, 7],
  CZE: [15.5, 49.8, 6],
  DEU: [10.5, 51.2, 5],
  DJI: [42.6, 11.8, 7],
  DNK: [10.0, 56.3, 6],
  DOM: [-70.2, 18.7, 7],
  DZA: [3.1, 28.0, 4],
  ECU: [-78.1, -1.8, 5],
  EGY: [30.8, 26.8, 5],
  ERI: [39.8, 15.2, 5],
  ESP: [-3.7, 40.2, 5],
  ETH: [40.5, 9.1, 4],
  FIN: [26.3, 64.0, 5],
  FJI: [178.1, -17.7, 6],
  FRA: [2.2, 46.2, 5],
  GBR: [-3.4, 55.4, 5],
  GEO: [43.4, 42.3, 6],
  GHA: [-1.0, 7.9, 6],
  GIN: [-11.8, 11.0, 5],
  GMB: [-15.3, 13.4, 7],
  GNB: [-15.2, 11.8, 7],
  GRC: [22.0, 39.1, 6],
  GTM: [-90.2, 15.8, 6],
  HND: [-86.6, 14.8, 6],
  HRV: [15.2, 45.2, 6],
  HTI: [-72.3, 19.0, 7],
  HUN: [19.5, 47.2, 6],
  IDN: [117.9, -0.8, 4],
  IND: [78.9, 20.6, 4],
  IRL: [-8.2, 53.2, 6],
  IRN: [53.7, 32.4, 4],
  IRQ: [43.7, 33.2, 5],
  ISL: [-19.0, 64.9, 6],
  ISR: [34.9, 31.5, 7],
  ITA: [12.6, 42.5, 5],
  JAM: [-77.3, 18.1, 7],
  JOR: [36.2, 31.2, 6],
  JPN: [138.3, 36.2, 5],
  KAZ: [67.0, 48.0, 4],
  KEN: [37.9, 0.0, 5],
  KGZ: [74.8, 41.2, 5],
  KHM: [104.9, 12.6, 6],
  KOR: [127.8, 36.0, 6],
  KWT: [47.5, 29.3, 7],
  LAO: [103.9, 18.2, 6],
  LBN: [35.9, 33.9, 7],
  LBY: [17.2, 26.3, 4],
  LKA: [80.7, 7.9, 6],
  MAR: [-7.1, 31.8, 5],
  MDA: [28.4, 47.4, 7],
  MDG: [46.9, -19.4, 5],
  MEX: [-102.5, 23.6, 4],
  MKD: [21.7, 41.6, 7],
  MLI: [-2.0, 17.6, 4],
  MMR: [95.9, 19.2, 5],
  MNG: [103.8, 46.9, 4],
  MOZ: [35.5, -18.7, 4],
  MRT: [-10.9, 20.3, 4],
  MWI: [34.3, -13.2, 6],
  MYS: [109.7, 4.2, 5],
  NAM: [18.5, -22.3, 4],
  NER: [8.1, 17.6, 4],
  NGA: [8.7, 9.1, 5],
  NIC: [-85.2, 12.8, 6],
  NLD: [5.3, 52.3, 7],
  NOR: [8.5, 60.5, 5],
  NPL: [84.1, 28.4, 6],
  NZL: [172.7, -42.0, 5],
  OMN: [57.6, 21.5, 5],
  PAK: [69.3, 30.4, 5],
  PAN: [-80.8, 8.4, 6],
  PER: [-75.0, -9.2, 4],
  PHL: [122.9, 12.9, 5],
  PNG: [143.9, -6.3, 5],
  POL: [19.1, 52.1, 5],
  PRK: [127.5, 40.3, 6],
  PRT: [-8.2, 39.4, 6],
  PRY: [-58.4, -23.4, 5],
  PSE: [35.3, 31.9, 8],
  QAT: [51.2, 25.4, 7],
  ROU: [25.0, 45.9, 5],
  RUS: [105.3, 61.5, 3],
  RWA: [29.9, -1.9, 7],
  SAU: [45.1, 24.2, 4],
  SDN: [30.2, 12.9, 4],
  SEN: [-14.5, 14.5, 6],
  SLV: [-88.9, 13.7, 7],
  SOM: [46.2, 5.2, 5],
  SRB: [21.0, 44.0, 6],
  SSD: [31.3, 7.0, 5],
  SVK: [19.7, 48.7, 7],
  SVN: [14.8, 46.2, 7],
  SWE: [18.6, 60.1, 5],
  SWZ: [31.5, -26.5, 7],
  SYR: [38.3, 35.0, 6],
  TCD: [18.7, 15.5, 4],
  TGO: [0.8, 8.6, 6],
  THA: [100.9, 15.9, 5],
  TJK: [71.3, 38.9, 6],
  TKM: [58.8, 40.1, 5],
  TLS: [125.7, -8.9, 7],
  TTO: [-61.2, 10.5, 7],
  TUN: [9.6, 33.9, 6],
  TUR: [35.2, 39.1, 5],
  TWN: [120.9, 23.7, 7],
  TZA: [34.9, -6.1, 5],
  UGA: [32.3, 1.4, 6],
  UKR: [32.0, 49.0, 5],
  URY: [-56.0, -32.5, 6],
  USA: [-98.6, 39.8, 3],
  UZB: [63.9, 41.4, 5],
  VEN: [-66.6, 8.0, 5],
  VNM: [108.3, 14.1, 5],
  YEM: [48.5, 15.6, 5],
  ZAF: [25.1, -29.0, 4],
  ZMB: [27.8, -13.1, 5],
  ZWE: [29.9, -20.0, 5],
}

// City name → [lng, lat, zoom]
// Keys are lowercase substrings — getCityCentre does a .includes() match
const CITY_CENTRES: Record<string, [number, number, number]> = {
  // ── Major world capitals ──────────────────────────────────────────────────
  moscow: [37.6, 55.8, 8],
  beijing: [116.4, 39.9, 8],
  washington: [-77.0, 38.9, 8],
  london: [-0.1, 51.5, 9],
  paris: [2.3, 48.9, 9],
  berlin: [13.4, 52.5, 9],
  tokyo: [139.7, 35.7, 9],
  delhi: [77.2, 28.6, 9],
  tehran: [51.4, 35.7, 9],
  baghdad: [44.4, 33.3, 9],
  riyadh: [46.7, 24.7, 9],
  cairo: [31.2, 30.1, 9],
  istanbul: [29.0, 41.0, 9],
  kyiv: [30.5, 50.5, 9],
  pyongyang: [125.7, 39.0, 9],
  seoul: [127.0, 37.6, 9],
  taipei: [121.5, 25.0, 9],
  hanoi: [105.8, 21.0, 9],
  'ho chi minh': [106.7, 10.8, 9],
  // ── Pakistan ──────────────────────────────────────────────────────────────
  islamabad: [73.0, 33.7, 9],
  karachi: [67.0, 24.9, 9],
  lahore: [74.3, 31.6, 9],
  peshawar: [71.5, 34.0, 9],
  quetta: [67.0, 30.2, 9],
  multan: [71.5, 30.2, 9],
  faisalabad: [73.1, 31.4, 9],
  rawalpindi: [73.1, 33.6, 9],
  gwadar: [62.3, 25.1, 10],
  turbat: [63.0, 26.0, 10],
  'dera ghazi khan': [70.6, 30.1, 10],
  'hyderabad sind': [68.4, 25.4, 10],
  sialkot: [74.5, 32.5, 10],
  bahawalpur: [71.7, 29.4, 10],
  larkana: [68.2, 27.6, 10],
  sukkur: [68.9, 27.7, 10],
  abbottabad: [73.2, 34.1, 10],
  mingora: [72.4, 34.8, 10],
  muzaffarabad: [73.5, 34.4, 10],
  gilgit: [74.3, 35.9, 10],
  skardu: [75.6, 35.3, 10],
  chashma: [71.5, 32.4, 10],
  khuzdar: [66.6, 27.8, 10],
  hub: [67.1, 25.0, 10],
  // ── Afghanistan ───────────────────────────────────────────────────────────
  kabul: [69.2, 34.5, 9],
  kandahar: [65.7, 31.6, 10],
  herat: [62.2, 34.3, 10],
  mazar: [67.1, 36.7, 10],
  jalalabad: [70.5, 34.4, 10],
  kunduz: [68.9, 36.7, 10],
  // ── Iran ──────────────────────────────────────────────────────────────────
  isfahan: [51.7, 32.7, 9],
  mashhad: [59.6, 36.3, 9],
  tabriz: [46.3, 38.1, 9],
  shiraz: [52.5, 29.6, 9],
  ahvaz: [48.7, 31.3, 10],
  bushehr: [50.8, 28.9, 10],
  natanz: [51.9, 33.5, 11],
  arak: [49.7, 34.1, 10],
  // ── India ─────────────────────────────────────────────────────────────────
  mumbai: [72.9, 19.1, 9],
  bangalore: [77.6, 12.9, 9],
  chennai: [80.3, 13.1, 9],
  kolkata: [88.4, 22.6, 9],
  hyderabad: [78.5, 17.4, 9],
  pune: [73.9, 18.5, 10],
  ahmedabad: [72.6, 23.0, 10],
  surat: [72.8, 21.2, 10],
  jaipur: [75.8, 26.9, 10],
  lucknow: [81.0, 26.8, 10],
  // ── Middle East ───────────────────────────────────────────────────────────
  mosul: [43.1, 36.3, 9],
  aleppo: [37.2, 36.2, 9],
  damascus: [36.3, 33.5, 9],
  gaza: [34.5, 31.5, 10],
  beirut: [35.5, 33.9, 10],
  jerusalem: [35.2, 31.8, 10],
  dubai: [55.3, 25.2, 9],
  'abu dhabi': [54.4, 24.5, 9],
  doha: [51.5, 25.3, 10],
  kuwait: [48.0, 29.4, 10],
  muscat: [58.6, 23.6, 10],
  aden: [45.0, 12.8, 10],
  sanaa: [44.2, 15.4, 10],
  amman: [35.9, 31.9, 10],
  // ── Central Asia ──────────────────────────────────────────────────────────
  tashkent: [69.3, 41.3, 9],
  almaty: [77.0, 43.3, 9],
  astana: [71.4, 51.2, 9],
  bishkek: [74.6, 42.9, 10],
  dushanbe: [68.8, 38.6, 10],
  ashgabat: [58.4, 37.9, 10],
  // ── Russia / FSU ──────────────────────────────────────────────────────────
  grozny: [45.7, 43.3, 10],
  kharkiv: [36.3, 50.0, 9],
  mariupol: [37.6, 47.1, 10],
  donetsk: [37.8, 48.0, 9],
  crimea: [34.1, 45.0, 8],
  novosibirsk: [82.9, 55.0, 9],
  vladivostok: [132.0, 43.1, 9],
  murmansk: [33.1, 68.9, 10],
  'st petersburg': [30.3, 59.9, 9],
  // ── Africa ────────────────────────────────────────────────────────────────
  khartoum: [32.5, 15.6, 9],
  mogadishu: [45.3, 2.0, 9],
  nairobi: [36.8, -1.3, 9],
  kinshasa: [15.3, -4.3, 9],
  lagos: [3.4, 6.5, 9],
  accra: [-0.2, 5.6, 9],
  addis: [38.7, 9.0, 9],
  johannesburg: [28.0, -26.2, 9],
  'cape town': [18.4, -33.9, 9],
  luanda: [13.2, -8.8, 9],
  'dar es salaam': [39.3, -6.8, 9],
  casablanca: [-7.6, 33.6, 9],
  tripoli: [13.2, 32.9, 9],
  tunis: [10.2, 36.8, 9],
  algiers: [3.1, 36.7, 9],
  kigali: [30.1, -1.9, 10],
  abuja: [7.5, 9.1, 9],
  dakar: [-17.4, 14.7, 9],
  // ── South / SE Asia ───────────────────────────────────────────────────────
  dhaka: [90.4, 23.7, 9],
  yangon: [96.2, 16.8, 9],
  rangoon: [96.2, 16.8, 9],
  manila: [121.0, 14.6, 9],
  jakarta: [106.8, -6.2, 9],
  'kuala lumpur': [101.7, 3.1, 9],
  kuala: [101.7, 3.1, 9],
  singapore: [103.8, 1.4, 11],
  bangkok: [100.5, 13.7, 9],
  kathmandu: [85.3, 27.7, 10],
  colombo: [79.9, 6.9, 10],
  // ── Americas ──────────────────────────────────────────────────────────────
  'new york': [-74.0, 40.7, 9],
  'los angeles': [-118.2, 34.1, 9],
  chicago: [-87.6, 41.9, 9],
  houston: [-95.4, 29.8, 9],
  miami: [-80.2, 25.8, 9],
  toronto: [-79.4, 43.7, 9],
  'mexico city': [-99.1, 19.4, 9],
  bogota: [-74.1, 4.7, 9],
  lima: [-77.0, -12.0, 9],
  santiago: [-70.7, -33.4, 9],
  'buenos aires': [-58.4, -34.6, 9],
  'sao paulo': [-46.6, -23.5, 9],
  brasilia: [-47.9, -15.8, 9],
  // ── Europe ────────────────────────────────────────────────────────────────
  madrid: [-3.7, 40.4, 9],
  barcelona: [2.2, 41.4, 9],
  rome: [12.5, 41.9, 9],
  milan: [9.2, 45.5, 9],
  warsaw: [21.0, 52.2, 9],
  vienna: [16.4, 48.2, 9],
  budapest: [19.1, 47.5, 9],
  bucharest: [26.1, 44.4, 9],
  stockholm: [18.1, 59.3, 9],
  oslo: [10.7, 59.9, 9],
  helsinki: [24.9, 60.2, 9],
  athens: [23.7, 37.98, 9],
  prague: [14.4, 50.1, 9],
  amsterdam: [4.9, 52.4, 9],
  brussels: [4.4, 50.8, 9],
}

// ── Country bounding boxes for rail border validation ─────────────────────────
// Format: [minLng, minLat, maxLng, maxLat] with generous padding
// Used to reject rail waypoints that land in a different country
const COUNTRY_BBOX: Record<string, [number, number, number, number]> = {
  // South Asia
  PAK: [60.0, 23.0, 77.5, 37.5],
  IND: [68.0, 6.0, 97.5, 36.5],
  BGD: [88.0, 20.5, 92.8, 26.8],
  LKA: [79.5, 5.7, 81.9, 9.9],
  // East Asia
  CHN: [73.4, 15.5, 135.1, 53.6],
  JPN: [122.6, 24.0, 153.8, 45.7],
  KOR: [125.0, 33.0, 130.0, 38.7],
  PRK: [124.0, 37.5, 130.7, 42.8],
  TWN: [119.9, 21.9, 122.1, 25.4],
  MNG: [87.7, 41.5, 119.9, 52.2],
  // Southeast Asia
  VNM: [102.1, 8.3, 109.5, 23.5],
  THA: [97.3, 5.5, 105.7, 20.5],
  MMR: [92.1, 9.4, 101.2, 28.5],
  IDN: [95.0, -11.0, 141.0, 6.1],
  PHL: [116.9, 4.5, 126.6, 21.1],
  MYS: [99.6, 0.8, 119.3, 7.4],
  // Central Asia
  KAZ: [50.3, 40.5, 87.4, 55.5],
  UZB: [56.0, 37.1, 73.2, 45.6],
  TKM: [52.5, 35.1, 66.7, 42.8],
  KGZ: [69.3, 39.2, 80.3, 43.3],
  TJK: [67.3, 36.7, 75.2, 41.1],
  AFG: [60.5, 29.4, 74.9, 38.5],
  // Middle East
  IRN: [44.0, 25.1, 63.4, 39.8],
  IRQ: [38.8, 29.1, 48.7, 37.4],
  SAU: [36.7, 16.4, 55.7, 32.2],
  TUR: [25.9, 35.8, 44.8, 42.2],
  SYR: [35.7, 32.3, 42.4, 37.3],
  ISR: [34.2, 29.5, 35.9, 33.4],
  YEM: [42.5, 12.1, 54.6, 18.0],
  ARE: [51.5, 22.5, 56.4, 26.1],
  OMN: [52.0, 16.6, 59.9, 26.4],
  JOR: [34.9, 29.2, 39.3, 33.4],
  LBN: [35.1, 33.0, 36.7, 34.7],
  KWT: [46.5, 28.5, 48.4, 30.1],
  QAT: [50.7, 24.5, 51.7, 26.2],
  BHR: [50.4, 25.8, 50.7, 26.3],
  // Europe
  RUS: [-180.0, 41.2, 180.0, 82.0],
  DEU: [5.8, 47.3, 15.0, 55.1],
  FRA: [-5.2, 41.3, 9.6, 51.1],
  GBR: [-8.7, 49.8, 2.0, 61.0],
  ESP: [-9.4, 36.0, 4.4, 43.8],
  ITA: [6.6, 36.7, 18.6, 47.1],
  POL: [14.1, 49.0, 24.2, 54.9],
  UKR: [22.1, 44.4, 40.3, 52.4],
  SWE: [10.9, 55.3, 24.2, 69.1],
  NOR: [4.0, 57.8, 31.3, 71.2],
  FIN: [19.1, 59.8, 31.6, 70.1],
  GRC: [19.4, 34.8, 29.7, 42.0],
  PRT: [-9.5, 36.8, -6.2, 42.2],
  CHE: [5.9, 45.8, 10.5, 47.8],
  AUT: [9.5, 46.4, 17.2, 49.0],
  BEL: [2.5, 49.5, 6.5, 51.5],
  NLD: [3.3, 50.8, 7.2, 53.6],
  HUN: [16.1, 45.7, 22.9, 48.6],
  ROU: [20.3, 43.6, 29.7, 48.3],
  BGR: [22.4, 41.2, 28.7, 44.2],
  CZE: [12.1, 48.5, 18.9, 51.1],
  SVK: [16.8, 47.7, 22.6, 49.6],
  HRV: [13.5, 42.4, 19.4, 46.6],
  SRB: [18.8, 42.2, 23.0, 46.2],
  // Africa
  EGY: [24.7, 21.9, 37.0, 31.7],
  NGA: [2.7, 4.3, 15.0, 13.9],
  ZAF: [16.5, -35.0, 33.0, -22.1],
  ETH: [33.0, 3.4, 48.0, 15.0],
  KEN: [33.9, -4.7, 41.9, 5.0],
  TZA: [29.3, -11.7, 40.4, -1.0],
  MAR: [-13.2, 27.7, -1.1, 36.0],
  DZA: [-8.7, 18.9, 12.0, 37.1],
  LBY: [9.3, 19.5, 25.2, 33.2],
  SDN: [21.8, 8.7, 38.6, 22.2],
  ANG: [11.7, -18.1, 24.1, -4.4],
  MOZ: [30.2, -26.9, 40.8, -10.5],
  GHA: [-3.3, 4.7, 1.2, 11.2],
  COD: [12.2, -13.5, 31.3, 5.4],
  // Americas
  USA: [-179.1, 18.9, -66.9, 71.4],
  CAN: [-141.0, 41.7, -52.6, 83.1],
  MEX: [-118.4, 14.5, -86.7, 32.7],
  BRA: [-73.9, -33.7, -28.8, 5.3],
  ARG: [-73.6, -55.1, -53.6, -21.8],
  CHL: [-75.6, -55.9, -66.5, -17.5],
  COL: [-79.0, -4.2, -66.9, 12.5],
  PER: [-81.3, -18.4, -68.7, 0.0],
  VEN: [-73.3, 0.6, -59.8, 12.2],
  // Oceania
  AUS: [112.9, -43.6, 154.0, -10.7],
  NZL: [166.4, -47.4, 178.6, -34.4],
}

/**
 * Returns true if [lng, lat] is inside the rough bounding box of the country.
 * Adds generous ±3° margin to avoid false rejections at borders.
 */
export function isCoordInCountry(lng: number, lat: number, iso: string): boolean {
  const bbox = COUNTRY_BBOX[iso.toUpperCase()]
  if (!bbox) return true  // unknown country — allow through
  const MARGIN = 3.0
  return lng >= bbox[0] - MARGIN && lng <= bbox[2] + MARGIN
      && lat >= bbox[1] - MARGIN && lat <= bbox[3] + MARGIN
}

// Disambiguates city names that exist in multiple countries.
// Key: ISO_A3 → map of ambiguous lowercase city name → [lng, lat]
const COUNTRY_CITY_OVERRIDES: Record<string, Record<string, [number, number]>> = {
  PAK: {
    hyderabad: [68.4, 25.4],   // Hyderabad, Sindh — not Hyderabad, India
  },
  IND: {
    hyderabad: [78.5, 17.4],   // Hyderabad, Telangana
  },
}

/** Returns [lng, lat] for a city name (case-insensitive substring match), or null.
 *  Pass countryId (ISO_A3) to resolve ambiguous names like Hyderabad correctly. */
export function getCityCentre(name: string, countryId?: string): [number, number] | null {
  const lower = name.toLowerCase()

  // Country-specific override takes priority for ambiguous names
  if (countryId) {
    const overrides = COUNTRY_CITY_OVERRIDES[countryId.toUpperCase()]
    if (overrides) {
      for (const [key, coords] of Object.entries(overrides)) {
        if (lower.includes(key)) return coords
      }
    }
  }

  for (const [key, coords] of Object.entries(CITY_CENTRES)) {
    if (lower.includes(key)) return [coords[0], coords[1]]
  }
  return null
}

/** Returns [lng, lat] for an ISO_A3 code, or null if unknown */
export function getCountryCentre(iso: string): [number, number] | null {
  const e = COUNTRY_CENTRES[iso.toUpperCase()]
  return e ? [e[0], e[1]] : null
}

// ── Port cities ──────────────────────────────────────────────────────────────
// Known major coastal cities per ISO_A3, for sensible port placement when the
// AI says "build ports" without specifying where. First entry is the default.
const PORT_CITIES: Record<string, Array<{ name: string; lng: number; lat: number }>> = {
  PAK: [{ name: 'Karachi', lng: 67.0, lat: 24.9 }, { name: 'Gwadar', lng: 62.3, lat: 25.1 }],
  IND: [{ name: 'Mumbai', lng: 72.9, lat: 19.1 }, { name: 'Chennai', lng: 80.3, lat: 13.1 }, { name: 'Kolkata', lng: 88.4, lat: 22.6 }, { name: 'Kochi', lng: 76.3, lat: 9.9 }],
  CHN: [{ name: 'Shanghai', lng: 121.5, lat: 31.2 }, { name: 'Shenzhen', lng: 114.1, lat: 22.5 }, { name: 'Tianjin', lng: 117.2, lat: 39.1 }, { name: 'Qingdao', lng: 120.4, lat: 36.1 }],
  USA: [{ name: 'Los Angeles', lng: -118.3, lat: 33.7 }, { name: 'New York', lng: -74.0, lat: 40.7 }, { name: 'Houston', lng: -95.0, lat: 29.7 }, { name: 'Seattle', lng: -122.3, lat: 47.6 }],
  GBR: [{ name: 'Liverpool', lng: -3.0, lat: 53.4 }, { name: 'Southampton', lng: -1.4, lat: 50.9 }, { name: 'Felixstowe', lng: 1.3, lat: 52.0 }],
  JPN: [{ name: 'Yokohama', lng: 139.6, lat: 35.4 }, { name: 'Kobe', lng: 135.2, lat: 34.7 }, { name: 'Osaka', lng: 135.5, lat: 34.6 }],
  KOR: [{ name: 'Busan', lng: 129.1, lat: 35.1 }, { name: 'Incheon', lng: 126.6, lat: 37.5 }],
  DEU: [{ name: 'Hamburg', lng: 10.0, lat: 53.5 }, { name: 'Bremerhaven', lng: 8.6, lat: 53.5 }],
  FRA: [{ name: 'Marseille', lng: 5.4, lat: 43.3 }, { name: 'Le Havre', lng: 0.1, lat: 49.5 }],
  ITA: [{ name: 'Genoa', lng: 8.9, lat: 44.4 }, { name: 'Naples', lng: 14.3, lat: 40.8 }],
  ESP: [{ name: 'Valencia', lng: -0.4, lat: 39.5 }, { name: 'Barcelona', lng: 2.2, lat: 41.4 }, { name: 'Algeciras', lng: -5.4, lat: 36.1 }],
  NLD: [{ name: 'Rotterdam', lng: 4.5, lat: 51.9 }, { name: 'Amsterdam', lng: 4.9, lat: 52.4 }],
  TUR: [{ name: 'Istanbul', lng: 29.0, lat: 41.0 }, { name: 'Izmir', lng: 27.1, lat: 38.4 }],
  EGY: [{ name: 'Alexandria', lng: 29.9, lat: 31.2 }, { name: 'Port Said', lng: 32.3, lat: 31.3 }],
  SAU: [{ name: 'Jeddah', lng: 39.2, lat: 21.5 }, { name: 'Dammam', lng: 50.1, lat: 26.4 }],
  IRN: [{ name: 'Bandar Abbas', lng: 56.3, lat: 27.2 }, { name: 'Chabahar', lng: 60.6, lat: 25.3 }],
  ARE: [{ name: 'Dubai', lng: 55.3, lat: 25.3 }, { name: 'Abu Dhabi', lng: 54.4, lat: 24.5 }],
  ISR: [{ name: 'Haifa', lng: 35.0, lat: 32.8 }, { name: 'Ashdod', lng: 34.6, lat: 31.8 }],
  BRA: [{ name: 'Santos', lng: -46.3, lat: -24.0 }, { name: 'Rio de Janeiro', lng: -43.2, lat: -22.9 }],
  ARG: [{ name: 'Buenos Aires', lng: -58.4, lat: -34.6 }],
  AUS: [{ name: 'Sydney', lng: 151.2, lat: -33.9 }, { name: 'Melbourne', lng: 144.9, lat: -37.8 }, { name: 'Fremantle', lng: 115.7, lat: -32.1 }],
  ZAF: [{ name: 'Durban', lng: 31.0, lat: -29.9 }, { name: 'Cape Town', lng: 18.4, lat: -33.9 }],
  NGA: [{ name: 'Lagos', lng: 3.4, lat: 6.5 }],
  KEN: [{ name: 'Mombasa', lng: 39.7, lat: -4.0 }],
  TZA: [{ name: 'Dar es Salaam', lng: 39.3, lat: -6.8 }],
  MAR: [{ name: 'Casablanca', lng: -7.6, lat: 33.6 }, { name: 'Tangier', lng: -5.8, lat: 35.8 }],
  GRC: [{ name: 'Piraeus', lng: 23.6, lat: 37.9 }, { name: 'Thessaloniki', lng: 23.0, lat: 40.6 }],
  PRT: [{ name: 'Lisbon', lng: -9.1, lat: 38.7 }, { name: 'Porto', lng: -8.7, lat: 41.2 }],
  RUS: [{ name: 'St Petersburg', lng: 30.3, lat: 59.9 }, { name: 'Vladivostok', lng: 131.9, lat: 43.1 }, { name: 'Murmansk', lng: 33.1, lat: 68.9 }],
  CAN: [{ name: 'Vancouver', lng: -123.1, lat: 49.3 }, { name: 'Halifax', lng: -63.6, lat: 44.6 }],
  MEX: [{ name: 'Veracruz', lng: -96.1, lat: 19.2 }, { name: 'Manzanillo', lng: -104.3, lat: 19.1 }],
  IDN: [{ name: 'Jakarta', lng: 106.8, lat: -6.2 }, { name: 'Surabaya', lng: 112.7, lat: -7.3 }],
  VNM: [{ name: 'Ho Chi Minh City', lng: 106.7, lat: 10.8 }, { name: 'Haiphong', lng: 106.7, lat: 20.9 }],
  THA: [{ name: 'Bangkok', lng: 100.5, lat: 13.7 }, { name: 'Laem Chabang', lng: 100.9, lat: 13.1 }],
  PHL: [{ name: 'Manila', lng: 121.0, lat: 14.6 }, { name: 'Cebu', lng: 123.9, lat: 10.3 }],
  MYS: [{ name: 'Port Klang', lng: 101.4, lat: 3.0 }, { name: 'Penang', lng: 100.3, lat: 5.4 }],
  SGP: [{ name: 'Singapore', lng: 103.8, lat: 1.3 }],
  BGD: [{ name: 'Chittagong', lng: 91.8, lat: 22.3 }],
  LKA: [{ name: 'Colombo', lng: 79.9, lat: 6.9 }],
  OMN: [{ name: 'Muscat', lng: 58.6, lat: 23.6 }, { name: 'Salalah', lng: 54.1, lat: 17.0 }],
  QAT: [{ name: 'Doha', lng: 51.5, lat: 25.3 }],
  KWT: [{ name: 'Kuwait City', lng: 48.0, lat: 29.4 }],
  YEM: [{ name: 'Aden', lng: 45.0, lat: 12.8 }],
}

/**
 * Returns a sensible coastal city for a port build, given a country ISO_A3.
 * If a hint name is supplied, the matching port city is returned; otherwise
 * the country's primary port city is used. Returns null for landlocked
 * countries so callers can abort the build rather than placing a port inland.
 */
export function getPortLocation(iso: string, hint?: string): { name: string; lng: number; lat: number } | null {
  const list = PORT_CITIES[iso.toUpperCase()]
  if (!list || list.length === 0) return null
  if (hint) {
    const lower = hint.toLowerCase()
    for (const p of list) {
      if (lower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lower)) return p
    }
  }
  return list[0]
}

export function isLandlocked(iso: string): boolean {
  // If we don't have a port city on file, treat as landlocked for placement
  // purposes. Covers AFG, NPL, BTN, BOL, PRY, AUT, CHE, CZE, SVK, HUN, BLR,
  // MDA, ARM, AZE, UZB, TKM, KGZ, TJK, MNG, ZWE, MWI, BWA, UGA, RWA, ETH, etc.
  return !PORT_CITIES[iso.toUpperCase()]
}

export function flyToLocation(map: maplibregl.Map, isoOrName: string) {
  const key = isoOrName.trim().toUpperCase()
  const entry = COUNTRY_CENTRES[key]
  if (entry) {
    map.flyTo({ center: [entry[0], entry[1]], zoom: entry[2], duration: 2000, essential: true })
    return
  }
  // Try city name
  const cityKey = isoOrName.trim().toLowerCase()
  for (const [name, coords] of Object.entries(CITY_CENTRES)) {
    if (cityKey.includes(name)) {
      map.flyTo({ center: [coords[0], coords[1]], zoom: coords[2], duration: 2000, essential: true })
      return
    }
  }
}
