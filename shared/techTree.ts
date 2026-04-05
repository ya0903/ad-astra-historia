import type { TechNode, Era, TechId, EraPhase } from './types.js'

// ── Era grouping ─────────────────────────────────────────────────────────────
// Ancient eras use ANCIENT_TECH_TREE; modern eras use TECH_TREE.
// Industrial era (via eraPhase) uses INDUSTRIAL_TECH_TREE.
export const MODERN_ERAS: Era[] = ['1945', '1960s', '1990s', '2010s', 'modern']
export const ANCIENT_ERAS: Era[] = ['greek', 'roman', 'ottoman', 'abbasid', 'tang', 'aztec', 'songhai', 'sengoku']

export function getEraGroup(era: Era, eraPhase?: EraPhase): 'ancient' | 'industrial' | 'modern' {
  if (eraPhase === 'industrial') return 'industrial'
  if (eraPhase === 'ancient' || ANCIENT_ERAS.includes(era)) return 'ancient'
  return 'modern'
}

/**
 * Check whether the player's tech unlocks should trigger an era phase transition.
 * Returns the new phase if a transition is warranted, null otherwise.
 */
export function checkEraPhaseTransition(
  currentPhase: EraPhase,
  unlockedTechs: string[],
): EraPhase | null {
  if (currentPhase === 'ancient') {
    // Entering Industrial Era requires mastery of firearms + early machinery
    const triggers: TechId[] = ['gunpowder', 'cannon', 'printing_press']
    if (triggers.every(t => unlockedTechs.includes(t))) return 'industrial'
  }
  if (currentPhase === 'industrial') {
    // Entering Modern Era requires electrification + oil + railroads
    const triggers: TechId[] = ['electricity', 'oil_drilling', 'railroad_network']
    if (triggers.every(t => unlockedTechs.includes(t))) return 'modern'
  }
  return null
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

  // ══════════════════════════════════════════════════════════════════════════
  // MILITARY — ADVANCED BRANCHES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'nuclear_weapons',
    name: 'Nuclear Weapons Programme',
    category: 'military',
    description: 'Fission and thermonuclear weapons capability — strategic deterrence and MAD.',
    researchWeeks: 780,
    cost: 2000,
    prerequisites: ['nuclear_fission', 'advanced_manufacturing'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'icbm',
    name: 'ICBM Programme',
    category: 'military',
    description: 'Intercontinental Ballistic Missiles capable of delivering warheads to any point on Earth.',
    researchWeeks: 416,
    cost: 1200,
    prerequisites: ['nuclear_weapons', 'space_launch'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'nuclear_submarine',
    name: 'Nuclear Submarine Fleet',
    category: 'military',
    description: 'Ballistic missile submarines providing invulnerable second-strike nuclear capability.',
    researchWeeks: 520,
    cost: 1500,
    prerequisites: ['nuclear_fission', 'aircraft_carrier'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'electronic_warfare',
    name: 'Electronic Warfare',
    category: 'military',
    description: 'Jamming, spoofing, and spectrum dominance systems disrupting enemy communications and radars.',
    researchWeeks: 260,
    cost: 600,
    prerequisites: ['cyber_warfare', 'satellite_network'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'cluster_munitions',
    name: 'Cluster Munitions',
    category: 'military',
    description: 'Area-denial submunition weapons for large-scale battlefield suppression.',
    researchWeeks: 156,
    cost: 300,
    prerequisites: ['advanced_manufacturing'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'precision_guided_munitions',
    name: 'Precision-Guided Munitions',
    category: 'military',
    description: 'GPS and laser-guided bombs and missiles with near-zero circular error probability.',
    researchWeeks: 208,
    cost: 500,
    prerequisites: ['satellite_network', 'computing'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'drone_swarms',
    name: 'Autonomous Drone Swarms',
    category: 'military',
    description: 'AI-coordinated swarms of small drones overwhelming point defences at low cost.',
    researchWeeks: 312,
    cost: 700,
    prerequisites: ['drone_warfare', 'ai_research'],
    unlocksEra: ['modern'],
  },
  {
    id: 'space_weapons',
    name: 'Space-Based Weapons',
    category: 'military',
    description: 'Kinetic kill vehicles, directed energy, and anti-satellite (ASAT) systems.',
    researchWeeks: 520,
    cost: 1800,
    prerequisites: ['satellite_network', 'hypersonics'],
    unlocksEra: ['modern'],
  },
  {
    id: 'bio_weapons',
    name: 'Biological Weapons Research',
    category: 'military',
    description: 'Classified research into pathogen weaponisation and delivery systems.',
    researchWeeks: 416,
    cost: 900,
    prerequisites: ['genetic_engineering', 'biotech'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'active_protection_systems',
    name: 'Active Protection Systems',
    category: 'military',
    description: 'Trophy and Arena-type hard-kill systems destroying incoming projectiles mid-flight.',
    researchWeeks: 260,
    cost: 600,
    prerequisites: ['missile_defence', 'computing'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'exoskeleton_infantry',
    name: 'Powered Exoskeleton Infantry',
    category: 'military',
    description: 'Motorised load-bearing exoskeletons enhancing soldier endurance and carrying capacity.',
    researchWeeks: 312,
    cost: 800,
    prerequisites: ['advanced_manufacturing', 'ai_research'],
    unlocksEra: ['modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ECONOMY — ADVANCED BRANCHES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'derivatives_markets',
    name: 'Derivatives & Futures Markets',
    category: 'economy',
    description: 'Options, futures, and structured products enabling risk hedging and speculative capital.',
    researchWeeks: 104,
    cost: 200,
    prerequisites: ['stock_exchange', 'computing'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'digital_banking',
    name: 'Digital Banking & Fintech',
    category: 'economy',
    description: 'Mobile payments, digital wallets, neo-banks, and open banking APIs.',
    researchWeeks: 130,
    cost: 250,
    prerequisites: ['internet_backbone', 'central_banking'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'cryptocurrency',
    name: 'Central Bank Digital Currency',
    category: 'economy',
    description: 'State-issued CBDC reducing transaction costs and enabling programmable monetary policy.',
    researchWeeks: 156,
    cost: 300,
    prerequisites: ['digital_banking', 'quantum_computing'],
    unlocksEra: ['modern'],
  },
  {
    id: 'trade_bloc',
    name: 'Regional Trade Bloc',
    category: 'economy',
    description: 'Customs union or free-trade area with neighbouring states — preferential market access.',
    researchWeeks: 78,
    cost: 100,
    prerequisites: ['free_trade_zone'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'resource_extraction',
    name: 'Strategic Resource Extraction',
    category: 'economy',
    description: 'National oil, gas, and rare earth programmes with state extraction companies.',
    researchWeeks: 104,
    cost: 180,
    prerequisites: ['basic_industry'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'offshore_finance',
    name: 'Offshore Finance Hub',
    category: 'economy',
    description: 'Low-tax financial centre attracting international capital, trusts, and holding companies.',
    researchWeeks: 78,
    cost: 150,
    prerequisites: ['stock_exchange', 'free_trade_zone'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'smart_manufacturing',
    name: 'Smart Manufacturing (Industry 4.0)',
    category: 'economy',
    description: 'IoT sensors, robotic assembly, and digital twins optimising industrial output.',
    researchWeeks: 260,
    cost: 700,
    prerequisites: ['advanced_manufacturing', 'ai_research', '5g_network'],
    unlocksEra: ['modern'],
  },
  {
    id: 'space_economy',
    name: 'Space Economy',
    category: 'economy',
    description: 'Commercial launch services, satellite manufacturing, and asteroid resource extraction.',
    researchWeeks: 312,
    cost: 1000,
    prerequisites: ['mars_mission', 'sovereign_wealth'],
    unlocksEra: ['modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GOVERNMENT — ADVANCED BRANCHES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'mass_surveillance',
    name: 'Mass Surveillance Infrastructure',
    category: 'government',
    description: 'CCTV networks, facial recognition, metadata collection, and social credit systems.',
    researchWeeks: 260,
    cost: 600,
    prerequisites: ['digital_governance', 'ai_research'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'propaganda_apparatus',
    name: 'State Propaganda Apparatus',
    category: 'government',
    description: 'Centralised information control, narrative management, and information operations.',
    researchWeeks: 104,
    cost: 150,
    prerequisites: ['public_broadcasting', 'mass_media'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'federalisation',
    name: 'Federal Governance System',
    category: 'government',
    description: 'Devolution of powers to states or regions — improves administrative efficiency.',
    researchWeeks: 104,
    cost: 180,
    prerequisites: ['civil_service', 'census_bureau'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'electoral_system',
    name: 'Electoral System Reform',
    category: 'government',
    description: 'Proportional representation, independent electoral commission, and voter registration.',
    researchWeeks: 78,
    cost: 100,
    prerequisites: ['civil_service'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'judicial_independence',
    name: 'Judicial Independence',
    category: 'government',
    description: 'Constitutional court and independent judiciary insulating law from political interference.',
    researchWeeks: 78,
    cost: 100,
    prerequisites: ['anti_corruption'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'cybersecurity_agency',
    name: 'National Cybersecurity Agency',
    category: 'government',
    description: 'Centralised cyber defence, critical infrastructure protection, and incident response.',
    researchWeeks: 156,
    cost: 300,
    prerequisites: ['cyber_warfare', 'digital_governance'],
    unlocksEra: ['2010s', 'modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SOCIETY — ADVANCED BRANCHES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'social_media_ecosystem',
    name: 'Social Media Ecosystem',
    category: 'society',
    description: 'Domestic social media platforms, influencer culture, and digital public sphere.',
    researchWeeks: 130,
    cost: 200,
    prerequisites: ['internet_backbone', 'mass_media'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'higher_education',
    name: 'Higher Education System',
    category: 'society',
    description: 'Universities, polytechnics, and research institutes producing skilled graduates.',
    researchWeeks: 130,
    cost: 200,
    prerequisites: ['public_education'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'cultural_diplomacy',
    name: 'Cultural Diplomacy',
    category: 'society',
    description: 'Language institutes, cultural centres, and scholarships projecting soft power abroad.',
    researchWeeks: 78,
    cost: 120,
    prerequisites: ['mass_media', 'higher_education'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'universal_broadband',
    name: 'Universal Digital Access',
    category: 'society',
    description: 'Broadband for rural areas, digital literacy programmes, and device subsidies.',
    researchWeeks: 156,
    cost: 250,
    prerequisites: ['internet_backbone', 'public_education'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'mental_health_system',
    name: 'National Mental Health System',
    category: 'society',
    description: 'Psychiatric services, counselling networks, and anti-stigma campaigns.',
    researchWeeks: 104,
    cost: 150,
    prerequisites: ['universal_healthcare'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'smart_cities',
    name: 'Smart City Planning',
    category: 'society',
    description: 'Zoning laws, green spaces, mixed-use districts, and data-driven smart city master plans.',
    researchWeeks: 104,
    cost: 180,
    prerequisites: ['water_sanitation', 'highway_network', '5g_network'],
    unlocksEra: ['2010s', 'modern'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCIENCE — ADVANCED BRANCHES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'advanced_robotics',
    name: 'Advanced Robotics',
    category: 'science',
    description: 'Industrial robots, collaborative cobots, and autonomous logistics systems.',
    researchWeeks: 260,
    cost: 600,
    prerequisites: ['ai_research', 'advanced_manufacturing'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'materials_science',
    name: 'Advanced Materials Science',
    category: 'science',
    description: 'Graphene, metamaterials, aerogels, and high-temperature superconductors.',
    researchWeeks: 312,
    cost: 700,
    prerequisites: ['nanotechnology'],
    unlocksEra: ['modern'],
  },
  {
    id: 'climate_engineering',
    name: 'Climate Engineering',
    category: 'science',
    description: 'Carbon capture, solar radiation management, and geoengineering research programmes.',
    researchWeeks: 416,
    cost: 1000,
    prerequisites: ['renewable_energy', 'biotech', 'computing'],
    unlocksEra: ['modern'],
  },
  {
    id: 'autonomous_vehicles',
    name: 'Autonomous Vehicle Systems',
    category: 'science',
    description: 'Self-driving cars, autonomous trucks, and drone delivery networks.',
    researchWeeks: 208,
    cost: 500,
    prerequisites: ['ai_research', '5g_network'],
    unlocksEra: ['modern'],
  },
  {
    id: 'smart_grid',
    name: 'Smart Grid Technology',
    category: 'infrastructure',
    description: 'Two-way power grids with real-time demand response and distributed energy management.',
    researchWeeks: 156,
    cost: 350,
    prerequisites: ['renewable_energy', '5g_network'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'hydrogen_economy',
    name: 'Green Hydrogen Economy',
    category: 'infrastructure',
    description: 'Electrolysis-based hydrogen production as clean fuel for industry and transport.',
    researchWeeks: 260,
    cost: 600,
    prerequisites: ['renewable_energy', 'advanced_manufacturing'],
    unlocksEra: ['modern'],
  },
  {
    id: 'battery_storage',
    name: 'Grid-Scale Battery Storage',
    category: 'infrastructure',
    description: 'Large-scale lithium and solid-state battery arrays enabling 24/7 renewable power.',
    researchWeeks: 208,
    cost: 450,
    prerequisites: ['renewable_energy', 'semiconductors'],
    unlocksEra: ['2010s', 'modern'],
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

// ── Industrial Era Tech Tree (1760–1914) ─────────────────────────────────────
// Unlocked when eraPhase === 'industrial'. TechNode.unlocksEra uses '1945' as
// a sentinel value — actual availability is gated by eraPhase in the UI.

export const INDUSTRIAL_TECH_TREE: TechNode[] = [

  // ── INFRASTRUCTURE ──────────────────────────────────────────────────────────
  {
    id: 'steam_engine',
    name: 'Steam Engine',
    category: 'infrastructure',
    description: 'High-pressure steam power for factories, mines, and early transport.',
    researchWeeks: 52, cost: 80, prerequisites: [],
    unlocksEra: ['1945'],
  },
  {
    id: 'coal_mining',
    name: 'Coal Mining',
    category: 'infrastructure',
    description: 'Deep shaft coal extraction — the fuel that powers the industrial age.',
    researchWeeks: 26, cost: 40, prerequisites: ['steam_engine'],
    unlocksEra: ['1945'],
  },
  {
    id: 'steel_production',
    name: 'Steel Production',
    category: 'infrastructure',
    description: 'Bessemer converter and open-hearth furnace for mass-scale steel output.',
    researchWeeks: 78, cost: 120, prerequisites: ['coal_mining'],
    unlocksEra: ['1945'],
  },
  {
    id: 'factory_system',
    name: 'Factory System',
    category: 'infrastructure',
    description: 'Division of labour and mechanised production — cottage industry replaced.',
    researchWeeks: 52, cost: 100, prerequisites: ['steam_engine'],
    unlocksEra: ['1945'],
  },
  {
    id: 'locomotive',
    name: 'Locomotive',
    category: 'infrastructure',
    description: 'Steam locomotive enabling rapid overland goods and troop movement.',
    researchWeeks: 78, cost: 150, prerequisites: ['steam_engine', 'steel_production'],
    unlocksEra: ['1945'],
  },
  {
    id: 'railroad_network',
    name: 'Railroad Network',
    category: 'infrastructure',
    description: 'National rail grid integrating markets and enabling mass mobilisation.',
    researchWeeks: 156, cost: 300, prerequisites: ['locomotive'],
    unlocksEra: ['1945'],
  },
  {
    id: 'oil_drilling',
    name: 'Oil Drilling',
    category: 'infrastructure',
    description: 'Rotary drilling and refining of petroleum for kerosene, fuel, and lubricants.',
    researchWeeks: 78, cost: 160, prerequisites: ['steel_production'],
    unlocksEra: ['1945'],
  },
  {
    id: 'electricity',
    name: 'Electrical Grid',
    category: 'infrastructure',
    description: 'AC power generation and distribution — Tesla turbines, urban lighting.',
    researchWeeks: 104, cost: 200, prerequisites: ['steam_engine', 'telegraph'],
    unlocksEra: ['1945'],
  },
  {
    id: 'urban_planning',
    name: 'Urban Planning',
    category: 'infrastructure',
    description: 'Sewerage, boulevard design, and municipal water supply for booming cities.',
    researchWeeks: 52, cost: 80, prerequisites: ['factory_system'],
    unlocksEra: ['1945'],
  },
  {
    id: 'mechanised_agriculture',
    name: 'Mechanised Agriculture',
    category: 'infrastructure',
    description: 'Steam ploughs, reapers, and chemical fertilisers — food per acre doubled.',
    researchWeeks: 78, cost: 120, prerequisites: ['steam_engine', 'industrial_chemistry'],
    unlocksEra: ['1945'],
  },

  // ── MILITARY ────────────────────────────────────────────────────────────────
  {
    id: 'rifle_infantry',
    name: 'Rifle Infantry',
    category: 'military',
    description: 'Minié-ball and breech-loading rifles replace muskets — range and rate of fire doubled.',
    researchWeeks: 52, cost: 80, prerequisites: [],
    unlocksEra: ['1945'],
  },
  {
    id: 'bolt_action_rifle',
    name: 'Bolt-Action Rifle',
    category: 'military',
    description: 'Smokeless powder and magazine-fed infantry rifles — standard issue by 1890s.',
    researchWeeks: 52, cost: 100, prerequisites: ['rifle_infantry'],
    unlocksEra: ['1945'],
  },
  {
    id: 'field_artillery',
    name: 'Field Artillery',
    category: 'military',
    description: 'Rifled steel cannon and horse-drawn batteries for mobile firepower.',
    researchWeeks: 78, cost: 140, prerequisites: ['steel_production'],
    unlocksEra: ['1945'],
  },
  {
    id: 'machine_gun',
    name: 'Machine Gun',
    category: 'military',
    description: 'Maxim and Gatling guns providing suppressive fire at industrial rates.',
    researchWeeks: 78, cost: 160, prerequisites: ['rifle_infantry', 'steel_production'],
    unlocksEra: ['1945'],
  },
  {
    id: 'ironclad_warship',
    name: 'Ironclad Warship',
    category: 'military',
    description: 'Steam-powered iron-hulled warships making wooden fleets obsolete.',
    researchWeeks: 104, cost: 200, prerequisites: ['steel_production', 'steam_engine'],
    unlocksEra: ['1945'],
  },
  {
    id: 'early_tank',
    name: 'Armoured Fighting Vehicle',
    category: 'military',
    description: 'Steel-plated caterpillar vehicles combining firepower with cross-terrain mobility.',
    researchWeeks: 104, cost: 220, prerequisites: ['machine_gun', 'oil_drilling'],
    unlocksEra: ['1945'],
  },
  {
    id: 'mass_conscription',
    name: 'Mass Conscription',
    category: 'military',
    description: 'Universal military service creating million-man reserve armies.',
    researchWeeks: 52, cost: 100, prerequisites: ['nationalism', 'railroad_network'],
    unlocksEra: ['1945'],
  },

  // ── SCIENCE ─────────────────────────────────────────────────────────────────
  {
    id: 'telegraph',
    name: 'Telegraph',
    category: 'science',
    description: 'Electrical long-distance communication — real-time command and commercial data.',
    researchWeeks: 52, cost: 90, prerequisites: [],
    unlocksEra: ['1945'],
  },
  {
    id: 'industrial_chemistry',
    name: 'Industrial Chemistry',
    category: 'science',
    description: 'Synthetic dyes, explosives, fertilisers — chemistry applied at scale.',
    researchWeeks: 78, cost: 130, prerequisites: ['steam_engine'],
    unlocksEra: ['1945'],
  },
  {
    id: 'newspaper_press',
    name: 'Mass Press',
    category: 'science',
    description: 'Steam-powered rotary presses — mass circulation newspapers shape opinion.',
    researchWeeks: 26, cost: 50, prerequisites: ['telegraph'],
    unlocksEra: ['1945'],
  },
  {
    id: 'photography',
    name: 'Photography',
    category: 'science',
    description: 'Daguerreotype and wet-plate photography — documentation and propaganda.',
    researchWeeks: 26, cost: 40, prerequisites: [],
    unlocksEra: ['1945'],
  },
  {
    id: 'public_health',
    name: 'Public Health',
    category: 'science',
    description: 'Germ theory, vaccination campaigns, and quarantine laws — pandemics decline.',
    researchWeeks: 78, cost: 120, prerequisites: ['urban_planning'],
    unlocksEra: ['1945'],
  },

  // ── ECONOMY ─────────────────────────────────────────────────────────────────
  {
    id: 'banking_system',
    name: 'Banking System',
    category: 'economy',
    description: 'Commercial banks, letters of credit, and fractional-reserve lending.',
    researchWeeks: 52, cost: 100, prerequisites: [],
    unlocksEra: ['1945'],
  },
  {
    id: 'joint_stock_company',
    name: 'Joint Stock Company',
    category: 'economy',
    description: 'Limited liability corporations enabling massive capital pooling for railways.',
    researchWeeks: 52, cost: 100, prerequisites: ['banking_system'],
    unlocksEra: ['1945'],
  },
  {
    id: 'central_bank',
    name: 'Central Bank',
    category: 'economy',
    description: 'Lender of last resort with monopoly on note issue — stabilises finance.',
    researchWeeks: 78, cost: 140, prerequisites: ['banking_system', 'constitution'],
    unlocksEra: ['1945'],
  },
  {
    id: 'free_market',
    name: 'Free Market Reforms',
    category: 'economy',
    description: 'Tariff reduction and free trade doctrine — commerce accelerates.',
    researchWeeks: 52, cost: 90, prerequisites: ['banking_system'],
    unlocksEra: ['1945'],
  },
  {
    id: 'trade_unions',
    name: 'Trade Unions',
    category: 'economy',
    description: 'Legalised labour organisations negotiating wages, hours, and safety conditions.',
    researchWeeks: 52, cost: 80, prerequisites: ['factory_system', 'newspaper_press'],
    unlocksEra: ['1945'],
  },

  // ── GOVERNMENT / SOCIETY ────────────────────────────────────────────────────
  {
    id: 'nationalism',
    name: 'Nationalism',
    category: 'government',
    description: 'Popular national identity as basis for state legitimacy and mass mobilisation.',
    researchWeeks: 52, cost: 70, prerequisites: ['newspaper_press'],
    unlocksEra: ['1945'],
  },
  {
    id: 'constitution',
    name: 'Constitutional Government',
    category: 'government',
    description: 'Written constitution, parliament, and rule of law limiting executive power.',
    researchWeeks: 78, cost: 120, prerequisites: ['nationalism'],
    unlocksEra: ['1945'],
  },
  {
    id: 'colonial_administration',
    name: 'Colonial Administration',
    category: 'government',
    description: 'Bureaucratic systems for governing overseas territories and extracting resources.',
    researchWeeks: 78, cost: 140, prerequisites: ['railroad_network', 'mass_conscription'],
    unlocksEra: ['1945'],
  },
]

// ── Combined tree ─────────────────────────────────────────────────────────────

const ALL_TECHS_INTERNAL: TechNode[] = [...TECH_TREE, ...ANCIENT_TECH_TREE, ...INDUSTRIAL_TECH_TREE]

export function getAvailableTechs(era: Era, unlockedTechs: string[], eraPhase?: EraPhase): TechNode[] {
  const tree = getEraGroupTechs(era, eraPhase)
  return tree.filter(t =>
    !unlockedTechs.includes(t.id) &&
    t.prerequisites.every(p => unlockedTechs.includes(p))
  )
}

/** Returns only the techs for the era's current phase (ancient, industrial, or modern). */
export function getEraGroupTechs(era: Era, eraPhase?: EraPhase): TechNode[] {
  const group = getEraGroup(era, eraPhase)
  if (group === 'industrial') return INDUSTRIAL_TECH_TREE
  if (group === 'ancient') return ANCIENT_TECH_TREE
  return TECH_TREE
}
