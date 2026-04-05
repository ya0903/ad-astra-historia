import type { TechNode, Era, TechId } from './types.js'

// ── Era grouping ─────────────────────────────────────────────────────────────
// Ancient eras use the ANCIENT_TECH_TREE; modern eras use TECH_TREE.
// The UI uses this to show only the era-appropriate tree.
export const MODERN_ERAS: Era[] = ['1945', '1960s', '1990s', '2010s', 'modern']
export const ANCIENT_ERAS: Era[] = ['greek', 'roman', 'ottoman', 'abbasid', 'tang', 'aztec', 'songhai', 'sengoku']

export function getEraGroup(era: Era): 'ancient' | 'modern' {
  return ANCIENT_ERAS.includes(era) ? 'ancient' : 'modern'
}

// ── Modern / Post-1900s Tech Tree ────────────────────────────────────────────

export const TECH_TREE: TechNode[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'basic_industry',
    name: 'Industrial Base',
    category: 'infrastructure',
    description: 'Foundational heavy industry: steel, cement, machine tools, and manufacturing capacity.',
    researchWeeks: 52,
    cost: 50,
    prerequisites: [],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'advanced_manufacturing',
    name: 'Advanced Manufacturing',
    category: 'infrastructure',
    description: 'Precision CNC machining, lean production, quality standards, and mass manufacturing optimisation.',
    researchWeeks: 104,
    cost: 120,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'national_grid',
    name: 'National Power Grid',
    category: 'infrastructure',
    description: 'Nationwide electricity distribution network linking generation to households and industry.',
    researchWeeks: 78,
    cost: 80,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'renewable_energy',
    name: 'Renewable Energy Grid',
    category: 'infrastructure',
    description: 'Large-scale solar, wind, and battery storage — reduce fossil fuel dependency.',
    researchWeeks: 208,
    cost: 400,
    prerequisites: ['national_grid'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'highway_network',
    name: 'National Highway Network',
    category: 'infrastructure',
    description: 'Motorways and expressways connecting major cities — accelerates trade and logistics.',
    researchWeeks: 130,
    cost: 150,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'high_speed_rail_tech',
    name: 'High-Speed Rail Technology',
    category: 'infrastructure',
    description: 'Maglev and electric HSR systems for fast passenger movement between major urban centres.',
    researchWeeks: 260,
    cost: 500,
    prerequisites: ['highway_network', 'advanced_manufacturing'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'deepwater_port',
    name: 'Deepwater Port Infrastructure',
    category: 'infrastructure',
    description: 'Modern container terminals and deepwater quays enabling bulk international trade.',
    researchWeeks: 104,
    cost: 180,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'civil_aviation',
    name: 'Civil Aviation',
    category: 'infrastructure',
    description: 'Commercial aviation infrastructure: airports, air traffic control, and domestic carriers.',
    researchWeeks: 104,
    cost: 160,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'water_sanitation',
    name: 'Water & Sanitation',
    category: 'infrastructure',
    description: 'Municipal water treatment, sewage systems, and clean water access across the country.',
    researchWeeks: 78,
    cost: 100,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'telecom_infrastructure',
    name: 'Telecommunications',
    category: 'infrastructure',
    description: 'National telephone network, radio broadcasting, and foundational communications grid.',
    researchWeeks: 78,
    cost: 90,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'internet_backbone',
    name: 'Internet Backbone',
    category: 'infrastructure',
    description: 'High-capacity fibre optic and submarine cable networks enabling nationwide internet.',
    researchWeeks: 130,
    cost: 250,
    prerequisites: ['telecom_infrastructure', 'computing'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: '5g_network',
    name: '5G Network',
    category: 'infrastructure',
    description: 'Fifth-generation mobile broadband enabling IoT, autonomous systems, and smart cities.',
    researchWeeks: 156,
    cost: 400,
    prerequisites: ['internet_backbone', 'semiconductors'],
    unlocksEra: ['2010s', 'modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCIENCE & TECHNOLOGY
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'photolithography',
    name: 'Photolithography',
    category: 'science',
    description: 'UV light-based chip patterning — foundation of semiconductor fabrication.',
    researchWeeks: 260,
    cost: 400,
    prerequisites: ['advanced_manufacturing'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'semiconductors',
    name: 'Semiconductor Industry',
    category: 'science',
    description: 'Domestic IC fabrication capacity enabling microchips, sensors, and computing.',
    researchWeeks: 520,
    cost: 800,
    prerequisites: ['photolithography'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'computing',
    name: 'Computing Infrastructure',
    category: 'science',
    description: 'Domestic computing hardware, software industry, and internet infrastructure.',
    researchWeeks: 156,
    cost: 300,
    prerequisites: ['semiconductors'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'ai_research',
    name: 'Artificial Intelligence',
    category: 'science',
    description: 'Large-scale AI research programmes, GPU clusters, national AI strategy.',
    researchWeeks: 260,
    cost: 600,
    prerequisites: ['computing', 'semiconductors'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'quantum_computing',
    name: 'Quantum Computing',
    category: 'science',
    description: 'Quantum processors for cryptography, materials science, and drug discovery.',
    researchWeeks: 416,
    cost: 1200,
    prerequisites: ['ai_research', 'semiconductors'],
    unlocksEra: ['modern'],
  },
  {
    id: 'nuclear_fission',
    name: 'Nuclear Fission',
    category: 'science',
    description: 'Nuclear fission technology for power generation and (potentially) weapons.',
    researchWeeks: 520,
    cost: 1000,
    prerequisites: ['advanced_manufacturing'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'nuclear_fusion',
    name: 'Nuclear Fusion',
    category: 'science',
    description: 'Experimental fusion energy — decades of research for clean limitless power.',
    researchWeeks: 2600,
    cost: 2000,
    prerequisites: ['nuclear_fission', 'computing'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'space_launch',
    name: 'Space Launch Capability',
    category: 'science',
    description: 'Domestic launch vehicles and rockets for orbital access.',
    researchWeeks: 312,
    cost: 600,
    prerequisites: ['advanced_manufacturing'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'satellite_network',
    name: 'Satellite Network',
    category: 'science',
    description: 'Communication, GPS, and reconnaissance satellite constellations.',
    researchWeeks: 156,
    cost: 400,
    prerequisites: ['space_launch'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'moon_landing',
    name: 'Crewed Moon Landing',
    category: 'science',
    description: 'Send humans to the lunar surface — enormous national prestige.',
    researchWeeks: 416,
    cost: 1500,
    prerequisites: ['space_launch', 'computing'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'mars_mission',
    name: 'Mars Mission',
    category: 'science',
    description: 'Crewed interplanetary voyage to Mars — pinnacle of space achievement.',
    researchWeeks: 780,
    cost: 3000,
    prerequisites: ['moon_landing', 'ai_research'],
    unlocksEra: ['modern'],
  },
  {
    id: 'biotech',
    name: 'Biotechnology',
    category: 'science',
    description: 'Genetic research, vaccine development, pharmaceutical manufacturing.',
    researchWeeks: 260,
    cost: 500,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'genetic_engineering',
    name: 'Genetic Engineering',
    category: 'science',
    description: 'CRISPR and gene editing for medicine, agriculture, and biodefence.',
    researchWeeks: 312,
    cost: 700,
    prerequisites: ['biotech', 'computing'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'nanotechnology',
    name: 'Nanotechnology',
    category: 'science',
    description: 'Molecular-scale engineering for advanced materials, medicine, and electronics.',
    researchWeeks: 416,
    cost: 900,
    prerequisites: ['genetic_engineering', 'quantum_computing'],
    unlocksEra: ['modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MILITARY
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'stealth_tech',
    name: 'Stealth Technology',
    category: 'military',
    description: 'Radar-absorbent materials and low-observable aircraft design.',
    researchWeeks: 520,
    cost: 800,
    prerequisites: ['advanced_manufacturing', 'computing'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'hypersonics',
    name: 'Hypersonic Weapons',
    category: 'military',
    description: 'Hypersonic glide vehicles and cruise missiles — Mach 5+ delivery systems.',
    researchWeeks: 416,
    cost: 900,
    prerequisites: ['advanced_manufacturing', 'computing'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'drone_warfare',
    name: 'Drone Warfare',
    category: 'military',
    description: 'Armed UAVs, loitering munitions, and autonomous drone swarms.',
    researchWeeks: 260,
    cost: 500,
    prerequisites: ['computing', 'advanced_manufacturing'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'cyber_warfare',
    name: 'Cyber Warfare',
    category: 'military',
    description: 'Offensive and defensive cyberspace operations — national cyber command.',
    researchWeeks: 208,
    cost: 400,
    prerequisites: ['computing'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'missile_defence',
    name: 'Missile Defence',
    category: 'military',
    description: 'Ballistic missile interception systems — THAAD, S-400, Arrow type capabilities.',
    researchWeeks: 416,
    cost: 800,
    prerequisites: ['advanced_manufacturing', 'computing'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'aircraft_carrier',
    name: 'Aircraft Carrier Programme',
    category: 'military',
    description: 'Nuclear or conventional aircraft carriers enabling blue-water power projection.',
    researchWeeks: 520,
    cost: 1200,
    prerequisites: ['advanced_manufacturing', 'civil_aviation'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ECONOMY
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'central_banking',
    name: 'Central Banking',
    category: 'economy',
    description: 'Independent central bank with monetary policy tools — inflation control and lending.',
    researchWeeks: 52,
    cost: 60,
    prerequisites: [],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'stock_exchange',
    name: 'Stock Exchange & Capital Markets',
    category: 'economy',
    description: 'Domestic equity markets, IPO infrastructure, and investment banking.',
    researchWeeks: 78,
    cost: 100,
    prerequisites: ['central_banking'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'free_trade_zone',
    name: 'Free Trade Zones',
    category: 'economy',
    description: 'Export processing zones with low tariffs to attract foreign investment and manufacturing.',
    researchWeeks: 78,
    cost: 120,
    prerequisites: ['central_banking', 'deepwater_port'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'industrial_agriculture',
    name: 'Industrial Agriculture',
    category: 'economy',
    description: 'Green revolution crops, mechanised farming, fertilisers, and irrigation systems.',
    researchWeeks: 104,
    cost: 150,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'green_agriculture',
    name: 'Sustainable Agriculture',
    category: 'economy',
    description: 'Precision farming, vertical agriculture, and low-impact food production.',
    researchWeeks: 156,
    cost: 250,
    prerequisites: ['industrial_agriculture', 'biotech'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'sovereign_wealth',
    name: 'Sovereign Wealth Fund',
    category: 'economy',
    description: 'State investment vehicle for long-term national asset management.',
    researchWeeks: 52,
    cost: 80,
    prerequisites: ['central_banking', 'stock_exchange'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GOVERNMENT
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'census_bureau',
    name: 'National Statistics Bureau',
    category: 'government',
    description: 'Systematic national census and statistics collection for evidence-based policy.',
    researchWeeks: 26,
    cost: 30,
    prerequisites: [],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'civil_service',
    name: 'Professional Civil Service',
    category: 'government',
    description: 'Merit-based bureaucracy with standardised examinations, pay grades, and tenure.',
    researchWeeks: 52,
    cost: 60,
    prerequisites: ['census_bureau'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'anti_corruption',
    name: 'Anti-Corruption Bodies',
    category: 'government',
    description: 'Independent anti-corruption commissions and financial disclosure requirements.',
    researchWeeks: 78,
    cost: 100,
    prerequisites: ['civil_service'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'public_broadcasting',
    name: 'Public Broadcasting',
    category: 'government',
    description: 'State broadcast media for public information, education, and national culture.',
    researchWeeks: 52,
    cost: 50,
    prerequisites: ['telecom_infrastructure'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'digital_governance',
    name: 'Digital Government',
    category: 'government',
    description: 'e-Government platforms: digital IDs, online tax filing, and public service portals.',
    researchWeeks: 130,
    cost: 200,
    prerequisites: ['internet_backbone', 'civil_service'],
    unlocksEra: ['2010s', 'modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SOCIETY
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'universal_healthcare',
    name: 'Universal Healthcare',
    category: 'society',
    description: 'National health insurance or public healthcare system for all citizens.',
    researchWeeks: 130,
    cost: 200,
    prerequisites: ['basic_industry', 'water_sanitation'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'public_education',
    name: 'Universal Education',
    category: 'society',
    description: 'Mandatory schooling, teacher training, and national curriculum from primary to secondary.',
    researchWeeks: 104,
    cost: 150,
    prerequisites: [],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'social_security',
    name: 'Social Security System',
    category: 'society',
    description: 'Pension system, unemployment benefits, and social safety net programmes.',
    researchWeeks: 104,
    cost: 160,
    prerequisites: ['civil_service', 'central_banking'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'mass_media',
    name: 'Mass Media & Culture Industry',
    category: 'society',
    description: 'Film industry, publishing, music, and cultural exports that project soft power.',
    researchWeeks: 78,
    cost: 100,
    prerequisites: ['public_broadcasting'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'space_programme_culture',
    name: 'Space Programme Culture',
    category: 'society',
    description: 'Public engagement with space exploration generates national pride and STEM talent pipelines.',
    researchWeeks: 78,
    cost: 120,
    prerequisites: ['space_launch', 'public_broadcasting'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
]

// ── Ancient & Medieval Tech Tree ─────────────────────────────────────────────

export const ANCIENT_TECH_TREE: TechNode[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'bronze_working', name: 'Bronze Working', category: 'infrastructure', description: 'Smelt copper and tin into weapons, tools, and armour.', researchWeeks: 26, cost: 30, prerequisites: [], unlocksEra: ['greek'] },
  { id: 'iron_working', name: 'Iron Working', category: 'infrastructure', description: 'Forge iron into superior weapons and agricultural tools.', researchWeeks: 52, cost: 60, prerequisites: ['bronze_working'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'steel_forging', name: 'Steel Forging', category: 'infrastructure', description: 'High-quality steel for swords, armour, and tools.', researchWeeks: 78, cost: 120, prerequisites: ['iron_working'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'road_network', name: 'Road Network', category: 'infrastructure', description: 'Paved roads for rapid troop movement, trade, and communication.', researchWeeks: 78, cost: 100, prerequisites: ['iron_working'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'aqueducts', name: 'Aqueducts', category: 'infrastructure', description: 'Gravity-fed stone channels bringing fresh water to cities.', researchWeeks: 78, cost: 120, prerequisites: ['architecture'], unlocksEra: ['roman'] },
  { id: 'architecture', name: 'Architecture', category: 'infrastructure', description: 'Monumental construction: temples, forums, coliseums, minarets, and grand bazaars.', researchWeeks: 52, cost: 80, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'irrigation', name: 'Irrigation', category: 'infrastructure', description: 'Canal networks and flood-basin agriculture to feed large populations.', researchWeeks: 26, cost: 40, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'qanat_system', name: 'Qanat System', category: 'infrastructure', description: 'Underground irrigation tunnels bringing mountain water to arid plains.', researchWeeks: 52, cost: 80, prerequisites: ['irrigation', 'architecture'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'crop_rotation', name: 'Crop Rotation', category: 'infrastructure', description: 'Systematic crop alternation restoring soil fertility and increasing yields.', researchWeeks: 26, cost: 40, prerequisites: ['irrigation'], unlocksEra: ['greek', 'roman', 'ottoman'] },

  // ══════════════════════════════════════════════════════════════════════════
  // MILITARY
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'hoplite_warfare', name: 'Hoplite Warfare', category: 'military', description: 'Disciplined citizen-soldiers in phalanx formation with spear and shield.', researchWeeks: 26, cost: 40, prerequisites: ['bronze_working'], unlocksEra: ['greek'] },
  { id: 'cavalry', name: 'Cavalry', category: 'military', description: 'Light cavalry for scouting, flanking, and raiding.', researchWeeks: 26, cost: 40, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'heavy_cavalry', name: 'Heavy Cavalry', category: 'military', description: 'Armoured cataphracts and knights for decisive charges.', researchWeeks: 52, cost: 100, prerequisites: ['cavalry', 'iron_working'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'naval_warfare', name: 'Naval Warfare', category: 'military', description: 'War galleys (triremes, quinqueremes) and naval tactics.', researchWeeks: 52, cost: 80, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'siege_weapons', name: 'Siege Weapons', category: 'military', description: 'Battering rams, ballistae, and catapults to break fortifications.', researchWeeks: 52, cost: 90, prerequisites: ['iron_working'], unlocksEra: ['greek', 'roman'] },
  { id: 'trebuchet', name: 'Trebuchet', category: 'military', description: 'Massive counterweight siege engine — the ultimate castle-breaker.', researchWeeks: 78, cost: 150, prerequisites: ['siege_weapons', 'fortifications'], unlocksEra: ['ottoman'] },
  { id: 'professional_army', name: 'Professional Army', category: 'military', description: 'Paid standing legions with standardised equipment and discipline.', researchWeeks: 78, cost: 120, prerequisites: ['iron_working', 'hoplite_warfare'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'fortifications', name: 'Fortifications', category: 'military', description: 'Stone walls, towers, and earthworks to protect cities and borders.', researchWeeks: 52, cost: 80, prerequisites: ['iron_working'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'janissary_corps', name: 'Janissary Corps', category: 'military', description: 'Elite infantry recruited and trained from childhood — backbone of the Ottoman army.', researchWeeks: 104, cost: 200, prerequisites: ['professional_army', 'gunpowder'], unlocksEra: ['ottoman'] },
  { id: 'longbow', name: 'Longbow', category: 'military', description: 'English longbow archers capable of armour-piercing volleys at distance.', researchWeeks: 26, cost: 50, prerequisites: [], unlocksEra: ['ottoman'] },
  { id: 'crossbow', name: 'Crossbow', category: 'military', description: 'Mechanically loaded bow requiring less training — deadly at range.', researchWeeks: 26, cost: 50, prerequisites: ['iron_working'], unlocksEra: ['roman', 'ottoman'] },
  { id: 'plate_armour', name: 'Plate Armour', category: 'military', description: 'Full body plate armour for knights — near-impenetrable in melee.', researchWeeks: 52, cost: 100, prerequisites: ['steel_forging'], unlocksEra: ['ottoman'] },
  { id: 'gunpowder', name: 'Gunpowder', category: 'military', description: 'Black powder for cannons, early firearms, and fire arrows.', researchWeeks: 78, cost: 160, prerequisites: ['steel_forging'], unlocksEra: ['ottoman'] },
  { id: 'cannon', name: 'Cannon Artillery', category: 'military', description: 'Bronze and iron cannons that shatter walls and devastate infantry.', researchWeeks: 78, cost: 200, prerequisites: ['gunpowder', 'steel_forging'], unlocksEra: ['ottoman'] },

  // ══════════════════════════════════════════════════════════════════════════
  // SCIENCE / KNOWLEDGE
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'philosophy', name: 'Philosophy', category: 'science', description: 'Systematic reasoning, ethics, and natural philosophy — foundation of Western thought.', researchWeeks: 52, cost: 60, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'mathematics', name: 'Mathematics', category: 'science', description: 'Geometry, arithmetic, and algebra — from Euclid to al-Khwarizmi.', researchWeeks: 52, cost: 70, prerequisites: ['philosophy'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'medicine', name: 'Medicine', category: 'science', description: 'Systematic medical knowledge: Hippocratic texts, herbal remedies, surgery.', researchWeeks: 52, cost: 60, prerequisites: ['philosophy'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'astronomy', name: 'Astronomy', category: 'science', description: 'Celestial navigation, calendars, and star charts.', researchWeeks: 52, cost: 60, prerequisites: ['mathematics'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'printing_press', name: 'Printing Press', category: 'science', description: 'Moveable type enables mass dissemination of knowledge, law, and religion.', researchWeeks: 52, cost: 120, prerequisites: ['mathematics'], unlocksEra: ['ottoman'] },

  // ══════════════════════════════════════════════════════════════════════════
  // ECONOMY
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'coinage', name: 'Coinage', category: 'economy', description: 'Standardised minted coins to facilitate commerce, taxation, and army pay.', researchWeeks: 26, cost: 40, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'trade_routes', name: 'Trade Routes', category: 'economy', description: 'Overland and maritime trade networks — Silk Road, spice routes.', researchWeeks: 52, cost: 80, prerequisites: ['coinage', 'naval_warfare'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'merchant_guilds', name: 'Merchant Guilds', category: 'economy', description: 'Organised trade guilds regulating commerce, extending credit, and funding expeditions.', researchWeeks: 52, cost: 100, prerequisites: ['trade_routes'], unlocksEra: ['ottoman'] },

  // ══════════════════════════════════════════════════════════════════════════
  // NAVAL & EXPLORATION (Science sub-domain)
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'coastal_navigation', name: 'Coastal Navigation', category: 'science', description: 'Coastal sailing using stars, landmarks, and tides.', researchWeeks: 26, cost: 45, prerequisites: [], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'cartography', name: 'Cartography', category: 'science', description: 'Systematic mapmaking of coastlines, rivers, and trade routes.', researchWeeks: 52, cost: 80, prerequisites: ['coastal_navigation', 'astronomy'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'compass_navigation', name: 'Compass & Astrolabe', category: 'science', description: 'Magnetic compass and astrolabe for open-ocean navigation.', researchWeeks: 52, cost: 110, prerequisites: ['cartography'], unlocksEra: ['ottoman'] },
  { id: 'caravel', name: 'Caravel', category: 'science', description: 'Lateen-rigged ships capable of sailing against the wind.', researchWeeks: 78, cost: 160, prerequisites: ['naval_warfare', 'astronomy'], unlocksEra: ['ottoman'] },
  { id: 'ocean_navigation', name: 'Ocean Navigation', category: 'science', description: 'Deep-water sailing enabling voyages across open oceans.', researchWeeks: 78, cost: 180, prerequisites: ['compass_navigation', 'caravel'], unlocksEra: ['ottoman'] },
  { id: 'deep_sea_exploration', name: 'Deep Sea Exploration', category: 'science', description: 'Systematic exploration of distant continents — enables colonial expansion.', researchWeeks: 104, cost: 240, prerequisites: ['ocean_navigation'], unlocksEra: ['ottoman'] },

  // ══════════════════════════════════════════════════════════════════════════
  // GOVERNMENT
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'law_codification', name: 'Law Codification', category: 'government', description: 'Written legal codes (Hammurabi, Roman Law, Sharia) establishing order and rights.', researchWeeks: 52, cost: 70, prerequisites: ['philosophy'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'census_taxation', name: 'Census & Taxation', category: 'government', description: 'Systematic population census and standardised tax collection for state revenue.', researchWeeks: 26, cost: 40, prerequisites: ['coinage'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'diplomatic_corps', name: 'Diplomatic Corps', category: 'government', description: 'Permanent embassies, envoys, and formalised diplomatic protocols with other powers.', researchWeeks: 26, cost: 50, prerequisites: ['coinage'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'civic_administration', name: 'Civic Administration', category: 'government', description: 'Provincial governors, urban magistrates, and local councils managing the empire.', researchWeeks: 52, cost: 80, prerequisites: ['law_codification', 'road_network'], unlocksEra: ['roman', 'ottoman'] },

  // ══════════════════════════════════════════════════════════════════════════
  // SOCIETY
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'state_religion', name: 'State Religion', category: 'society', description: 'Formalised state religion providing social cohesion, legitimacy, and moral authority.', researchWeeks: 26, cost: 40, prerequisites: ['philosophy'], unlocksEra: ['greek', 'roman', 'ottoman'] },
  { id: 'public_granaries', name: 'Public Granaries', category: 'society', description: 'State grain storage to buffer famines, feed armies, and stabilise food prices.', researchWeeks: 26, cost: 40, prerequisites: ['irrigation'], unlocksEra: ['greek', 'roman', 'ottoman'] },
]

// ── Combined tree ─────────────────────────────────────────────────────────────

const ALL_TECHS_INTERNAL: TechNode[] = [...TECH_TREE, ...ANCIENT_TECH_TREE]

export function getAvailableTechs(era: Era, unlockedTechs: string[]): TechNode[] {
  return ALL_TECHS_INTERNAL.filter(t =>
    t.unlocksEra.includes(era) &&
    !unlockedTechs.includes(t.id) &&
    t.prerequisites.every(p => unlockedTechs.includes(p))
  )
}

/** Returns only the techs for the era's group (ancient or modern). */
export function getEraGroupTechs(era: Era): TechNode[] {
  return getEraGroup(era) === 'ancient' ? ANCIENT_TECH_TREE : TECH_TREE
}
