export type HistoricalEraId =
  | 'bronze_age' | 'classical_greek' | 'alexander' | 'qin_expansion'
  | 'punic_wars' | 'roman_peak' | 'late_antiquity' | 'tang_abbasid'
  | 'high_medieval' | 'age_of_exploration' | 'ottoman_classical'
  | 'enlightenment' | 'industrial_dawn' | 'great_war' | 'interwar'

export type ModernEraId = '1945' | '1960s' | '1990s' | '2010s' | 'modern'
export type AnyEraId = HistoricalEraId | ModernEraId

export interface EraDefinition {
  id: HistoricalEraId
  year: number              // negative for BCE
  yearLabel: string         // display label e.g. "431 BCE"
  name: string              // display name
  tagline: string           // 1-line description
  aoureDnikFile: string     // source file basename
  group: 'ancient' | 'medieval' | 'industrial'
}

export const HISTORICAL_ERAS: EraDefinition[] = [
  { id: 'bronze_age',        year: -1500, yearLabel: '1500 BCE', name: 'Bronze Age',           tagline: 'Egypt, Hittites, Babylon, Indus Valley',                aoureDnikFile: 'world_bc1500', group: 'ancient' },
  { id: 'classical_greek',   year: -431,  yearLabel: '431 BCE',  name: 'Classical Greek',      tagline: 'Peloponnesian War — Athens, Sparta, Persia',           aoureDnikFile: 'world_bc500',  group: 'ancient' },
  { id: 'alexander',         year: -323,  yearLabel: '323 BCE',  name: 'Alexander the Great',  tagline: "Macedonian empire at maximum extent",                  aoureDnikFile: 'world_bc323',  group: 'ancient' },
  { id: 'qin_expansion',     year: -300,  yearLabel: '300 BCE',  name: 'Qin Expansion',        tagline: 'Warring States → Qin unification, Mauryan India',      aoureDnikFile: 'world_bc300',  group: 'ancient' },
  { id: 'punic_wars',        year: -200,  yearLabel: '200 BCE',  name: 'Punic Wars',           tagline: 'Rome vs Carthage finale, Seleucid, Han emerging',      aoureDnikFile: 'world_bc200',  group: 'ancient' },
  { id: 'roman_peak',        year: 117,   yearLabel: '117 CE',   name: 'Roman Peak',           tagline: "Trajan's Rome, Han China, Parthia, Kushan",            aoureDnikFile: 'world_100',    group: 'ancient' },
  { id: 'late_antiquity',    year: 500,   yearLabel: '500 CE',   name: 'Late Antiquity',       tagline: 'Fall of Rome, Sassanid Persia, Gupta India',           aoureDnikFile: 'world_500',    group: 'ancient' },
  { id: 'tang_abbasid',      year: 800,   yearLabel: '800 CE',   name: 'Tang & Abbasid',       tagline: 'Islamic Golden Age, Tang peak, Carolingian',           aoureDnikFile: 'world_800',    group: 'medieval' },
  { id: 'high_medieval',     year: 1279,  yearLabel: '1279 CE',  name: 'High Medieval',        tagline: 'Mongol Empire peak, Song China, Mamluks',              aoureDnikFile: 'world_1279',   group: 'medieval' },
  { id: 'age_of_exploration',year: 1492,  yearLabel: '1492 CE',  name: 'Age of Exploration',   tagline: 'Columbus, Reconquista, Aztec, Inca, Ming',             aoureDnikFile: 'world_1492',   group: 'medieval' },
  { id: 'ottoman_classical', year: 1530,  yearLabel: '1530 CE',  name: 'Ottoman Classical',    tagline: 'Suleiman, Habsburg, Mughal, Songhai, Sengoku',         aoureDnikFile: 'world_1530',   group: 'medieval' },
  { id: 'enlightenment',     year: 1715,  yearLabel: '1715 CE',  name: 'Enlightenment',        tagline: 'Louis XIV, late Mughal, Qing, Tokugawa',               aoureDnikFile: 'world_1715',   group: 'medieval' },
  { id: 'industrial_dawn',   year: 1880,  yearLabel: '1880 CE',  name: 'Industrial Dawn',      tagline: 'Britain peak, Bismarck, Meiji, Scramble for Africa',   aoureDnikFile: 'world_1880',   group: 'industrial' },
  { id: 'great_war',         year: 1914,  yearLabel: '1914 CE',  name: 'Great War',            tagline: 'WWI eve',                                              aoureDnikFile: 'world_1914',   group: 'industrial' },
  { id: 'interwar',          year: 1938,  yearLabel: '1938 CE',  name: 'Interwar',             tagline: 'Pre-WWII tensions',                                    aoureDnikFile: 'world_1938',   group: 'industrial' },
]

export const MODERN_ERAS: ReadonlyArray<{ id: ModernEraId; year: number; yearLabel: string; name: string; tagline: string }> = [
  { id: '1945',   year: 1945, yearLabel: '1945',  name: 'Post-WWII',     tagline: 'Cold War dawn, decolonisation begins' },
  { id: '1960s',  year: 1960, yearLabel: '1960s', name: '1960s',         tagline: 'Cold War tensions, Vietnam, civil rights' },
  { id: '1990s',  year: 1990, yearLabel: '1990s', name: '1990s',         tagline: 'Post-Soviet realignment, globalisation' },
  { id: '2010s',  year: 2010, yearLabel: '2010s', name: '2010s',         tagline: 'Multipolar world, Arab Spring, BRICS' },
  { id: 'modern', year: 2025, yearLabel: '2025',  name: 'Modern',        tagline: 'Present day' },
]

export const ERA_BY_ID: Record<HistoricalEraId, EraDefinition> = Object.fromEntries(
  HISTORICAL_ERAS.map(e => [e.id, e])
) as Record<HistoricalEraId, EraDefinition>

export const ALL_ERAS_IN_ORDER: AnyEraId[] = [
  ...HISTORICAL_ERAS.map(e => e.id),
  ...MODERN_ERAS.map(e => e.id),
]

export function getEraIndex(id: AnyEraId): number {
  return ALL_ERAS_IN_ORDER.indexOf(id)
}

export function getNextEra(id: AnyEraId): AnyEraId | null {
  const idx = getEraIndex(id)
  if (idx < 0 || idx >= ALL_ERAS_IN_ORDER.length - 1) return null
  return ALL_ERAS_IN_ORDER[idx + 1]
}

export function isHistoricalEra(id: string): id is HistoricalEraId {
  return HISTORICAL_ERAS.some(e => e.id === id)
}

// USD purchasing-power equivalent per native currency unit, used ONLY for the
// click-to-toggle USD display in the UI. Not used in any internal math.
export const ERA_USD_CONVERSION_RATE: Record<HistoricalEraId, number> = {
  bronze_age:        100,
  classical_greek:   2500,
  alexander:         2500,
  qin_expansion:     1500,
  punic_wars:        2500,
  roman_peak:        30,
  late_antiquity:    25,
  tang_abbasid:      80,
  high_medieval:     100,
  age_of_exploration:120,
  ottoman_classical: 150,
  enlightenment:     200,
  industrial_dawn:   1,
  great_war:         1,
  interwar:          1,
}

// Era-specific currency unit name shown on the GDP display.
export const ERA_CURRENCY_UNIT: Record<HistoricalEraId, string> = {
  bronze_age:        'deben',
  classical_greek:   'talents',
  alexander:         'talents',
  qin_expansion:     'jin',
  punic_wars:        'talents',
  roman_peak:        'denarii',
  late_antiquity:    'solidi',
  tang_abbasid:      'solidi',
  high_medieval:     'florins',
  age_of_exploration:'florins',
  ottoman_classical: 'ducats',
  enlightenment:     'ducats',
  industrial_dawn:   'pounds',
  great_war:         'pounds',
  interwar:          'dollars',
}
