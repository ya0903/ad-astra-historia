/**
 * Download pre-processed historical GeoJSON from aourednik/historical-basemaps
 * and convert to our ISO-coded polity format.
 *
 * Usage:  node shared/eras/download-historical.mjs
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson'

// ── Name → ISO polity mapping ───────────────────────────────────────────────
// Keys are lowercased for case-insensitive matching.

const OTTOMAN_MAP = {
  // Ottoman Empire
  'ottoman empire': 'OTT', 'ottoman sultanate': 'OTT', 'ottoman': 'OTT', 'oman': 'OTT',
  // Safavid Persia
  'safavid empire': 'SAF', 'safavid persia': 'SAF', 'safavid': 'SAF',
  // Habsburg
  'habsburg netherlands': 'HAB', 'habsburg empire': 'HAB', 'habsburg': 'HAB', 'austria': 'HAB', 'austrian empire': 'HAB',
  // Holy Roman Empire
  'holy roman empire': 'HRE', 'holy roman empire (north)': 'HRE', 'swiss confederation': 'HRE',
  'milan': 'HRE', 'bohemia': 'HRE',
  // France
  'france': 'FRA', 'kingdom of france': 'FRA', 'britany': 'FRA',
  // England
  'england': 'ENG', 'england and ireland': 'ENG', 'kingdom of england': 'ENG', 'scotland': 'ENG',
  // Poland-Lithuania
  'poland-lithuania': 'PLT', 'poland-llituania': 'PLT', 'polish-lithuanian commonwealth': 'PLT',
  // Portugal
  'portugal': 'POR',
  // Spain
  'spain': 'ESP', 'castile': 'ESP', 'cuba (spain)': 'ESP', 'hispaniola (spain)': 'ESP',
  'vice royalty of new spain': 'ESP', 'sardinia': 'ESP', 'naples': 'ESP', 'sicily': 'ESP',
  // Denmark/Scandinavia
  'denmark-norway': 'EUN', 'sweden': 'EUN', 'kalmar union': 'EUN',
  // Venice & Italian states
  'venice': 'VNC', 'republic of venice': 'VNC', 'florence': 'VNC', 'genoa': 'VNC',
  'papal states': 'VNC', 'savoy': 'VNC',
  // Muscovy/Russia
  'tsardom of muscovy': 'MUS', 'muscovy': 'MUS', 'grand duchy of moscow': 'MUS', 'prussia': 'MUS',
  // Mughal
  'mughal empire': 'MUG', 'mughal': 'MUG', 'rajputana': 'MUG', 'bengal': 'MUG',
  // Songhai + W. Africa
  'songhai': 'SON', 'songhai empire': 'SON', 'bornu-kanem': 'SON', 'mossi states': 'SON', 'oyo': 'SON', 'benin': 'SON',
  // Morocco
  'watassid morocco': 'MOR', 'saadian dynasty': 'MOR',
  // Ethiopia
  'ethiopia': 'ETI', 'ethiopian empire': 'ETI', 'abyssinia': 'ETI', 'adal': 'ETI',
  // Nubia/Sudan
  'nubia': 'NUB', 'funj sultanate': 'NUB', 'darfur': 'NUB',
  // Arabia
  'arabia': 'ARA', 'hadramaut': 'ARA', 'mahra': 'ARA',
  // Aceh
  'aceh': 'ACH', 'malacca': 'ACH', 'malaysian islamic states': 'ACH', 'ayutthaya': 'ACH',
  // Crimean Khanate → Ottoman vassal
  'crimean khanate': 'OTT',
  // Central Asian khanates
  'bukara khanate': 'EUN', 'khiva khanate': 'EUN', 'quazaq khanate': 'EUN',
  'kazan khanate': 'EUN', 'astrakhan khanate': 'EUN', 'khanate of sibir': 'EUN',
  'nogai horde': 'EUN', 'central asian khanates': 'EUN',
  // Sub-Saharan Africa / off-map
  'congo': 'EUN', 'luba': 'EUN', 'lunda': 'EUN', 'mwenemutapa': 'EUN', 'akan': 'EUN',
  'hausa states': 'EUN', 'senegal': 'EUN', 'wadai': 'EUN', 'bagirmi': 'EUN',
  // South/SE Asia
  'vijayanagara': 'EUN', 'bijapur': 'EUN', 'bidar': 'EUN', 'golkonda': 'EUN',
  'ahmadnagar': 'EUN', 'orissa': 'EUN', 'burmese kingdoms': 'EUN', 'pegu': 'EUN',
  'shan states': 'EUN', 'cambodia': 'EUN', 'laos': 'EUN', 'đại việt': 'EUN',
  'tibet': 'EUN', 'ming chinese empire': 'EUN', 'japan (warring states)': 'EUN', 'korea': 'EUN',
}

const ROMAN_MAP = {
  // Roman Empire
  'roman empire': 'ROM', 'rome': 'ROM', 'caledonians': 'ROM', 'britannia': 'ROM',
  'dacia': 'ROM', 'bosporian kingdom': 'ROM',
  // Parthian Empire
  'parthian empire': 'PAR', 'parthia': 'PAR',
  // Kushan
  'kushan empire': 'KUS', 'kushan': 'KUS', 'kushana': 'KUS', 'saka kingdom': 'KUS',
  'indo-scythians': 'KUS', 'han': 'KUS',
  // Deccan kingdoms
  'satavahanihara': 'DEC', 'satavahana': 'DEC', 'hindu kingdoms': 'DEC',
  'himyarite kingdom': 'ARA', 'hadramaut': 'ARA', 'nabatean kingdom': 'ARA',
  // Germanic
  'germanic tribes': 'GER', 'boihaenum': 'GER', 'dumonii': 'GER',
  // Sarmatians/Scythians
  'sarmatians': 'SAR', 'scythians': 'SAR', 'alans': 'SAR',
  // Axum
  'axum': 'AXU', 'aksum': 'AXU',
  // Nubia
  'meroe': 'NUB', 'kingdom of kush': 'NUB',
  // Arabia
  'himyarite kingdom': 'ARA', 'hadramaut': 'ARA', 'nabatean kingdom': 'ARA',
  // Armenia
  'armenia': 'ARK',
  // Off-map East Asia (all EUN)
  'han dynasty': 'EUN', 'han china': 'EUN', 'koguryo': 'EUN', 'paekche': 'EUN',
  'silla': 'EUN', 'gaya': 'EUN', 'yayoi': 'EUN', 'yueban': 'EUN',
  'southern xiongnu': 'EUN', 'suren kingdom': 'EUN', 'hainan': 'EUN',
  'arakan': 'EUN', 'kalinga': 'EUN', 'simhala': 'EUN',
  // All else EUN
  'paleo-siberian hunter-gatherers': 'EUN',
}

const GREEK_MAP = {
  // Athens & Delian League
  'athens': 'ATH', 'athenian empire': 'ATH', 'attica': 'ATH',
  'greek city-states': 'ATH', 'greek colonies': 'ATH', 'greece': 'ATH',
  // Sparta
  'sparta': 'SPA', 'lacedaemon': 'SPA',
  // Thebes
  'thebes': 'THE', 'boeotia': 'THE',
  // Macedon
  'macedon': 'MAC', 'macedonia': 'MAC',
  // Epirus
  'epirus': 'EPI',
  // Thessaly
  'thessaly': 'THS',
  // Achaea
  'achaea': 'ACH',
  // Illyria
  'illyria': 'ILY',
  // Anatolia / Troy region
  'troy': 'TRH', 'phrygia': 'TRH', 'lydia': 'TRH', 'anatolia': 'TRH',
  // Crete
  'crete': 'CRT',
  // Italian peoples
  'etrurians': 'ITL', 'sabini': 'ITL', 'samnites': 'ITL', 'roman republic': 'ITL', 'latins': 'ITL',
  // Syracuse / Sicily
  'carthaginian empire': 'CAR', 'carthage': 'CAR',
  // Egypt
  'egypt': 'KMT', 'kemet': 'KMT',
  //
  'kush': 'NUB',
  // Persia (off-map / buffer)
  'achaemenid empire': 'EUN', 'persian empire': 'EUN',
  'magadha': 'EUN', 'zhou states': 'EUN', 'simhala': 'EUN', 'gojoseon': 'EUN',
  'zhangzhung kingdom': 'EUN', 'xiongnu': 'EUN',
  // Celts
  'celts': 'CEL', 'boii': 'CEL', 'celltic hallsatt culture': 'CEL', 'germanic tribes': 'CEL',
  // Scythia
  'scythians': 'SCY',
  // Nubia
  'kush': 'NUB',
  // West Africa
  'west african cereal farmers': 'NUB',
}

const ERA_CONFIGS = [
  {
    era: 'greek',
    url: `${BASE}/world_bc400.geojson`,
    out: 'greek_render.geojson',
    mapping: GREEK_MAP,
    defaultPolity: 'EUN',
  },
  {
    era: 'roman',
    url: `${BASE}/world_100.geojson`,
    out: 'roman_render.geojson',
    mapping: ROMAN_MAP,
    defaultPolity: 'EUN',
  },
  {
    era: 'ottoman',
    url: `${BASE}/world_1530.geojson`,
    out: 'ottoman_render.geojson',
    mapping: OTTOMAN_MAP,
    defaultPolity: 'EUN',
  },
]

// Polity display names (for ADMIN field in output GeoJSON)
const POLITY_NAMES = {
  // Greek
  ATH: 'Athens', SPA: 'Sparta', THE: 'Thebes', MAC: 'Macedon', EPI: 'Epirus',
  THS: 'Thessaly', ACH: 'Achaea', ILY: 'Illyria', TRH: 'Anatolia', CRT: 'Crete',
  ITL: 'Italy', SRC: 'Syracuse', KMT: 'Egypt', CAR: 'Carthage', CEL: 'Celtic Gaul',
  SCY: 'Scythia', NUB: 'Nubia', ARA: 'Arabia', EUN: 'Persia',
  // Roman
  ROM: 'Roman Empire', PAR: 'Parthian Empire', KUS: 'Kushan Empire', DEC: 'Deccan Kingdoms',
  GER: 'Germania', SAR: 'Sarmatia', AXU: 'Axum', ARK: 'Armenia',
  // Ottoman
  OTT: 'Ottoman Empire', SAF: 'Safavid Persia', HAB: 'Habsburg Empire',
  HRE: 'Holy Roman Empire', FRA: 'France', ENG: 'England', PLT: 'Poland-Lithuania',
  POR: 'Portugal', ESP: 'Spain', VNC: 'Venice', MUS: 'Muscovy',
  MUG: 'Mughal Empire', SON: 'Songhai', MOR: 'Morocco', ETI: 'Ethiopia',
  ACH: 'Aceh Sultanate',
}

function nameToPolity(name, mapping, defaultPolity) {
  if (!name) return defaultPolity
  const key = name.toLowerCase().trim()
  if (mapping[key]) return mapping[key]
  // Conservative partial match: only for patterns >= 6 chars that appear as word-boundary substrings
  for (const [pattern, iso] of Object.entries(mapping)) {
    if (pattern.length >= 6 && key.includes(pattern)) return iso
  }
  return defaultPolity
}

async function downloadAndProcess({ era, url, out, mapping, defaultPolity }) {
  console.log(`\nDownloading ${era} from ${url}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const geojson = await res.json()

  console.log(`  ${geojson.features.length} features`)

  // Collect all unique names (for debugging)
  const names = new Set()
  const mapped = []

  for (const feature of geojson.features) {
    const props = feature.properties ?? {}
    const name = props.NAME ?? props.ABBREVN ?? ''
    names.add(name)

    const polity = nameToPolity(name, mapping, defaultPolity)
    const displayName = POLITY_NAMES[polity] ?? name

    mapped.push({
      ...feature,
      properties: {
        ...props,
        ISO_A3: polity,
        ADM0_A3: polity,
        ADMIN: displayName,
        NAME: displayName,
        ORIG_NAME: name,
      },
    })
  }

  // Print names for review
  console.log('  Unique NAME values in source:')
  for (const n of [...names].sort()) {
    const polity = nameToPolity(n, mapping, defaultPolity)
    const unmapped = polity === defaultPolity ? ' ← UNMAPPED' : ''
    console.log(`    "${n}" → ${polity}${unmapped}`)
  }

  const outGeoJSON = { type: 'FeatureCollection', features: mapped }
  const outPath = join(__dirname, out)
  writeFileSync(outPath, JSON.stringify(outGeoJSON))
  console.log(`  Saved → ${outPath}`)
}

console.log('Downloading historical basemaps for ancient eras...')
for (const config of ERA_CONFIGS) {
  try {
    await downloadAndProcess(config)
  } catch (err) {
    console.error(`  ERROR for ${config.era}:`, err.message)
  }
}
console.log('\nDone! Restart your server to pick up the new files.')
