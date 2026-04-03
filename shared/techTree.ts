import type { TechNode, Era } from './types'

// Research times are in weeks (realistic approximations).
// Cost is in researchPoints (game currency).
// Prerequisites define unlock order.
// unlocksEra: which eras this tech is available to research from.

export const TECH_TREE: TechNode[] = [
  // ── Foundational ──────────────────────────────────────────────────────────
  {
    id: 'basic_industry',
    name: 'Industrial Base',
    description: 'Establish foundational heavy industry: steel, cement, machine tools.',
    researchWeeks: 52,
    cost: 50,
    prerequisites: [],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'advanced_manufacturing',
    name: 'Advanced Manufacturing',
    description: 'Precision manufacturing, CNC machining, mass production optimisation.',
    researchWeeks: 104,
    cost: 120,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },

  // ── Electronics / Semiconductors ──────────────────────────────────────────
  {
    id: 'photolithography',
    name: 'Photolithography',
    description: 'Develop UV light-based chip patterning. Foundation of semiconductor fabrication.',
    researchWeeks: 260,    // ~5 years — realistic for a developing country in the 80s/90s
    cost: 400,
    prerequisites: ['advanced_manufacturing'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'semiconductors',
    name: 'Semiconductor Industry',
    description: 'Build domestic IC fabrication capacity. Enables microchips, sensors, computing.',
    researchWeeks: 520,    // ~10 years to mature fab capacity
    cost: 800,
    prerequisites: ['photolithography'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'computing',
    name: 'Computing Infrastructure',
    description: 'Domestic computing hardware, software industry, and internet infrastructure.',
    researchWeeks: 156,
    cost: 300,
    prerequisites: ['semiconductors'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'ai_research',
    name: 'Artificial Intelligence',
    description: 'Large-scale AI research programs, GPU clusters, national AI strategy.',
    researchWeeks: 260,
    cost: 600,
    prerequisites: ['computing', 'semiconductors'],
    unlocksEra: ['2010s', 'modern'],
  },

  // ── Nuclear ───────────────────────────────────────────────────────────────
  {
    id: 'nuclear_fission',
    name: 'Nuclear Fission',
    description: 'Develop nuclear fission technology for power and (potentially) weapons.',
    researchWeeks: 520,   // Manhattan Project took ~3 years with massive resources; normally 10+
    cost: 1000,
    prerequisites: ['advanced_manufacturing'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'nuclear_fusion',
    name: 'Nuclear Fusion',
    description: 'Experimental fusion energy research. Decades away from commercial viability.',
    researchWeeks: 2600,  // ~50 years of research globally
    cost: 2000,
    prerequisites: ['nuclear_fission', 'computing'],
    unlocksEra: ['2010s', 'modern'],
  },

  // ── Space ─────────────────────────────────────────────────────────────────
  {
    id: 'space_launch',
    name: 'Space Launch Capability',
    description: 'Develop domestic launch vehicles and rockets for orbital access.',
    researchWeeks: 312,   // ~6 years: early US/Soviet programs
    cost: 600,
    prerequisites: ['advanced_manufacturing'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'satellite_network',
    name: 'Satellite Network',
    description: 'Deploy communication, GPS, and reconnaissance satellite constellations.',
    researchWeeks: 156,
    cost: 400,
    prerequisites: ['space_launch'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'moon_landing',
    name: 'Crewed Moon Landing',
    description: 'Send humans to the lunar surface. Enormous national prestige.',
    researchWeeks: 416,   // ~8 years: Apollo program
    cost: 1500,
    prerequisites: ['space_launch', 'computing'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },

  // ── Biotech / Health ──────────────────────────────────────────────────────
  {
    id: 'biotech',
    name: 'Biotechnology',
    description: 'Genetic research, vaccine development, pharmaceutical manufacturing.',
    researchWeeks: 260,
    cost: 500,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },

  // ── Energy ────────────────────────────────────────────────────────────────
  {
    id: 'renewable_energy',
    name: 'Renewable Energy Grid',
    description: 'Large-scale solar, wind, and battery storage — reduce fossil fuel dependency.',
    researchWeeks: 208,
    cost: 400,
    prerequisites: ['basic_industry'],
    unlocksEra: ['2010s', 'modern'],
  },

  // ── Military tech ─────────────────────────────────────────────────────────
  {
    id: 'stealth_tech',
    name: 'Stealth Technology',
    description: 'Radar-absorbent materials and low-observable aircraft design.',
    researchWeeks: 520,
    cost: 800,
    prerequisites: ['advanced_manufacturing', 'computing'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'hypersonics',
    name: 'Hypersonic Weapons',
    description: 'Hypersonic glide vehicles and cruise missiles — Mach 5+ delivery systems.',
    researchWeeks: 416,
    cost: 900,
    prerequisites: ['advanced_manufacturing', 'computing'],
    unlocksEra: ['2010s', 'modern'],
  },
]

// ── Ancient & Medieval Technologies ──────────────────────────────────────────

export const ANCIENT_TECH_TREE: TechNode[] = [
  // ── Metallurgy ──────────────────────────────────────────────────────────
  { id: 'bronze_working', name: 'Bronze Working', description: 'Smelt copper and tin to produce weapons, tools, and armour.', researchWeeks: 26, cost: 30, prerequisites: [], unlocksEra: ['greek'] },
  { id: 'iron_working', name: 'Iron Working', description: 'Forge iron into superior weapons and agricultural tools.', researchWeeks: 52, cost: 60, prerequisites: ['bronze_working'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'steel_forging', name: 'Steel Forging', description: 'Produce high-quality steel for swords, armour, and tools.', researchWeeks: 78, cost: 120, prerequisites: ['iron_working'], unlocksEra: ['roman', 'ottoman'] },

  // ── Military ─────────────────────────────────────────────────────────────
  { id: 'hoplite_warfare', name: 'Hoplite Warfare', description: 'Train disciplined citizen-soldiers in phalanx formation with spear and shield.', researchWeeks: 26, cost: 40, prerequisites: ['bronze_working'], unlocksEra: ['greek'] },
  { id: 'cavalry', name: 'Cavalry', description: 'Light cavalry for scouting, flanking, and raiding. Iberian horsemen, Scythian archers.', researchWeeks: 26, cost: 40, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'heavy_cavalry', name: 'Heavy Cavalry', description: 'Armoured cataphracts and knights for decisive battlefield charges.', researchWeeks: 52, cost: 100, prerequisites: ['cavalry', 'iron_working'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'naval_warfare', name: 'Naval Warfare', description: 'Build war galleys (triremes, quinqueremes) and develop naval tactics.', researchWeeks: 52, cost: 80, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'siege_weapons', name: 'Siege Weapons', description: 'Battering rams, ballistae, and catapults to break fortifications.', researchWeeks: 52, cost: 90, prerequisites: ['iron_working'], unlocksEra: ['greek', 'roman'] },
  { id: 'trebuchet', name: 'Trebuchet', description: 'Massive counterweight siege engine — the ultimate castle-breaker.', researchWeeks: 78, cost: 150, prerequisites: ['siege_weapons', 'fortifications'], unlocksEra: ['ottoman'] },
  { id: 'professional_army', name: 'Professional Army', description: 'Paid standing legions with standardised equipment, training, and discipline.', researchWeeks: 78, cost: 120, prerequisites: ['iron_working', 'hoplite_warfare'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'fortifications', name: 'Fortifications', description: 'Stone walls, towers, and defensive earthworks to protect cities and borders.', researchWeeks: 52, cost: 80, prerequisites: ['iron_working'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'janissary_corps', name: 'Janissary Corps', description: 'Elite infantry infantry recruited and trained from childhood — the backbone of the Ottoman army.', researchWeeks: 104, cost: 200, prerequisites: ['professional_army', 'gunpowder'], unlocksEra: ['ottoman'] },
  { id: 'longbow', name: 'Longbow', description: 'English longbow archers capable of armour-piercing volleys at distance.', researchWeeks: 26, cost: 50, prerequisites: [], unlocksEra: ['ottoman'] },
  { id: 'crossbow', name: 'Crossbow', description: 'Mechanically loaded bow requiring less training — deadly at range.', researchWeeks: 26, cost: 50, prerequisites: ['iron_working'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'plate_armour', name: 'Plate Armour', description: 'Full body plate armour for knights — near-impenetrable in melee.', researchWeeks: 52, cost: 100, prerequisites: ['steel_forging'], unlocksEra: ['ottoman'] },
  { id: 'gunpowder', name: 'Gunpowder', description: 'Black powder for cannons, early firearms, and fire arrows.', researchWeeks: 78, cost: 160, prerequisites: ['steel_forging'], unlocksEra: ['ottoman'] },
  { id: 'cannon', name: 'Cannon Artillery', description: 'Bronze and iron cannons that shatter walls and devastate infantry formations.', researchWeeks: 78, cost: 200, prerequisites: ['gunpowder', 'steel_forging'], unlocksEra: ['ottoman'] },

  // ── Engineering ──────────────────────────────────────────────────────────
  { id: 'road_network', name: 'Road Network', description: 'Paved roads for rapid troop movement, trade, and communication — "All roads lead to Rome."', researchWeeks: 78, cost: 100, prerequisites: ['iron_working'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'aqueducts', name: 'Aqueducts', description: 'Gravity-fed stone channels bringing fresh water to cities and agriculture.', researchWeeks: 78, cost: 120, prerequisites: ['architecture'], unlocksEra: ['roman'] },
  { id: 'architecture', name: 'Architecture', description: 'Monumental construction: temples, forums, coliseums, minarets, and grand bazaars.', researchWeeks: 52, cost: 80, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },

  // ── Knowledge ─────────────────────────────────────────────────────────────
  { id: 'philosophy', name: 'Philosophy', description: 'Systematic reasoning, ethics, and natural philosophy — the foundation of Western thought.', researchWeeks: 52, cost: 60, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'mathematics', name: 'Mathematics', description: 'Geometry, arithmetic, and algebra — from Euclid to al-Khwarizmi.', researchWeeks: 52, cost: 70, prerequisites: ['philosophy'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'medicine', name: 'Medicine', description: 'Systematic medical knowledge: Hippocratic texts, herbal remedies, surgery.', researchWeeks: 52, cost: 60, prerequisites: ['philosophy'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'astronomy', name: 'Astronomy', description: 'Celestial navigation, calendars, and star charts — essential for farming and seafaring.', researchWeeks: 52, cost: 60, prerequisites: ['mathematics'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'printing_press', name: 'Printing Press', description: 'Moveable type enables mass dissemination of knowledge, law, and religion.', researchWeeks: 52, cost: 120, prerequisites: ['mathematics'], unlocksEra: ['ottoman'] },

  // ── Agriculture & Water ──────────────────────────────────────────────────
  { id: 'irrigation', name: 'Irrigation', description: 'Canal networks and flood-basin agriculture to feed large populations.', researchWeeks: 26, cost: 40, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'qanat_system', name: 'Qanat System', description: 'Underground irrigation tunnels to bring water from mountain aquifers to arid plains.', researchWeeks: 52, cost: 80, prerequisites: ['irrigation', 'architecture'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'crop_rotation', name: 'Crop Rotation', description: 'Systematic alternation of crops to restore soil fertility and increase yields.', researchWeeks: 26, cost: 40, prerequisites: ['irrigation'], unlocksEra: ['greek', 'roman', 'ottoman'] },

  // ── Economy & Trade ──────────────────────────────────────────────────────
  { id: 'coinage', name: 'Coinage', description: 'Standardised minted coins to facilitate commerce, taxation, and army pay.', researchWeeks: 26, cost: 40, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'trade_routes', name: 'Trade Routes', description: 'Establish overland and maritime trade networks — Silk Road, spice routes.', researchWeeks: 52, cost: 80, prerequisites: ['coinage', 'naval_warfare'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'merchant_guilds', name: 'Merchant Guilds', description: 'Organised trade guilds that regulate commerce, extend credit, and fund expeditions.', researchWeeks: 52, cost: 100, prerequisites: ['trade_routes'], unlocksEra: ['ottoman'] },

  // ── Naval (Early Modern) ─────────────────────────────────────────────────
  { id: 'caravel', name: 'Caravel & Ocean Navigation', description: 'Lateen-rigged ships capable of sailing against the wind — enabling ocean exploration.', researchWeeks: 78, cost: 160, prerequisites: ['naval_warfare', 'astronomy'], unlocksEra: ['ottoman'] },
]

const ALL_TECHS: TechNode[] = [...TECH_TREE, ...ANCIENT_TECH_TREE]

export function getAvailableTechs(era: Era, unlockedTechs: string[]): TechNode[] {
  return ALL_TECHS.filter(t =>
    t.unlocksEra.includes(era) &&
    !unlockedTechs.includes(t.id) &&
    t.prerequisites.every(p => unlockedTechs.includes(p))
  )
}
