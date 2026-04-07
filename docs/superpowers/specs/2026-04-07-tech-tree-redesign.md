# Tech Tree Redesign + RP System + Train Border Logic

**Date:** 2026-04-07
**Scope:** Redesign the tech tree UI to a vertical 6-column layout with hover tooltips, add an RP economy for unlocking techs, expand the modern tree to ~150 nodes, and fix train routing to respect international borders.

---

## 1. Vertical Tech Tree UI

### Layout
- **Fullscreen overlay** triggered by the existing floating tech tree button.
- **6 vertical columns** displayed side by side, one per category: Infrastructure, Military, Science, Economy, Government, Society.
- Each column has a category header (icon + name) at the top and nodes flowing downward.
- Columns scroll vertically together (single scroll container for the whole tree).
- Columns are evenly spaced across the width. On narrow screens they compress; at minimum they remain readable with horizontal scroll.

### Node Design
- **Circle**: ~40px diameter with an emoji icon centered inside.
- **Name**: small text (10-11px) underneath the circle, max 2 lines, centered.
- **States**:
  - **Locked**: dark background (`bg-white/[0.04]`), grey icon, reduced opacity. Not clickable.
  - **Available**: brighter background, glowing coloured border matching the category colour. Clickable.
  - **Researching**: animated pulse/ring effect. Shows remaining time beneath name.
  - **Unlocked**: solid bright background with category colour, full opacity.
- **Click**: on an available node, spend RP and start research (same as current `startResearch()`).

### Prerequisite Lines
- **Within-column only**: vertical/curved SVG lines connect parent → child within the same category column.
- **Cross-category prerequisites**: NOT drawn as lines. Instead shown in the hover tooltip as text, e.g. "Requires: Advanced Manufacturing (Infrastructure)".
- Lines use a subtle colour matching the category, with reduced opacity. Unlocked connections are brighter.

### Hover Tooltip
- Appears on hover (desktop) or tap-and-hold (mobile).
- Shows:
  - Tech name (bold)
  - Description (1-2 sentences)
  - RP cost
  - Research time (formatted as weeks/months/years)
  - Prerequisites list (including cross-category ones with their category label)
  - "Click to research" or status text (locked reason / researching progress / already unlocked)

### RP Display
- Shown at the top of the tech tree overlay: `🔬 1,240 RP` with the current balance.
- Also shows RP income rate: `+12/week`.

---

## 2. RP (Research Points) Economy

### Generation (passive, per week)
- **Base income**: 5 RP/week (every country)
- **Per university**: +3 RP/week for each university in `infrastructureMap`
- **Tech snowball**: +0.5 RP/week per tech already unlocked in `unlockedTechs`
- **Education multiplier**: `0.5 + (educationIndex / 100)` — ranges from 0.5x (education 0) to 1.5x (education 100)
- **Stability penalty**: if stability < 40, total RP generation is halved

Formula: `weeklyRP = Math.floor((base + universities * 3 + unlockedCount * 0.5) * educationMultiplier * stabilityMultiplier)`

### Spending
- Clicking an available tech deducts `tech.cost` from `researchPoints` in game state.
- Research then takes `tech.researchWeeks` weeks to complete (existing queue system).
- If insufficient RP, show tooltip "Not enough RP (need X, have Y)".

### Pacing Examples
- **Early game** (0 techs, 0 universities, education 55): ~8 RP/week. Basic 30-RP tech takes ~4 weeks to afford.
- **Mid game** (20 techs, 3 universities, education 65): ~26 RP/week. 200-RP tech takes ~8 weeks.
- **Late game** (60 techs, 8 universities, education 80): ~58 RP/week. 800-RP tech takes ~14 weeks.

### Integration
- `researchPoints` already exists in `CountryStats`. The weekly RP generation is added to `advanceDate()`.
- RP accumulates passively each week. No action required from the player to earn it.

---

## 3. Expanded Modern Tech Tree (~150 nodes)

### New Nodes to Add (~35 new)

**Military** (add ~6):
- `missile_defence`: Missile Defence Shield — cost 350, prereqs: [hypersonics]
- `aircraft_carriers`: Carrier Strike Group — cost 400, prereqs: [naval_modernisation]
- `special_forces`: Special Operations Command — cost 200, prereqs: [modern_military]
- `chemical_weapons`: Chemical & Biological Programme — cost 250, prereqs: [biotech]
- `space_weapons`: Space-Based Weapons Platform — cost 600, prereqs: [satellite_network, hypersonics]
- `autonomous_weapons`: Autonomous Weapons Systems — cost 500, prereqs: [drone_warfare, ai_research]

**Science** (add ~7):
- `gene_editing`: CRISPR Gene Editing — cost 300, prereqs: [biotech]
- `neural_interfaces`: Neural Interface Technology — cost 500, prereqs: [ai_research, biotech]
- `asteroid_mining`: Asteroid Mining Programme — cost 600, prereqs: [space_launch]
- `fusion_power`: Nuclear Fusion Reactor — cost 800, prereqs: [nuclear_fission, renewable_energy]
- `quantum_internet`: Quantum Communication Network — cost 450, prereqs: [quantum_computing]
- `synthetic_biology`: Synthetic Biology — cost 400, prereqs: [gene_editing]
- `brain_computer`: Brain-Computer Interface — cost 700, prereqs: [neural_interfaces, quantum_computing]

**Economy** (add ~6):
- `cryptocurrency`: Digital Currency & Blockchain — cost 150, prereqs: [computing]
- `global_supply_chains`: Global Supply Chain Network — cost 200, prereqs: [stock_exchange]
- `free_trade_zones`: Free Trade Zones — cost 180, prereqs: [stock_exchange]
- `sovereign_wealth`: Sovereign Wealth Fund — cost 250, prereqs: [central_banking]
- `green_economy`: Green Economic Transition — cost 350, prereqs: [renewable_energy, carbon_capture]
- `space_commerce`: Space Commerce & Tourism — cost 500, prereqs: [space_launch, sovereign_wealth]

**Government** (add ~6):
- `mass_surveillance`: Mass Surveillance Network — cost 200, prereqs: [digital_governance]
- `propaganda_network`: State Propaganda Machine — cost 150, prereqs: [digital_governance]
- `digital_id`: National Digital ID System — cost 180, prereqs: [digital_governance]
- `federal_devolution`: Federal Devolution — cost 200, prereqs: [civil_service]
- `international_courts`: International Legal Framework — cost 250, prereqs: [anti_corruption]
- `cyber_defence_agency`: National Cyber Defence Agency — cost 300, prereqs: [cyber_warfare, digital_governance]

**Society** (add ~6):
- `social_media`: Social Media Ecosystem — cost 100, prereqs: [universal_broadband]
- `universal_basic_income`: Universal Basic Income — cost 400, prereqs: [universal_healthcare, central_banking]
- `cultural_exports`: Cultural Export Programme — cost 150, prereqs: [public_education]
- `immigration_policy`: Immigration & Integration Policy — cost 120, prereqs: [civil_service]
- `mental_health`: National Mental Health Programme — cost 200, prereqs: [universal_healthcare]
- `space_colonisation`: Space Colonisation Programme — cost 800, prereqs: [mars_mission, fusion_power]

**Infrastructure** (add ~5):
- `smart_cities`: Smart City Infrastructure — cost 350, prereqs: [5g_network, digital_governance]
- `desalination`: Industrial Desalination Plants — cost 200, prereqs: [national_grid]
- `space_elevator`: Space Elevator — cost 800, prereqs: [advanced_manufacturing, space_launch]
- `hyperloop`: Hyperloop Network — cost 500, prereqs: [high_speed_rail_tech, advanced_manufacturing]
- `vertical_farming`: Vertical Farming Systems — cost 250, prereqs: [renewable_energy, biotech]

### Icons
Each tech gets an emoji icon. Examples:
- missile_defence: 🛡️, aircraft_carriers: 🚢, special_forces: 🎯
- gene_editing: 🧬, fusion_power: ⚛️, neural_interfaces: 🧠
- cryptocurrency: ₿, sovereign_wealth: 🏦, green_economy: 🌱
- mass_surveillance: 👁️, propaganda_network: 📡, digital_id: 🪪
- social_media: 📱, universal_basic_income: 💰, cultural_exports: 🎭
- smart_cities: 🏙️, desalination: 💧, space_elevator: 🗼

---

## 4. Train Border Routing

### Current Behaviour
Rail lines are drawn as straight lines between two cities. They cross international borders freely.

### New Behaviour
1. When a rail line is requested between two cities:
   - Determine which countries the start and end cities are in.
   - If both are in the same country or in allied/trade-agreement countries: build normally.
   - If they cross a non-allied border: attempt to **route around** by finding waypoints through friendly territory.
2. **Route-around logic**: Check if there's a path through the player's controlled countries or allied countries that connects the two cities without crossing hostile borders. Use a simple waypoint approach — find intermediate cities in friendly territory that can chain the route.
3. **If no friendly route exists**: show message "Cannot build rail — no route through friendly territory. Establish an alliance or trade agreement with [Country] to enable cross-border rail."
4. Existing rails that cross borders due to changed alliances are not removed — they just stop generating economic bonuses until the alliance is restored.

---

## 5. Cheat Console: RP Command

Add to the existing cheat console:
- `rp <amount>` — adds the specified amount of RP to the player's balance. E.g. `rp 500` adds 500 RP. `rp 99999` for testing endgame techs.

---

## Out of Scope
- Ancient and industrial era tech trees (unchanged)
- Tech tree visual animations beyond pulse/glow states
- Mobile-specific layout (works via horizontal scroll on small screens)
