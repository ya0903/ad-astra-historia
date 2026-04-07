# Historical Eras Rework — Polities, Tech Trees, Currency & Era Progression

**Date:** 2026-04-09
**Status:** Approved for planning
**Spec scope:** Option B (Visual + Stats) extended with currency, news templates, and era progression mechanic

---

## Goal

Replace the broken / hardcoded ancient era system with **15 historically accurate eras** using
[aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) GeoJSON data,
add per-polity stat tables, era-aware tech tree progression that lets the player advance from
Bronze Age through Industrial era and into Modern, era-flavoured news, era-appropriate currency
display (gold coins → paper → fiat), and a world simulation that works for ancient polities the
same way it does for modern countries.

## Out of Scope

- Era-specific UI themes (no parchment textures, no Roman fonts)
- Leader portrait art per polity
- Era-specific music or sound effects
- Multiplayer / branching alt-histories beyond the player's own playthrough
- Polity-specific advisor voices in diplomatic chat (AI just adapts naturally)
- Province-level granularity for ancient eras (no sub-national provinces inside ancient polities)
- Backporting modern-only features (rail drawing, nationalisation, nuclear tech) to ancient eras

---

## 1. Data Source & Era List

**Source:** aourednik/historical-basemaps (GPL-3.0 license, attribution required).

**20 total eras** = 15 historical (using aourednik) + 5 modern (existing Natural Earth data, unchanged).

| # | Era ID | Year | aourednik file | Description |
|---|---|---|---|---|
| 1 | `bronze_age` | 1500 BCE | `world_bc1500.geojson` | Egypt, Hittites, Babylon, Indus Valley |
| 2 | `classical_greek` | 431 BCE | `world_bc500.geojson` | Peloponnesian War — Athens, Sparta, Persia, Carthage |
| 3 | `alexander` | 323 BCE | `world_bc323.geojson` | Alexander's empire at maximum extent |
| 4 | `qin_expansion` | 300 BCE | `world_bc300.geojson` | Warring States → Qin unification, Mauryan India |
| 5 | `punic_wars` | 200 BCE | `world_bc200.geojson` | Rome vs Carthage finale, Seleucid, Han emerging |
| 6 | `roman_peak` | 117 CE | `world_100.geojson` | Trajan's Rome, Han China, Parthia, Kushan |
| 7 | `late_antiquity` | 500 CE | `world_500.geojson` | Fall of Rome, Sassanid Persia, Gupta India |
| 8 | `tang_abbasid` | 800 CE | `world_800.geojson` | Islamic Golden Age, Tang peak, Carolingian |
| 9 | `high_medieval` | 1279 CE | `world_1279.geojson` | Mongol Empire peak, Song China, Mamluks |
| 10 | `age_of_exploration` | 1492 CE | `world_1492.geojson` | Columbus, Reconquista, Aztec, Inca, Ming |
| 11 | `ottoman_classical` | 1530 CE | `world_1530.geojson` | Suleiman, Habsburg, Mughal, Songhai, Sengoku |
| 12 | `enlightenment` | 1715 CE | `world_1715.geojson` | Louis XIV, late Mughal, Qing, Tokugawa |
| 13 | `industrial_dawn` | 1880 CE | `world_1880.geojson` | Britain peak, Bismarck, Meiji, Scramble for Africa |
| 14 | `great_war` | 1914 CE | `world_1914.geojson` | WWI eve |
| 15 | `interwar` | 1938 CE | `world_1938.geojson` | Pre-WWII tensions |
| 16-20 | `1945`, `1960s`, `1990s`, `2010s`, `modern` | — | (unchanged, Natural Earth) |

Era ordering on the picker is strictly chronological. Modern eras flow seamlessly from `interwar`
into `1945` because both share the same `unlockedTechs` storage in game state.

---

## 2. Polity Identification & Data Pipeline

### Stable polity IDs
Aourednik uses unstable `NAME` strings ("Roman Republic" vs "Roman Empire"). Generate
era-prefixed slugs at processing time:

```ts
function polityId(eraId: string, name: string): string {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${eraId}:${slug}`
}
// e.g. "roman_peak:roman_empire", "bronze_age:egypt", "classical_greek:athens"
```

The era prefix guarantees uniqueness across eras and lets us look up era from ID instantly.

### Server-start data pipeline
New script `shared/eras/processHistorical.mjs` runs at server startup after `download.mjs`:

1. For each of the 15 historical eras, download the corresponding aourednik GeoJSON file from
   `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_<X>.geojson`
   to `shared/eras/raw/world_<X>.geojson`. Skip if already downloaded.
2. For each era, normalise the file:
   - Extract `NAME` → `name`
   - Generate `polity_id` per the slug rule above
   - Preserve `BORDERPRECISION` → `border_precision` (1-3)
   - Look up the polity in `HISTORICAL_POLITIES` and inject computed `fill_colour`
   - For polities NOT in the table, use the deterministic hash colour function
3. Write the processed file to `shared/eras/<era_id>.geojson` (overwrites the existing file
   for greek/roman/ottoman; creates new files for the others).
4. Build a single `shared/eras/polity_index.json` mapping every polity_id → its era, name,
   region (continent if extractable), tier, abundance score (population estimate from area).

### Static polity stat tables
New file `shared/historicalPolities.ts` exports `HISTORICAL_POLITIES: Record<string, HistoricalPolityData>`
where the key is the era-prefixed polity ID:

```ts
export interface HistoricalPolityData {
  name: string                    // display name
  population: number              // estimated population
  gdp: number                     // USD-equivalent for the era (PPP-adjusted)
  military: number                // 0-100
  tier: 1 | 2 | 3 | 4 | 5 | 6     // civilisational tier
  governmentType: string          // 'monarchy' | 'oligarchy' | 'theocracy' | etc.
  bonusTechs: string[]            // tech IDs unlocked at start IN ADDITION to tier defaults
  missingTechs: string[]          // tech IDs removed from tier defaults
  personality: CountryPersonality // existing type — aggression/diplomacy/etc.
  fillColour?: string             // hand-tuned colour override (otherwise auto-generated)
}
```

**Manually populated for ~80-120 major polities** across all 15 eras (5-8 per era for the most
significant civilisations, e.g. Athens/Sparta/Persia/Carthage/Macedon for `classical_greek`).

**Minor polities** (not in the table) get default stats based on tier inferred from era and
population estimate from polygon area. They still get a deterministic colour and a generic
personality profile.

---

## 3. Civilisational Tier System

**6 tiers** representing technological/cultural development. Each tier includes everything from
lower tiers, plus:

| Tier | Name | Tech preset includes |
|---|---|---|
| 1 | Nomadic / Tribal | Stoneworking, fire, basic weapons |
| 2 | Early Agricultural | Bronze working, irrigation, basic governance |
| 3 | Classical Civilisation | Iron working, philosophy, mathematics, currency, architecture |
| 4 | Imperial Civilisation | City planning, professional armies, road networks, administration, advanced metallurgy |
| 5 | Early Modern | Gunpowder, printing press, banking, naval exploration |
| 6 | Industrial | Steam power, railways, factories, electricity |

Each polity has a `tier` field. At game start, the player's polity is given:
1. **Tier defaults** — all tech IDs in the tier preset are auto-marked as unlocked
2. Plus any `bonusTechs` (e.g. Athens gets `philosophy` and `democracy` even at Tier 3)
3. Minus any `missingTechs` (e.g. Sparta loses `philosophy` because Spartans famously rejected academia)

Defaults live in `shared/historicalPolities.ts` as a `TIER_DEFAULTS: Record<1|2|3|4|5|6, string[]>`
table.

---

## 4. Era Tech Tree System

### One tech tree per era
New file `shared/historicalEraTechTrees.ts` exports `HISTORICAL_TECH_TREES: Record<EraId, TechNode[]>`
where each era's tree contains 30-50 era-appropriate techs.

**Example era tech trees:**
- **Bronze Age**: bronze_working, irrigation, wheel, writing, ship_building, fortifications, archery, monumental_architecture (~30 nodes)
- **Classical Greek**: phalanx_warfare, trireme, philosophy, democracy, geometry, sculpture, currency, olympic_games, hoplite_drill (~40 nodes)
- **High Medieval**: heavy_cavalry, castle_building, longbow, scholasticism, double_entry_bookkeeping, **banking_paper_money**, university, mechanical_clock, gunpowder, crossbow (~45 nodes)
- **Industrial Dawn**: telegraph, steam_engine, railway, factory_system, joint_stock, electricity, steel_production, breech_loading_rifle (~50 nodes)

The existing `TECH_TREE`, `ANCIENT_TECH_TREE`, and `INDUSTRIAL_TECH_TREE` constants are
**replaced** by this new per-era system. Existing tech IDs are reused where appropriate so
nothing in `unlockedTechs` is invalidated mid-game.

### Era progression mechanic
When the player completes ALL techs in their current era's tree, a "Next Era →" button appears
in the tech tree UI footer.

Clicking it triggers `advanceEra()`:
1. Opens an empire-rename dialog (current name pre-filled, optional)
2. Loads the next era's GeoJSON via the server endpoint and polity data
3. Updates `currentDate` to the new era's start year (configured per era)
4. Updates `era` field in game state to the next era ID
5. **Player's controlled territory carries over** — `controlledCountries` and `controlledRegions`
   are preserved as-is. The player's polity row in `state.countries` is renamed to the new empire
   name and assigned the new era's player polity slot
6. Stats (GDP, military, approval, etc.) carry over with a small bonus (+10% GDP, +5 stability)
   reflecting the new era's improvements
7. `worldRelations` is rebuilt from `ERA_RELATIONS[newEra]` matrix — old relations dropped, new
   ones seeded
8. Tech tree switches to the new era's tree. Unlocked techs that don't exist in the new tree are
   kept in `unlockedTechs` (for safety) but won't appear visually
9. News headline posted: `"The dawn of [Next Era Name] — [Empire Name] enters a new age"`

### Tech tree picker UI
Replace the existing horizontal scrolling layout with a **horizontal tab strip at the top of the
fullscreen tech tree** showing all eras chronologically. Visual states:
- ✅ **Completed (past)** — green pill, click to view read-only
- 🔵 **Current** — bright purple, click to research
- 🔒 **Locked (future)** — greyed pill, click to preview read-only

Tabs scroll horizontally if there are more than fit on screen. The current era's tab is centred
on open.

---

## 5. News Templates Per Era

### File structure
New file `shared/newsTemplates.ts` exports `NEWS_TEMPLATES_BY_ERA: Record<EraId, EraNewsTemplate>`.

```ts
export interface EraNewsTemplate {
  /** Era-flavoured headline templates for universal world events */
  baseEventWording: Partial<Record<WorldTickEventType, string[]>>
  /** Era-unique events with their own headlines, bodies, and roll weights */
  uniqueEvents: EraUniqueEvent[]
}

export interface EraUniqueEvent {
  id: string                       // e.g. 'plague_outbreak'
  weeklyRollChance: number         // 0-1
  headline: string                 // template with {country} placeholder
  body: string                     // 1-2 sentence body
  category: NewsCategory
  importance: NewsImportance
  /** Optional per-country precondition (e.g. only for tier-4+ polities) */
  conditions?: { minTier?: number; maxTier?: number }
}
```

### Universal event wording
Each era overrides selected universal event types:
- Bronze Age `war_declared`: `"{primary} Sends War Tablets to {target}"`
- Roman `war_declared`: `"Senate of {primary} Declares War on {target}"`
- Medieval `war_declared`: `"{primary} Issues Diffidatio Against {target}"`
- Modern `war_declared`: existing templates (unchanged)

### Unique events per era (5-10 each)
- **Bronze Age**: famine, lapis lazuli tribute, copper trade, royal marriage, ziggurat completed
- **Classical Greek**: Olympic games, oracle consultation, ostracism, philosophical school founded, naval battle
- **Roman**: triumph awarded, sumptuary law, vestal scandal, gladiator games, imperial succession
- **Medieval**: plague outbreak, crusade declared, papal interdict, peasant revolt, castle siege
- **Industrial**: factory strike, stock panic, telegraph cable laid, workers' uprising, railway opened
- (etc. for all 15 eras)

Universal events still fire, but use era-flavoured wording. Unique events are rolled in
`worldTick` alongside existing tension/opportunity steps, weighted by `weeklyRollChance`.

### Integration
`newsGenerator.ts` and `worldSimulation.ts` get a new helper:

```ts
function getEraTemplate(era: string, eventType: WorldTickEventType): string[]
```

Returns the era-flavoured templates if available, falls back to the generic ones in `HEADLINES`
if not.

---

## 6. Era Selection UI

Redesign `SetupPage.tsx` Step 2 from a vertical list to a **tile grid** with three sections.

### Three section headers
- **Ancient & Classical** (7 tiles): Bronze Age, Classical Greek, Alexander, Qin Expansion, Punic Wars, Roman Peak, Late Antiquity
- **Medieval & Early Modern** (5 tiles): Tang/Abbasid, High Medieval, Age of Exploration, Ottoman Classical, Enlightenment
- **Industrial & Modern** (8 tiles): Industrial Dawn, Great War, Interwar, 1945, 1960s, 1990s, 2010s, Modern

All sections visible by default — no collapsing. Section headers are simple 14px label dividers.

### Tile layout
Responsive grid of 3-4 columns. Each tile is a clickable card:
- **Year badge** in the top-right corner (e.g. `431 BCE`, `1880`, `2025`)
- **Era name** in bold (e.g. `Classical Greek`)
- **1-line tagline** below the name (e.g. `Peloponnesian War — Athens, Sparta, Persia`)
- **Selected state**: highlighted border + accent colour
- **Hover state**: subtle scale-up + glow

The modern eras also become tiles in the same grid for visual consistency.

### Default selection
On open, the most-recently-played era's section is auto-selected. If no history, the first tile
in the Industrial & Modern section (Industrial Dawn) is highlighted as a hint.

---

## 7. Border Precision & Visual Treatment

Aourednik's `BORDERPRECISION` field is 1-3:
- **1** = very approximate (most ancient eras)
- **2** = roughly accurate (medieval / early modern)
- **3** = legally precise (modern boundaries)

### Render treatment by precision
The `CountryLayer` borders layer uses MapLibre data-driven styling:
- **Precision 3**: render normally — sharp solid borders
- **Precision 2**: borders slightly softer — `line-blur: 0.5`, `line-opacity: 0.85`
- **Precision 1**: dashed borders — `line-dasharray: [3, 3]`, `line-blur: 1`, slightly faded fill

This communicates uncertainty visually — ancient borders look fluid because they were fluid.

### Polity colours
**Two-layer system:**

1. **Hand-tuned override table** for ~30 major historical empires (Rome, Persia, Mongols, Tang,
   Ottomans, etc.) defined in `shared/historicalPolities.ts` as `MAJOR_POLITY_COLOURS`. These
   take precedence.

2. **Hash-generated fallback** for everyone else:

```ts
function generatePolityColour(name: string, era: string): string {
  // Stable hash combining era + name → HSL
  const hash = djb2(`${era}:${name}`)
  const hue = hash % 360
  const sat = 55 + (hash >> 8) % 20      // 55-75%
  const light = 45 + (hash >> 16) % 15   // 45-60%
  return hslToHex(hue, sat, light)
}
```

Same name in different eras can drift slightly (different hash seed), so "Persia" in 500 BCE and
"Persia" in 200 BCE look related but not identical.

---

## 8. Per-Polity Personalities & Diplomacy Carry-Over

### Personalities for ancient polities
Each entry in `HISTORICAL_POLITIES` includes a `personality` block matching the existing
`CountryPersonality` structure. Hand-tuned for ~80-120 major polities:

```ts
'classical_greek:athens': {
  // ... other fields
  personality: { aggression: 65, diplomacy: 80, economicFocus: 75, stability: 70, unpredictability: 12 }
}
'classical_greek:sparta': {
  // ...
  personality: { aggression: 90, diplomacy: 30, economicFocus: 25, stability: 85, unpredictability: 8 }
}
```

Minor polities get tier-based defaults:
- Tier 1 (Nomadic): high aggression, low diplomacy, low economic, low stability, high unpredictability
- Tier 6 (Industrial): mid aggression, high diplomacy, high economic, high stability, low unpredictability

### World simulation hookup
The existing `getPersonality(iso)` in `shared/worldSimulation.ts` is extended to check
`HISTORICAL_POLITIES` first when `era` is a historical era. The rest of the `worldTick` system
(tension evaluation, opportunity generation, internal events, chain reactions) works unchanged.

### Era transition diplomacy carry-over
When `advanceEra()` runs:
1. **Conquered territory preserved**: `controlledCountries` and `controlledRegions` carry over
   verbatim. Visually, the player's empire stays the same shape on the new era's map (the
   underlying polity polygons are different but the player's overlay tints them in player colour)
2. **Old relations dropped**: `worldRelations` for polities that no longer exist in the new era
   are removed
3. **New relations seeded**: A small `ERA_RELATIONS: Record<EraId, Array<{a: string; b: string; value: number}>>`
   table provides starting relations for major polity pairs in each era
   (e.g. `punic_wars: [{ a: 'rome', b: 'carthage', value: -80 }]`)
4. **Player relation seed**: The player's relations with the new era's polities are computed
   from the closest geographical equivalent (if Macedon expanded into Persian territory, the
   player inherits Persia's modern-era hostility toward Egypt, etc.)

---

## 9. Currency System

The currency display is **era-aware** and goes through 3 phases:

### Phase 1: Coin Era (default for ancient eras)
- GDP, costs, all economic figures shown as **gold coins** (era-appropriate unit names)
- Icon: 🪙 instead of 💰
- Display: `12,000 talents` instead of `$25T`
- Internally still stored as a number — only the UI formatting changes
- Era-specific unit labels (configured per era):
  - Bronze Age: *deben*
  - Classical Greek / Alexander / Qin / Punic / Roman: *talents*
  - Late Antiquity / Tang/Abbasid: *solidi*
  - High Medieval / Exploration: *florins*
  - Ottoman / Enlightenment: *ducats*

### Phase 2: Paper Era
Triggered when the player researches a new tech `banking_paper_money` (added to the High
Medieval era tech tree):
- Currency display shifts to **paper-money style** — same unit name but icon changes to 📜
- Provides a small economic boost (+5% trade efficiency multiplier on monthly income)
- Optional flag in game state: `currencyMode: 'coin' | 'paper' | 'fiat'`

### Phase 3: Fiat Era (default for modern eras)
- Triggered automatically when the player enters the `industrial_dawn` (1880) era or any later era
- Display reverts to the existing `$` USD format we already have
- Icon: 💰

### Click-to-toggle USD equivalent
Click the currency icon (🪙 / 📜 / 💰) anywhere it appears to toggle a USD-equivalent display
below the figure:
- `12,000 talents ($30M USD equiv.)`
- Each era has a static historical-to-USD PPP conversion rate baked into a small lookup table:

```ts
export const ERA_USD_CONVERSION_RATE: Record<string, number> = {
  bronze_age:        100,    // 1 deben ≈ $100 PPP
  classical_greek:   2500,   // 1 talent ≈ $2500 PPP
  punic_wars:        2500,
  roman_peak:        30,     // 1 denarius ≈ $30 PPP
  // ...
  modern:            1,      // 1 USD = 1 USD
}
```

- Toggle state persists in localStorage (`aah-currency-toggle: 'native' | 'usd'`)
- News headlines that mention money show both: `"Athens Spends 800 talents ($2M USD) on Naval Fleet"`
- Conversion is **rough PPP** — explicitly noted as "USD equivalent (rough)" — not used in
  any internal math, just for player intuition

### Implementation
A new helper `formatCurrency(amount, era, hasPaperMoney, mode)` is exported from a new
`client/src/lib/currency.ts` file. It's used everywhere we currently call `formatMoney`
(EconomyPanel, NewsPanel, GamePage stats display, RailDrawPanel cost display, etc.).

---

## 10. File Inventory

### New files
- `shared/eras/processHistorical.mjs` — server-start data pipeline
- `shared/historicalPolities.ts` — polity stat tables, tier defaults, major polity colour overrides
- `shared/historicalEraTechTrees.ts` — per-era tech trees
- `shared/newsTemplates.ts` — era-flavoured news templates
- `shared/eraConfig.ts` — era ID list, year per era, USD conversion rates, currency unit names
- `shared/eras/raw/world_<X>.geojson` — downloaded raw aourednik files (gitignored)
- `shared/eras/polity_index.json` — generated polity lookup index
- `client/src/lib/currency.ts` — `formatCurrency` helper
- `client/src/components/setup/EraTilePicker.tsx` — new tile-grid era picker

### Modified files
- `shared/types.ts` — add `currencyMode` to GameState, extend `Era` type with new era IDs, add `borderPrecision` to RailLine? no, to country source features
- `shared/eras/download.mjs` — add a hook to also run processHistorical.mjs on completion
- `server/routes/game.ts` — extend `/api/game/borders/:era` and `/api/game/geojson/:era` to serve the processed historical files
- `server/index.ts` — call processHistorical.mjs on startup
- `client/src/stores/gameStore.ts` — add `advanceEra()` action; on game init, look up polity from `HISTORICAL_POLITIES` for ancient eras
- `client/src/pages/SetupPage.tsx` — replace ERAS list rendering with `<EraTilePicker>`
- `client/src/components/TechTreeFullscreen.tsx` — add era tab strip at top, support per-era tech trees, add "Next Era →" button when current era complete
- `client/src/components/map/CountryLayer.tsx` — apply border-precision-based styling
- `client/src/components/map/CountryLabelOverlay.tsx` — read polity name from new properties, handle era-specific names
- `client/src/components/EconomyPanel.tsx` — use `formatCurrency` instead of `formatMoney`
- `client/src/components/NewsPanel.tsx` — use `formatCurrency`
- `client/src/components/RailDrawPanel.tsx` — use `formatCurrency`
- `client/src/pages/GamePage.tsx` — use `formatCurrency`, update AI prompt for ancient polity context
- `shared/worldSimulation.ts` — extend `getPersonality` to check `HISTORICAL_POLITIES`
- `shared/newsGenerator.ts` — extend with `getEraTemplate` helper

### Deleted / replaced
- `shared/eras/greek.geojson`, `roman.geojson`, `ottoman.geojson`, `abbasid.geojson`, etc. —
  replaced by processed versions written by the pipeline
- `shared/techTree.ts` `ANCIENT_TECH_TREE` and `INDUSTRIAL_TECH_TREE` constants — superseded by
  the per-era trees in `historicalEraTechTrees.ts`
- `shared/eraConflicts.ts` `ERA_DISPUTES` — replaced/supplemented by news template unique events

---

## 11. Acceptance Criteria

- [ ] Server downloads all 15 historical era GeoJSON files at startup
- [ ] Each historical era's map renders with accurate borders matching the era
- [ ] Ancient borders use softer/dashed visual treatment when `BORDERPRECISION` is low
- [ ] Setup screen shows 20 eras as tile cards in 3 sections
- [ ] Selecting Bronze Age and starting as Egypt loads with ~6-8 visible polities (Egypt, Hittites, Babylon, etc.)
- [ ] Egypt starts with `irrigation`, `bronze_working`, `monumental_architecture` already unlocked (Tier 2 + bonus)
- [ ] Currency displays as `1,500 deben` instead of `$1.5T` for Bronze Age games
- [ ] Clicking the 🪙 icon toggles to `$1.5M USD equiv.` shown below
- [ ] Tech tree fullscreen shows era tabs at top — past eras green, current purple, future grey
- [ ] Completing all techs in the current era reveals a "Next Era →" button in the tree footer
- [ ] Pressing "Next Era →" opens a rename dialog, then transitions to the next era
- [ ] After transition: conquered territory persists, world map updates to new era's borders, world relations rebuild
- [ ] Researching `banking_paper_money` in High Medieval changes currency icon from 🪙 to 📜 and adds +5% trade bonus
- [ ] Entering `industrial_dawn` (1880) flips currency to fiat ($)
- [ ] News headlines fire with era-appropriate wording (e.g. Roman Senate phrasing in Roman era)
- [ ] At least 5 unique era events fire across a single playthrough of any era
- [ ] World simulation drives autonomous events for ancient polities (coups, alliances, wars) using their personalities
- [ ] No regressions in modern era gameplay
