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

export function getAvailableTechs(era: Era, unlockedTechs: string[]): TechNode[] {
  return TECH_TREE.filter(t =>
    t.unlocksEra.includes(era) &&
    !unlockedTechs.includes(t.id) &&
    t.prerequisites.every(p => unlockedTechs.includes(p))
  )
}
