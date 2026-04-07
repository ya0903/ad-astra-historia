# Vertical Tech Tree + RP System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal tech tree with a vertical 6-column layout (one per category), add an RP economy for unlocking techs, expand the modern tree to ~150 nodes, add train border routing, and an `rp` cheat command.

**Architecture:** The existing `TechTreeFullscreen.tsx` is replaced entirely with a new vertical layout component. The tech tree data in `shared/techTree.ts` gets ~27 new nodes. RP generation is added to the weekly tick in `gameStore.ts`. The `startResearch` action is modified to deduct RP. Train border logic is added to the rail-building action in `gameStore.ts`.

**Tech Stack:** React 18, Zustand, TypeScript, Tailwind CSS, SVG for prerequisite lines.

**Spec:** `docs/superpowers/specs/2026-04-07-tech-tree-redesign.md`

---

## Task 1: Add ~27 new tech nodes to the modern tree

**Files:**
- Modify: `shared/techTree.ts`

The implementing agent MUST first read all existing tech IDs in `shared/techTree.ts` and verify none of the new IDs clash. The following IDs have been verified as NOT existing in the current tree:

- [ ] **Step 1: Add new military nodes**

In `shared/techTree.ts`, add inside the `TECH_TREE` array, in the MILITARY section:

```typescript
  // New military nodes
  {
    id: 'aircraft_carriers', name: 'Carrier Strike Group', category: 'military',
    description: 'Project naval power globally with carrier-based aviation and escort fleets.',
    researchWeeks: 260, cost: 400, prerequisites: ['nuclear_submarine'],
    unlocksEra: ['1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'special_forces', name: 'Special Operations Command', category: 'military',
    description: 'Elite special forces for covert ops, counter-terrorism, and unconventional warfare.',
    researchWeeks: 130, cost: 200, prerequisites: ['stealth_tech'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'chemical_weapons', name: 'Chemical & Biological Programme', category: 'military',
    description: 'Develop chemical and biological weapons capability. Internationally condemned but devastating.',
    researchWeeks: 104, cost: 250, prerequisites: ['biotech'],
    unlocksEra: ['1945', '1960s', '1990s', '2010s', 'modern'],
  },
  {
    id: 'autonomous_weapons', name: 'Autonomous Weapons Systems', category: 'military',
    description: 'AI-powered autonomous combat platforms — lethal robots that select and engage targets independently.',
    researchWeeks: 208, cost: 500, prerequisites: ['drone_warfare', 'ai_research'],
    unlocksEra: ['2010s', 'modern'],
  },
```

- [ ] **Step 2: Add new science nodes**

```typescript
  // New science nodes
  {
    id: 'gene_editing', name: 'CRISPR Gene Editing', category: 'science',
    description: 'Precise genome editing technology for medicine, agriculture, and biological research.',
    researchWeeks: 156, cost: 300, prerequisites: ['biotech'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'neural_interfaces', name: 'Neural Interface Technology', category: 'science',
    description: 'Direct brain-computer connection for medical restoration and human-machine integration.',
    researchWeeks: 260, cost: 500, prerequisites: ['ai_research', 'biotech'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'asteroid_mining', name: 'Asteroid Mining Programme', category: 'science',
    description: 'Extract rare minerals and water from near-Earth asteroids for industrial use.',
    researchWeeks: 312, cost: 600, prerequisites: ['space_launch'],
    unlocksEra: ['modern'],
  },
  {
    id: 'fusion_power', name: 'Nuclear Fusion Reactor', category: 'science',
    description: 'Sustained fusion reaction providing virtually limitless clean energy.',
    researchWeeks: 520, cost: 800, prerequisites: ['nuclear_fission', 'renewable_energy'],
    unlocksEra: ['modern'],
  },
  {
    id: 'quantum_internet', name: 'Quantum Communication Network', category: 'science',
    description: 'Unhackable quantum-encrypted communication infrastructure.',
    researchWeeks: 260, cost: 450, prerequisites: ['quantum_computing'],
    unlocksEra: ['modern'],
  },
  {
    id: 'synthetic_biology', name: 'Synthetic Biology', category: 'science',
    description: 'Design and build new biological systems — synthetic organisms, bio-manufacturing.',
    researchWeeks: 208, cost: 400, prerequisites: ['gene_editing'],
    unlocksEra: ['modern'],
  },
  {
    id: 'brain_computer', name: 'Brain-Computer Interface', category: 'science',
    description: 'Full-bandwidth brain-computer link enabling thought-controlled systems and memory augmentation.',
    researchWeeks: 416, cost: 700, prerequisites: ['neural_interfaces', 'quantum_computing'],
    unlocksEra: ['modern'],
  },
```

- [ ] **Step 3: Add new economy nodes**

```typescript
  // New economy nodes
  {
    id: 'global_supply_chains', name: 'Global Supply Chain Network', category: 'economy',
    description: 'Integrated international logistics — just-in-time manufacturing across continents.',
    researchWeeks: 130, cost: 200, prerequisites: ['stock_exchange'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'free_trade_zones', name: 'Free Trade Zones', category: 'economy',
    description: 'Special economic zones with reduced tariffs and regulations to attract foreign investment.',
    researchWeeks: 104, cost: 180, prerequisites: ['stock_exchange'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'green_economy', name: 'Green Economic Transition', category: 'economy',
    description: 'Restructure the economy around sustainable industries, carbon markets, and green finance.',
    researchWeeks: 208, cost: 350, prerequisites: ['renewable_energy'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'space_commerce', name: 'Space Commerce & Tourism', category: 'economy',
    description: 'Commercial space stations, orbital tourism, and zero-gravity manufacturing.',
    researchWeeks: 312, cost: 500, prerequisites: ['space_launch', 'sovereign_wealth'],
    unlocksEra: ['modern'],
  },
```

- [ ] **Step 4: Add new government nodes**

```typescript
  // New government nodes
  {
    id: 'propaganda_network', name: 'State Propaganda Machine', category: 'government',
    description: 'Centralised state media apparatus for shaping public opinion and controlling narrative.',
    researchWeeks: 78, cost: 150, prerequisites: ['digital_governance'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'digital_id', name: 'National Digital ID System', category: 'government',
    description: 'Biometric digital identity for all citizens — enables e-governance and financial inclusion.',
    researchWeeks: 104, cost: 180, prerequisites: ['digital_governance'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'federal_devolution', name: 'Federal Devolution', category: 'government',
    description: 'Devolve power to regional governments — reduces central control but increases local responsiveness.',
    researchWeeks: 130, cost: 200, prerequisites: ['civil_service'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'international_courts', name: 'International Legal Framework', category: 'government',
    description: 'Submit to international courts and treaties — boosts diplomatic standing at cost of sovereignty.',
    researchWeeks: 156, cost: 250, prerequisites: ['anti_corruption'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'cyber_defence_agency', name: 'National Cyber Defence Agency', category: 'government',
    description: 'Dedicated agency protecting critical infrastructure from cyber attacks and digital espionage.',
    researchWeeks: 156, cost: 300, prerequisites: ['cyber_warfare', 'digital_governance'],
    unlocksEra: ['2010s', 'modern'],
  },
```

- [ ] **Step 5: Add new society nodes**

```typescript
  // New society nodes
  {
    id: 'universal_basic_income', name: 'Universal Basic Income', category: 'society',
    description: 'Guaranteed income for all citizens — reduces poverty but strains the budget.',
    researchWeeks: 208, cost: 400, prerequisites: ['universal_healthcare', 'central_banking'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'cultural_exports', name: 'Cultural Export Programme', category: 'society',
    description: 'State-backed cultural soft power — music, film, cuisine, fashion projected globally.',
    researchWeeks: 78, cost: 150, prerequisites: ['public_education'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
  {
    id: 'immigration_policy', name: 'Immigration & Integration Policy', category: 'society',
    description: 'Structured immigration system balancing economic needs with social cohesion.',
    researchWeeks: 78, cost: 120, prerequisites: ['civil_service'],
    unlocksEra: ['1990s', '2010s', 'modern'],
  },
```

- [ ] **Step 6: Add new infrastructure nodes**

```typescript
  // New infrastructure nodes
  {
    id: 'desalination', name: 'Industrial Desalination Plants', category: 'infrastructure',
    description: 'Large-scale seawater desalination for water security in arid regions.',
    researchWeeks: 130, cost: 200, prerequisites: ['national_grid'],
    unlocksEra: ['2010s', 'modern'],
  },
  {
    id: 'space_elevator', name: 'Space Elevator', category: 'infrastructure',
    description: 'Orbital tether for cheap cargo transport to space — transforms the economics of spaceflight.',
    researchWeeks: 520, cost: 800, prerequisites: ['advanced_manufacturing', 'space_launch'],
    unlocksEra: ['modern'],
  },
  {
    id: 'hyperloop', name: 'Hyperloop Network', category: 'infrastructure',
    description: 'Vacuum-tube transport at near-supersonic speed between major cities.',
    researchWeeks: 312, cost: 500, prerequisites: ['high_speed_rail_tech', 'advanced_manufacturing'],
    unlocksEra: ['modern'],
  },
  {
    id: 'vertical_farming', name: 'Vertical Farming Systems', category: 'infrastructure',
    description: 'Indoor multi-storey farms using hydroponics and LED lighting — food security in urban areas.',
    researchWeeks: 156, cost: 250, prerequisites: ['renewable_energy', 'biotech'],
    unlocksEra: ['2010s', 'modern'],
  },
```

- [ ] **Step 7: Verify no duplicate IDs**

```bash
cd G:/Claude/ad-astra-historia && grep "id: '" shared/techTree.ts | sed "s/.*id: '//;s/'.*//" | sort | uniq -d
```

Expected: no output (no duplicates).

- [ ] **Step 8: Run tests**

```bash
cd G:/Claude/ad-astra-historia && npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 9: Commit**

```bash
git add shared/techTree.ts
git commit -m "feat: add 27 new modern tech nodes (military, science, economy, government, society, infrastructure)"
```

---

## Task 2: Add RP generation to the weekly tick

**Files:**
- Modify: `client/src/stores/gameStore.ts`

- [ ] **Step 1: Add RP generation to advanceDate**

In `client/src/stores/gameStore.ts`, find the `advanceDate` function. After the build queue tick and before the world tick, add RP generation that runs every week:

```typescript
// ── RP generation (every week) ────────────────────────────────────────
const playerCountry = newCountries[s.playerCountryId]
if (playerCountry) {
  const unlockedCount = (s.unlockedTechs ?? []).length
  const universityCount = (s.infrastructureMap ?? []).filter(i => i.type === 'university').length
  const educationIndex = s.society?.educationIndex ?? 55
  const stability = playerCountry.stats.stability ?? 70

  const base = 5
  const uniBonus = universityCount * 3
  const techBonus = unlockedCount * 0.5
  const educationMultiplier = 0.5 + (educationIndex / 100)
  const stabilityMultiplier = stability < 40 ? 0.5 : 1.0

  const weeklyRP = Math.floor((base + uniBonus + techBonus) * educationMultiplier * stabilityMultiplier)
  const totalRP = weeklyRP * weeksElapsed

  const playerStats = { ...playerCountry.stats }
  playerStats.researchPoints = (playerStats.researchPoints ?? 0) + totalRP
  newCountries[s.playerCountryId] = { ...playerCountry, stats: playerStats }
}
```

- [ ] **Step 2: Modify startResearch to deduct RP**

Find the `startResearch` action in the store. Before starting research, check if the player has enough RP and deduct it:

```typescript
startResearch: (techId, weeks) => set(store => {
  if (!store.state) return {}
  const s = store.state
  const playerCountry = s.countries[s.playerCountryId]
  if (!playerCountry) return {}

  // Find tech cost from the tree
  const allTrees = [...TECH_TREE, ...ANCIENT_TECH_TREE, ...INDUSTRIAL_TECH_TREE]
  const tech = allTrees.find(t => t.id === techId)
  const cost = tech?.cost ?? 0

  // Check RP balance
  const currentRP = playerCountry.stats.researchPoints ?? 0
  if (currentRP < cost) return {} // not enough RP

  // Deduct RP
  const newStats = { ...playerCountry.stats, researchPoints: currentRP - cost }
  const newCountries = { ...s.countries, [s.playerCountryId]: { ...playerCountry, stats: newStats } }

  return {
    state: {
      ...s,
      countries: newCountries,
      researchQueue: [...(s.researchQueue ?? []), {
        techId: techId as any,
        name: tech?.name ?? techId,
        weeksRemaining: weeks,
        totalWeeks: weeks,
      }],
    },
  }
}),
```

**Important:** Read the existing `startResearch` implementation first. It may already handle the research queue. The key change is adding the RP cost check and deduction. Preserve all existing logic — just add the RP gate.

- [ ] **Step 3: Verify builds**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add client/src/stores/gameStore.ts
git commit -m "feat: add weekly RP generation and deduct RP cost when starting research"
```

---

## Task 3: Rewrite TechTreeFullscreen as vertical 6-column layout

**Files:**
- Modify: `client/src/components/TechTreeFullscreen.tsx` (full rewrite)

This is the largest task. The entire component is replaced.

- [ ] **Step 1: Rewrite TechTreeFullscreen.tsx**

Replace the entire file with a new vertical layout. Key requirements:

1. **Layout**: 6 columns (Infrastructure, Military, Science, Economy, Government, Society) side by side
2. **Each column**: category header at top, nodes flowing vertically downward sorted by prerequisite depth
3. **Node design**: ~40px circle with emoji icon, name in small text underneath (10-11px, centered, max 2 lines)
4. **Node states**: locked (dark, opacity-50), available (glowing category-coloured border), researching (blue pulse animation), unlocked (bright green)
5. **Prerequisite lines**: SVG lines drawn within each column only (parent → child), not cross-column
6. **Hover tooltip**: shows description, RP cost, research time, prerequisites (including cross-category ones as text like "Requires: X (Category)")
7. **Click**: on available node, calls startResearch if enough RP
8. **RP display**: top bar showing "🔬 X RP" and "+Y/week" income rate
9. **Keep**: existing CATEGORY_META colours and TECH_ICONS for icons
10. **Scroll**: entire tree scrolls vertically together

The component should:
- Use `getEraGroupTechs` to get the correct tech tree for the current era/phase
- Group nodes by category
- Sort within each category by prerequisite depth (roots at top, dependencies below)
- Render SVG lines between parent and child nodes in the same category
- Show a hover tooltip `div` positioned near the hovered node

Key implementation details:

```typescript
// Compute depth for nodes within a single category
function computeCategoryDepths(nodes: TechNode[]): Map<string, number> {
  const nodeIds = new Set(nodes.map(n => n.id))
  const depths = new Map<string, number>()
  
  // Roots: nodes whose prerequisites are all outside this category
  const roots = nodes.filter(n => 
    n.prerequisites.filter(p => nodeIds.has(p)).length === 0
  )
  roots.forEach(n => depths.set(n.id, 0))
  
  // BFS to assign depths
  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) {
      if (depths.has(node.id)) continue
      const parentDepths = node.prerequisites
        .filter(p => nodeIds.has(p))
        .map(p => depths.get(p))
      if (parentDepths.length > 0 && parentDepths.every(d => d !== undefined)) {
        depths.set(node.id, Math.max(...(parentDepths as number[])) + 1)
        changed = true
      }
    }
  }
  // Any remaining nodes (circular or orphaned) get depth 0
  nodes.forEach(n => { if (!depths.has(n.id)) depths.set(n.id, 0) })
  return depths
}
```

For the node circle rendering:
```tsx
<div className="flex flex-col items-center" style={{ width: 72, marginBottom: 8 }}>
  <div 
    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 cursor-pointer transition-all ${stateClasses}`}
    onMouseEnter={() => setHovered(tech.id)}
    onMouseLeave={() => setHovered(null)}
    onClick={() => handleClick(tech)}
  >
    {icon}
  </div>
  <span className={`text-[10px] text-center leading-tight mt-1 max-w-[72px] ${nameClass}`}>
    {tech.name}
  </span>
</div>
```

For RP display at top:
```tsx
<div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#080f1e]/80">
  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Technology</h2>
  <div className="flex items-center gap-4">
    <span className="text-sm text-cyan-300 font-mono">🔬 {currentRP.toLocaleString()} RP</span>
    <span className="text-xs text-gray-500">+{weeklyRP}/week</span>
  </div>
  <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
</div>
```

- [ ] **Step 2: Verify it builds**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/TechTreeFullscreen.tsx
git commit -m "feat: rewrite tech tree as vertical 6-column layout with hover tooltips and RP display"
```

---

## Task 4: Add `rp` cheat command

**Files:**
- Modify: `client/src/components/CheatMenu.tsx`

- [ ] **Step 1: Add rp command**

In `CheatMenu.tsx`, find the command parsing section. Add after the `addmoney` handler:

```typescript
    // rp <amount> — add research points
    if (lower.startsWith('rp ')) {
      const val = parseValue(parts[1] ?? '')
      if (val === null) { push('Usage: rp <amount>  e.g. rp 500', 'err'); return }
      const country = gameState.countries[gameState.playerCountryId]
      if (!country) return
      const current = country.stats.researchPoints ?? 0
      cheatPatch({
        countries: {
          ...gameState.countries,
          [gameState.playerCountryId]: {
            ...country,
            stats: { ...country.stats, researchPoints: current + val },
          },
        },
      })
      push(`Added ${val.toLocaleString()} RP. Balance: ${(current + val).toLocaleString()}`, 'ok')
      return
    }
```

Also add to the HELP string:
```
  rp <amount>                     add research points (e.g. rp 500)
```

And add to the comment block at the top:
```
//   rp <amount>                  add research points
```

- [ ] **Step 2: Verify it builds**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/CheatMenu.tsx
git commit -m "feat: add rp cheat command to grant research points"
```

---

## Task 5: Train border routing logic

**Files:**
- Modify: `client/src/stores/gameStore.ts` (or wherever rail building is handled)

- [ ] **Step 1: Find the rail-building logic**

Search for where rail lines are added to the game state. Look for `railLines`, `RailLine`, or rail-related action handling in `gameStore.ts` and `GamePage.tsx`. The rail building likely happens as part of the AI action result processing (`applyResults` or similar).

- [ ] **Step 2: Add border check to rail building**

When a rail line is being built between two cities, add a check:

```typescript
function canBuildRail(
  fromCity: { lat: number; lng: number; country: string },
  toCity: { lat: number; lng: number; country: string },
  playerCountryId: string,
  allies: string[],
  controlledCountries: string[],
): { allowed: boolean; message?: string } {
  const friendlyCountries = new Set([playerCountryId, ...allies, ...controlledCountries])
  
  // Same country or both friendly — always OK
  if (friendlyCountries.has(fromCity.country) && friendlyCountries.has(toCity.country)) {
    return { allowed: true }
  }
  
  // Different non-friendly countries — check if route can go around
  // For simplicity, if either endpoint is in a non-friendly country, block it
  // with a message suggesting alliance/trade agreement
  const blockedCountry = !friendlyCountries.has(fromCity.country) 
    ? fromCity.country 
    : toCity.country
  
  return {
    allowed: false,
    message: `Cannot build rail — no route through friendly territory. Establish an alliance or trade agreement with ${blockedCountry} to enable cross-border rail.`,
  }
}
```

Integrate this check wherever rail lines are added to `state.railLines`. If the check fails, don't add the rail and instead show the error message to the user (via the action results or a notification).

**Important:** Read the existing rail-building code first to understand how it works. The check needs to be added at the right point in the flow. If rails are built via AI action results, the check should happen in the result-processing logic.

- [ ] **Step 3: Verify builds and tests pass**

```bash
cd G:/Claude/ad-astra-historia/client && npx tsc --noEmit
cd G:/Claude/ad-astra-historia && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add client/src/stores/gameStore.ts
git commit -m "feat: block rail lines across non-allied international borders"
```

---

## Task 6: Visual polish and integration testing

**Files:**
- Possibly modify: `client/src/components/TechTreeFullscreen.tsx` (tuning)
- Possibly modify: `client/src/pages/GamePage.tsx` (if tech tree button needs updating)

- [ ] **Step 1: Verify the tech tree button in GamePage still works**

The tech tree is opened via a button in GamePage. Read GamePage.tsx to confirm `<TechTreeFullscreen>` is still rendered correctly and receives the right props. Fix any broken imports or props.

- [ ] **Step 2: Manual playtest checklist**

Start the game (`npm start`) and verify:

**Tech Tree UI:**
- [ ] Fullscreen overlay opens when clicking tech tree button
- [ ] 6 columns visible: Infrastructure, Military, Science, Economy, Government, Society
- [ ] Nodes are circles (~40px) with emoji icons
- [ ] Names appear below circles in small text
- [ ] Hovering a node shows tooltip with description, cost, time, prerequisites
- [ ] Cross-category prerequisites shown as text in tooltip (not lines)
- [ ] Lines connect parent→child within same column
- [ ] Node states: locked (dark), available (glowing), researching (pulse), unlocked (green)
- [ ] Clicking available node with enough RP starts research
- [ ] Clicking available node without enough RP shows "not enough" feedback

**RP System:**
- [ ] RP counter shown at top of tech tree
- [ ] RP increases each week when advancing time
- [ ] Building universities increases RP rate
- [ ] RP is deducted when starting research
- [ ] `rp 500` cheat command works

**New Nodes:**
- [ ] ~150+ total modern era nodes visible
- [ ] New nodes have correct prerequisites
- [ ] No duplicate tech IDs

**Train Borders:**
- [ ] Rail between two cities in same country: works
- [ ] Rail between allied countries: works
- [ ] Rail across non-allied border: shows error message

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: tech tree integration polish and testing"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```
