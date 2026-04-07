import type { Era } from './types.js'

export const COUNTRY_COLOURS: Record<string, string> = {
  // ── Americas ───────────────────────────────────────────────────────────────
  // USA: deep navy (flag blue), CAN: red (maple leaf), MEX: dark green (flag stripe)
  USA: '#3C3B6E', CAN: '#D52B1E', MEX: '#006847',
  // BRA: rich green (flag), ARG: sky blue (flag), CHL: deep red, COL: golden yellow
  BRA: '#009C3B', ARG: '#74ACDF', CHL: '#C8102E', COL: '#FCD116',
  // VEN: crimson, PER: warm red, BOL: deep forest green (tricolour centre), URY: royal blue
  VEN: '#CF142B', PER: '#D91023', BOL: '#2D6A27', URY: '#0038A8',
  // PRY: deep red (flag), ECU: navy (flag blue stripe), GUY: deep green, SUR: dark forest
  PRY: '#B8001F', ECU: '#003893', GUY: '#009E60', SUR: '#377E3F',
  // TTO: black and red — use dark charcoal, BLZ: blue, GTM: sky blue, HND: mid blue
  TTO: '#CE1126', BLZ: '#003F87', GTM: '#4997D0', HND: '#0073CF',
  // SLV: deep cobalt, NIC: teal-blue, CRI: deep navy, PAN: royal blue
  SLV: '#0F47AF', NIC: '#3A75C4', CRI: '#002B7F', PAN: '#005EB8',
  // CUB: deep blue, DOM: dark navy, HTI: deep blue (darker shade), JAM: green
  CUB: '#002A8F', DOM: '#002D62', HTI: '#00209F', JAM: '#009B3A',

  // ── Western Europe ────────────────────────────────────────────────────────
  // GBR: navy blue, FRA: French blue (distinct from GBR), DEU: red (flag red)
  GBR: '#012169', FRA: '#0055A4', DEU: '#DD0000',
  // ITA: deep green (flag green stripe), ESP: Spanish red, PRT: dark olive green
  ITA: '#009246', ESP: '#AA151B', PRT: '#006400',
  // NLD: Dutch orange (better distinguishes from BEL), BEL: Belgian yellow
  NLD: '#FF6600', BEL: '#FDDA24',
  // CHE: bright red (distinct from AUT), AUT: dark crimson
  CHE: '#FF0000', AUT: '#C8102E',
  // POL: crimson, CZE: slate blue (uses the blue wedge), HUN: Hungarian green
  POL: '#DC143C', CZE: '#11457E', HUN: '#477050',
  // ROU: deep navy blue (flag blue), BGR: warm green (flag green)
  ROU: '#002B7F', BGR: '#009B74',
  // GRC: Greek blue, SWE: Swedish blue (different tone from GRC)
  GRC: '#0D5EAF', SWE: '#006AA7',
  // NOR: deep red, DNK: Danish red (slightly different), FIN: deep navy
  NOR: '#EF2B2D', DNK: '#C60C30', FIN: '#003580',
  // IRL: Irish green, LUX: light red (flag tricolour), ISL: Icelandic blue
  IRL: '#169B62', LUX: '#EF3340', ISL: '#003897',
  // MLT: Maltese red, CYP: sky blue (UN map colour), AND: deep blue
  MLT: '#CF142B', CYP: '#4A90D9', AND: '#003DA5',
  // MCO: Monaco red, LIE: Liechtenstein blue, SMR: San Marino blue
  MCO: '#CE1126', LIE: '#002B7F', SMR: '#5EB6E4',

  // ── Eastern Europe / Balkans ──────────────────────────────────────────────
  // UKR: Ukrainian blue, BLR: deep red (flag), MDA: Moldova blue (darker shade)
  UKR: '#005BBB', BLR: '#CF101A', MDA: '#003DA5',
  // LTU: amber yellow (flag), LVA: dark carmine (flag), EST: blue (flag)
  LTU: '#FDB913', LVA: '#9E3039', EST: '#0072CE',
  // RUS: deep blue (tricolour), SVK: deep red, SVN: dark blue (tricolour)
  RUS: '#0039A6', SVK: '#EE1C25', SVN: '#1A5276',
  // HRV: Croatian red (chequered), BIH: Bosnia dark blue, SRB: Serbian red
  HRV: '#FF0000', BIH: '#1B3F7A', SRB: '#C6363C',
  // MKD: Macedonian red, MNE: gold (flag colour), ALB: Albanian red
  MKD: '#CE2028', MNE: '#D4AF37', ALB: '#E41E20',
  // XKX/KOS: Kosovo blue (same entity)
  XKX: '#244AA5', KOS: '#244AA5',

  // ── Central Asia ─────────────────────────────────────────────────────────
  // KAZ: cyan-blue (flag), UZB: green (flag), TKM: deep forest green
  KAZ: '#00AFCA', UZB: '#1EB53A', TKM: '#1B7A3E',
  // KGZ: bright red (flag), TJK: dark crimson
  KGZ: '#E8112D', TJK: '#8B0000',

  // ── East Asia ─────────────────────────────────────────────────────────────
  // CHN: Communist red, JPN: crimson, KOR: Korean red (taegeuk)
  CHN: '#DE2910', JPN: '#BC002D', KOR: '#CD2E3A',
  // PRK: deep blue (flag), MNG: Mongolian red, TWN: flag red (lighter)
  PRK: '#024FA2', MNG: '#C4272F', TWN: '#FE0000',
  // HKG: Hong Kong red (same as China but lighter treatment)
  HKG: '#DE2110',

  // ── South / SE Asia ───────────────────────────────────────────────────────
  // IND: saffron orange (Ashoka chakra hue), PAK: deep green (crescent), BGD: bottle green
  IND: '#FF9933', PAK: '#01411C', BGD: '#006A4E',
  // LKA: deep maroon (lion flag), NPL: crimson (distinct), BTN: deep orange (Bhutan dragon)
  LKA: '#8D153A', NPL: '#CA0000', BTN: '#E07000',
  // MDV: Maldives red, AFG: deep black-green (Islamic Emirate flag)
  MDV: '#D21034', AFG: '#1A3A1A',
  // VNM: Vietnamese red, THA: Thai deep blue (flag blue band - distinct from red neighbours)
  VNM: '#DA251D', THA: '#2D4596',
  // MMR: golden yellow (flag), KHM: dark indigo (Angkor), LAO: Lao deep red
  MMR: '#FECB00', KHM: '#032EA1', LAO: '#8B0028',
  // MYS: deep red (flag), SGP: Singapore crimson, IDN: Indonesian red
  MYS: '#CC0001', SGP: '#EF3340', IDN: '#CE1126',
  // PHL: Philippine blue, BRN: Brunei gold, TLS: East Timor black-red
  PHL: '#0038A8', BRN: '#F7E017', TLS: '#DC241F',

  // ── Middle East ───────────────────────────────────────────────────────────
  // IRN: Persian green (flag), IRQ: Iraqi red, SAU: deep Saudi green
  IRN: '#239F40', IRQ: '#CE1126', SAU: '#006C35',
  // ARE: UAE green (lighter), KWT: Kuwaiti deep green, QAT: maroon
  ARE: '#00732F', KWT: '#007A3D', QAT: '#8D1B3D',
  // BHR: Bahrain red (distinct from IRQ), OMN: Omani dark red, YEM: Yemeni red (lighter)
  BHR: '#A4161A', OMN: '#DB161B', YEM: '#CE1126',
  // JOR: Jordan black (flag — use deep charcoal/green), ISR: Israeli blue
  JOR: '#1A1A1A', ISR: '#0038B8',
  // LBN: Lebanese cedar green, SYR: Syrian green (different from LBN)
  LBN: '#00A651', SYR: '#2E7D32',
  // TUR: Turkish red (distinctive), GEO: Georgian red cross, ARM: Armenian deep red
  TUR: '#E30A17', GEO: '#DA291C', ARM: '#D90012',
  // AZE: Azerbaijani blue, PSE: Palestinian green
  AZE: '#0092BC', PSE: '#007A3D',

  // ── North Africa ──────────────────────────────────────────────────────────
  // EGY: Egyptian red, LBY: Libyan green, TUN: Tunisian red (distinct shade)
  EGY: '#CE1126', LBY: '#239E46', TUN: '#E70013',
  // DZA: Algerian green (deep), MAR: Moroccan red (distinct from TUN)
  DZA: '#006233', MAR: '#C1272D',

  // ── West Africa ───────────────────────────────────────────────────────────
  // MRT: Mauritania green (deep), MLI: Mali green → now deep emerald
  MRT: '#006233', MLI: '#0E7838',
  // NER: Niger orange (flag orange band — very distinct from neighbours)
  NER: '#E67E22',
  // NGA: Nigeria green, GHA: Ghana green (different shade)
  NGA: '#008751', GHA: '#006B3F',
  // CIV: Ivory Coast orange, SEN: Senegal green (different from NGA)
  CIV: '#F77F00', SEN: '#00853F',
  // GMB: Gambia red (flag), GNB: Guinea-Bissau dark red, GIN: Guinea red
  GMB: '#3A7728', GNB: '#CE1126', GIN: '#CE1126',
  // SLE: Sierra Leone green, LBR: Liberian red, BFA: Burkina red
  SLE: '#1EB53A', LBR: '#BF0A30', BFA: '#EF2B2D',
  // BEN: Benin green, TGO: Togo green (lighter), GNQ: Equatorial Guinea green
  BEN: '#008751', TGO: '#006A4E', GNQ: '#3E9A00',
  // CMR: Cameroon deep green, GAB: Gabon green
  CMR: '#007A5E', GAB: '#009E60',

  // ── Central & East Africa ────────────────────────────────────────────────
  // COD: DRC blue, COG: Congo Republic green, CAF: Central African blue
  COD: '#007FFF', COG: '#009A44', CAF: '#003082',
  // TCD: Chad blue — use deep indigo to distinguish from CAF
  TCD: '#1F4287',
  // SDN: Sudan sandy gold (distinct), SSD: South Sudan green (distinct)
  SDN: '#E0AA3E', SSD: '#078930',
  // ETH: Ethiopian green, ERI: Eritrean blue (flag)
  ETH: '#078930', ERI: '#4189DD',
  // DJI: Djibouti sky blue, SOM: Somali blue (different shade)
  DJI: '#6AB2E7', SOM: '#4189DD',
  // UGA: Ugandan red/black — use deep crimson, KEN: Kenyan dark green
  UGA: '#CE1126', KEN: '#006600',
  // TZA: Tanzania green (lighter), RWA: Rwanda blue, BDI: Burundi red
  TZA: '#1EB53A', RWA: '#20A0C0', BDI: '#CE1126',
  // AGO: Angola red
  AGO: '#CC0000',

  // ── Southern Africa ───────────────────────────────────────────────────────
  // ZAF: South Africa green, ZWE: Zimbabwe deep green, ZMB: Zambia green
  ZAF: '#007A4D', ZWE: '#006400', ZMB: '#198A00',
  // MOZ: Mozambique gold-yellow (flag AK-47 / star colour — distinct!)
  MOZ: '#F5A623',
  // MWI: Malawi red, NAM: Namibia blue, BWA: Botswana blue (lighter)
  MWI: '#CE1126', NAM: '#003580', BWA: '#75AADB',
  // LSO: Lesotho deep blue (flag — distinct from MOZ yellow)
  LSO: '#1A3A6E',
  // SWZ: Eswatini blue, MDG: Madagascar red
  SWZ: '#3E5EB9', MDG: '#FC3D32',

  // ── Pacific / Oceania ─────────────────────────────────────────────────────
  // AUS: deep navy (flag), NZL: royal blue (distinct shade from AUS)
  AUS: '#012169', NZL: '#00247D',
  // PNG: Papua New Guinea red, FJI: Fijian sky blue
  PNG: '#CE1126', FJI: '#68BFE5',
  // SLB: Solomon Islands blue, VUT: Vanuatu green, WSM: Samoa red
  SLB: '#0120B8', VUT: '#009A44', WSM: '#CE1126',
  // TON: Tonga crimson
  TON: '#C10000',

  // ── Historical ────────────────────────────────────────────────────────────
  SUN: '#CC0000',   // USSR
  DDR: '#CC0000',   // East Germany
  FRG: '#DD0000',   // West Germany
  YUG: '#0039A6',   // Yugoslavia
  CSK: '#D7141A',   // Czechoslovakia
  // ── Greek era (431 BCE) ───────────────────────────────────────────────────
  ATH: '#4A7FCB',   // Athens — navy blue
  SPA: '#A0522D',   // Sparta — earthy red
  THE: '#6B8E23',   // Thebes — olive
  MAC: '#8B6914',   // Macedon — gold
  EPI: '#5F8A5E',   // Epirus — forest green
  THS: '#7B8B6F',   // Thessaly — muted green
  ACH: '#8B3A3A',   // Achaemenid Persia — deep red
  KMT: '#C89A3C',   // Egypt (Kemet) — gold
  CAR: '#9B4A9B',   // Carthage — purple
  SRC: '#2E8B57',   // Syracuse (ancient) — sea green
  CEL: '#5C7A3E',   // Celtic Gaul — forest
  SCY: '#8B7355',   // Scythia — tan
  ITL: '#B5651D',   // Italian peoples (ancient) — brown
  NUB: '#8B4513',   // Nubia — saddle brown
  ARA: '#C4A35A',   // Arabia — sand
  TRH: '#7755AA',   // Thrace — violet
  ILY: '#5577AA',   // Illyria — slate blue
  CRT: '#3A7A8A',   // Crete — teal
  EUN: '#4A6A8A',   // Northern Europe (ancient) — slate
  // ── Roman era (117 CE) ────────────────────────────────────────────────────
  ROM: '#C0392B',   // Roman Empire — imperial red
  PAR: '#6B3FA0',   // Parthian Empire — violet
  KUS: '#D4841A',   // Kushan Empire — amber
  GER: '#5D7A4A',   // Germanic tribes — forest
  CAL: '#4A7A6A',   // Caledonia — dark teal
  ARK: '#A05028',   // Armenia (Roman era) — terracotta
  AXU: '#3D7A3D',   // Axum — deep green
  SAR: '#8B7355',   // Sarmatians — tan
  DEC: '#E07B3A',   // Deccan / South India (Roman era) — orange
  // ── Ottoman era (1566 CE) ─────────────────────────────────────────────────
  OTT: '#CC0000',   // Ottoman Empire — red
  SAF: '#0055A4',   // Safavid Persia — blue
  HAB: '#E8C400',   // Habsburg — yellow
  PLT: '#990011',   // Poland-Lithuania — crimson
  ENG: '#012169',   // England (Ottoman era) — navy blue
  POR: '#006600',   // Portugal (Ottoman era) — green
  MUS: '#1C3A6A',   // Muscovy — dark blue
  MUG: '#28A048',   // Mughal India — green
  SON: '#C4841A',   // Songhai — amber
  MOR: '#CC2200',   // Morocco — red
  ETI: '#078930',   // Ethiopia (Ottoman era) — green
  VNC: '#9B1B1B',   // Venice (Ottoman era) — crimson
  HRE: '#DD0000',   // Holy Roman Empire — red
  // ── Abbasid era (800 CE) ─────────────────────────────────────────────────
  ABB: '#2A6A3A',   // Abbasid Caliphate — emerald green
  BYZ: '#7B1A8C',   // Byzantine Empire — imperial purple
  FRK: '#003580',   // Frankish Empire — royal blue
  UMA: '#CC5500',   // Umayyad Al-Andalus — orange
  SAM: '#8A6A2A',   // Samanid/Tahirid Persia — ochre
  KHZ: '#5A8A3A',   // Khazar Khaganate — olive
  BUL: '#6A2A2A',   // Bulgarian Empire — dark red
  IDR: '#C44A1A',   // Idrisid Morocco — terracotta
  PRH: '#2A4A8A',   // Pratihara India — indigo
  PAL: '#1A6A4A',   // Pala Bengal — dark teal
  // ── Tang Dynasty era (700 CE) ────────────────────────────────────────────
  TNG: '#C40000',   // Tang Dynasty — vermilion red
  TIB: '#8B4513',   // Tibetan Empire — saddle brown
  GOK: '#5A7A2A',   // Göktürk / Uyghur — yellow-green
  SLL: '#2A7A5A',   // Silla (Korea) — jade green
  NAR: '#8B0000',   // Nara Japan — dark red
  NNZ: '#7A4A1A',   // Nanzhao (Yunnan) — warm brown
  KHR: '#4A7A2A',   // Khmer Empire (Tang era) — forest green
  CLK: '#6A4A8A',   // Chalukya India (Tang era) — violet
  // ── Aztec era (1500 CE) ──────────────────────────────────────────────────
  AZT: '#8B0000',   // Aztec Triple Alliance — dark red
  TLX: '#4A7A1A',   // Tlaxcala — olive green
  MYA: '#1A6A6A',   // Maya city-states — teal
  INC: '#C4A000',   // Inca Empire — gold
  NAH: '#6A4A2A',   // Other Nahua — brown
  MIX: '#8A2A8A',   // Mixtec — purple
  CRB: '#1A4A8A',   // Caribbean peoples — ocean blue
  TUP: '#2A8A2A',   // Tupi (Brazil) — green
  // ── Songhai era (1490 CE) ────────────────────────────────────────────────
  SGH: '#C4841A',   // Songhai Empire — amber (distinct from SON)
  MLR: '#8A6A00',   // Mali remnants (Songhai era) — dark gold
  KNB: '#6A4A00',   // Kanem-Bornu — brown
  BNI: '#CC2200',   // Benin Kingdom — red
  KNG: '#2A6A2A',   // Kongo Kingdom — forest green
  ZIM: '#8A4A00',   // Mutapa/Zimbabwe — copper
  YOR: '#AA3300',   // Yoruba/Oyo — burnt orange
  AKN: '#6A8A00',   // Akan/Ashanti — yellow-green
  // ── Sengoku era (1560 CE) ────────────────────────────────────────────────
  ODA: '#1A1A8A',   // Oda clan — dark blue
  TAK: '#8A1A1A',   // Takeda clan — dark red
  UES: '#1A8A1A',   // Uesugi clan — dark green
  MOT: '#8A4A1A',   // Mori clan — copper
  SHI: '#CC0066',   // Shimazu clan — crimson
  HOJ: '#1A6A6A',   // Hojo clan — teal
  DAT: '#6A1A8A',   // Date clan — purple
  IMA: '#8A6A1A',   // Imagawa clan — gold-brown
  CHO: '#1A8A6A',   // Chosokabe — sea green
  ASH: '#8A8A00',   // Ashikaga Shogunate — olive
  JOS: '#2A5A8A',   // Joseon Korea — steel blue
  MIN: '#CC0000',   // Ming Dynasty (Sengoku era) — red
}

export const ERA_START_DATES: Record<Era, string> = {
  '1945': '1945-09-02',
  '1960s': '1960-01-01',
  '1990s': '1991-01-01',
  '2010s': '2010-01-01',
  'modern': '2024-01-01',
  'greek':   '0431-01-01',
  'roman':   '0117-01-01',
  'ottoman': '1520-01-01',
  'abbasid': '0800-01-01',
  'tang':    '0700-01-01',
  'aztec':   '1500-01-01',
  'songhai': '1490-01-01',
  'sengoku': '1560-01-01',
}

export function getCountryColour(isoA3: string): string {
  // Fallback to a dark steel-blue — never grey
  return COUNTRY_COLOURS[isoA3] ?? '#1a4a7a'
}
