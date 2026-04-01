# Ad Astra: Historia — Design Specification
**Date:** 2026-04-01
**Status:** Approved

---

## Overview

Ad Astra: Historia is a browser-based AI-powered grand strategy game inspired by Pax Historia. The player controls a single nation across selectable historical eras, queues real-world actions, and advances time to see AI-generated outcomes. Every narrative event, NPC country decision, and advisor suggestion is powered by a user-configured AI model (OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint).

---

## 1. Architecture

### Stack
- **Frontend:** React + Vite, MapLibre GL JS, Zustand (state), Tailwind CSS
- **Backend:** Node.js + Express
- **Shared:** TypeScript types, era data, country definitions

### Project Structure
```
ad-astra-historia/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── components/   # UI panels (ActionPanel, ResultsPanel, CheatConsole, etc.)
│   │   ├── map/          # MapLibre setup, layers, dot rendering, rail lines
│   │   ├── store/        # Zustand game state
│   │   └── pages/        # Setup screen, main game view
├── server/               # Express backend
│   ├── routes/
│   │   ├── ai.ts         # AI proxy — normalises all provider formats
│   │   ├── saves.ts      # Save/load game state to disk as JSON
│   │   └── game.ts       # Era setup, starting conditions
│   └── index.ts
├── shared/
│   ├── types.ts          # Country, GameState, Action, Infrastructure, Organisation, etc.
│   ├── eras/             # GeoJSON + country data per era (1945, 1960s, 1990s, 2010s, modern)
│   └── countries.ts      # Pre-assigned country colours, capitals, major cities
└── package.json          # Root — `npm start` boots both client and server
```

### Running Locally
```bash
npm install
npm start   # starts Express on :3001 and Vite dev server on :3000
```
No GitHub, no cloud deployment required. All saves and config live on disk.

---

## 2. Game Setup Screen

On first launch the player sees:

1. **New Game**
   - Pick era: `1945` · `1960s` · `1990s` · `2010s` · `Modern`
   - Pick country (searchable list, sorted by power tier)
   - Pick difficulty: `Passive` · `Realistic` · `Aggressive` (controls how assertively AI nations act)

2. **AI Configuration**
   - Provider: OpenAI / Anthropic / Google / Custom
   - API key input (stored in local config file, never transmitted except to the chosen provider)
   - Custom endpoint: base URL + optional auth token (supports OpenWebUI, Ollama, LM Studio, any OpenAI-compatible API)
   - Model selector (populated by querying the provider's model list)

3. **Load Save** — lists JSON save files from `saves/` directory on disk

---

## 3. Map System

### Renderer
MapLibre GL JS with Natural Earth GeoJSON dataset. Each country has a pre-assigned unique colour. Country name labels scale proportionally to territory size (same style as Pax Historia screenshot). Ocean: dark navy `#0a1628`.

### Era-specific GeoJSON
Each era has its own border file reflecting historical reality:
- `1945`: Post-WW2 borders, USSR intact, British/French empires present, Germany divided
- `1960s`: Decolonisation underway, Berlin Wall, Cold War blocs
- `1990s`: USSR dissolved, German reunification, Yugoslavia breaking up
- `2010s`: Modern borders, Kosovo independent, South Sudan formed
- `Modern`: Current borders

### Zoom Behaviour
| Zoom Level | What's Visible |
|---|---|
| World (zoom out) | Country fills, name labels, no dots |
| Regional (mid zoom) | Infrastructure dots appear, city labels |
| City (zoom in) | Click dots → info card with name, type, level, stats |

### Infrastructure Dots
All dots glow softly against the dark map. Appear at mid/close zoom only.

| Type | Colour |
|---|---|
| Research Centre | Indigo `#818cf8` |
| University | Purple `#a78bfa` |
| Intelligence Agency | Violet `#c084fc` |
| Telecom Grid Node | Sky `#38bdf8` |
| City / Capital | Blue `#60a5fa` |
| Port | Emerald `#34d399` |
| Airport / International Hub | Teal `#2dd4bf` |
| Solar Farm | Yellow `#facc15` |
| Wind Farm | Lime `#a3e635` |
| Hydroelectric Dam | Cyan `#22d3ee` |
| Fossil Fuel Plant | Orange `#fb923c` |
| Nuclear Power Plant | Green `#4ade80` |
| Military Base | Red `#f87171` |
| Nuclear Silo *(your country only)* | Rose `#f43f5e` |
| Defence / Missile System *(your country only)* | Fuchsia `#e879f9` |
| Financial Institution / Central Bank | Amber `#f59e0b` |
| Emergency Services Hub | Pink `#fb7185` |
| Industrial Zone | Gold `#fbbf24` |
| Desalination Plant | Cyan `#06b6d4` — coastal only |
| Data Centre | Slate `#64748b` |
| Embassy | Rendered as a dot in **your country's assigned colour** on foreign soil (no fixed hex — inherits player colour) |

Nuclear silos and defence systems are hidden from other countries unless discovered via espionage.

### Train Lines & Tunnels
Rendered as Bezier curves between city nodes when the relevant action is approved:
- **Domestic HSR**: Solid yellow `#fbbf24`, 2.5px
- **Cross-continent rail**: Dashed purple `#e879f9`, 2.5px
- **Undersea tunnel**: Dashed white `#e2e8f0`, 2px — follows the seabed path between two coastal cities, clearly distinct from overland lines

### International Organisation Overlays
Member countries of the same organisation share a subtle shared-colour border outline, visible at all zoom levels. Clicking the outline shows the org's name and members.

### Land-Use Overlays
Semi-transparent region overlays rendered on top of country fills at mid/close zoom:
- **Forest / reforestation zones**: deep green `rgba(21,128,61,0.35)`
- **Deforested zones**: brown `rgba(120,80,30,0.35)`
- **National parks**: bright green `rgba(74,222,128,0.3)` with a dashed border
- **Nature corridors**: thin green band connecting two park/forest regions
- **Desert agriculture zones**: sandy yellow-green `rgba(180,210,80,0.3)`
- **Desertification zones**: tan `rgba(210,180,100,0.3)`

### Strategic Passages
Pre-defined choke points marked on the map (Strait of Hormuz, Suez, Malacca, Bosporus, etc.). When controlled and active, a colour indicator shows status: white = open, amber = tolled, red = blocked.

---

## 4. Action System

### Action Panel (left sidebar)
- **Country stats bar**: GDP, Military strength, Research Points, Approval rating, Soft Power
- **AI Advisor**: Button to request 3 context-aware suggestions from the AI based on current world state, era, and player's strategic position
- **Action queue**: List of queued actions, each removable. No limit on queue size.

### Action Input — Three Tabs

**1. Categories tab** — browsable tree of common action types (Diplomacy, Build, Invest, Legislation, Environment, Space, etc.) with quick-add buttons

**2. Free Action tab (primary)** — a large open text area where the player types anything in plain language. The AI interprets intent and adds a structured action to the queue. Examples:
- "Build a skyscraper district in Shanghai"
- "Pass a minimum wage law"
- "Block the Strait of Hormuz"
- "Encourage German engineers to emigrate here"
- "Chop down the Amazon for farmland"
- "Create a nature corridor between Kenya and Tanzania"
The AI confirms the interpreted action before adding it ("I'll add: *Establish nature corridor between Kenya and Tanzania — cost $2.4B, +3 Approval, -2 Relations with logging industries*. Confirm?")

**3. AI Suggest tab** — 3–5 AI-generated suggestions based on current world state, with one-click add

### Time Advancement (bottom bar)
Four jump options:
- `1 Week` · `1 Month` · `1 Year` · `⚡ Next Major Event`

**Execute & Advance** button sends the full game state + queued actions to the AI backend, which:
1. Resolves each queued action with a narrative outcome
2. Advances NPC countries (AI plays all other nations — they queue their own actions, form alliances, build infrastructure, declare wars, etc.)
3. Fires any world events appropriate to the era and current conditions
4. Returns a structured results object

### Results Panel
Appears after each time jump. Each result is shown collapsed (one-line summary). Clicking a result **expands it inline**, pushing others down, revealing:
- Full AI-generated narrative (2–4 paragraphs)
- World reaction: how other countries responded
- Stat change tags: `+4 RP` · `+2 Tech` · `USSR aware` · `-8% Approval` etc.
- Collapse button to return to summary view

If a major world event requires a player response before the next advance (e.g. Cuban Missile Crisis, assassination, natural disaster), an **Action Required** alert blocks the next time jump until addressed.

---

## 5. Diplomacy System

### Diplomatic Actions (typeable or selectable)
- Alliance / mutual defence pact / non-aggression pact
- Trade deal / embargo / economic sanctions
- Research pact / knowledge transfer / technology sharing
- Open embassy / close embassy / expel ambassador
- Foreign aid / loans / debt forgiveness / reparations
- Covert operations (requires intelligence agency): sabotage, espionage, regime destabilisation, asset recruitment

### War & Annexation
- Declare war → AI simulates conflict over subsequent time jumps based on military strength, alliances, terrain, and era-appropriate technology
- Occupy territory → annex outright or install puppet government
- AI nations declare war on each other and on you independently
- Peace deals proposed via the action system; AI evaluates based on war score

### International Organisations
**Pre-existing orgs per era** (historically accurate):
- 1945: UN, Arab League
- 1960s: NATO, Warsaw Pact, EEC, OPEC
- 1990s: EU, NATO, WTO, ASEAN, G7
- Modern: All above + BRICS, SCO, African Union, etc.

**Joining:** AI countries send invitations as events. Player can also apply; member states vote (AI-resolved based on current relations).

**Creating:** Type "Form a Pacific Trade Alliance with Japan, South Korea and Australia." AI determines acceptance based on relations. Player defines org type: military alliance / trade bloc / research collective / political union. Org appears in a dedicated panel with member list, shared benefits, and obligations.

**AI-driven orgs:** NPC countries form organisations between themselves. Player may or may not be invited.

**Organisation types and effects:**
- Military alliance: collective defence obligations, shared military intel
- Trade bloc: GDP bonuses, tariff removal, economic interdependence
- Research collective: shared Research Points per turn
- Political union: deeper integration, eventual federation option

### Non-State Conflicts
- Paramilitary groups, insurgencies, and terror organisations exist per era and emerge dynamically
- Player options: military deployment, counter-insurgency funding, negotiation, sanctions on sponsoring states, covert infiltration/dismantlement
- Groups can be harboured or funded by NPC nations

### Border & Territorial Disputes
- Pre-loaded per era: Kashmir, Palestine, South China Sea, Western Sahara, etc.
- New disputes can emerge from player or AI actions
- Active disputes shown as highlighted borders on the map
- Resolution options: bilateral negotiation, military escalation, UN referral, third-party mediation, referendum, status quo

### United Nations
- Player is a UN member from game start
- Actions: table resolutions, request peacekeeping forces, refer disputes to Security Council, apply sanctions
- Permanent members (US, USSR/Russia, UK, France, China) hold veto power — AI exercises vetoes in line with their interests
- Resolutions can be ignored — with diplomatic consequences

### Summits

Player can host or attend summits as actions. Summits are high-visibility diplomatic events that unlock negotiation outcomes unavailable through standard bilateral actions.

**Hosting a Summit**
- Queue action: "Host a G7-style economic summit", "Convene a global climate summit", "Hold a regional security conference"
- Requires sufficient Soft Power and diplomatic standing to attract attendees
- AI determines which countries attend based on current relations, world events, and their own interests
- Hosting boosts Soft Power, Approval, and positions you as a global leader
- Failed summits (poor attendance, walkouts) damage prestige

**Summit Types**

| Type | Purpose | Example |
|---|---|---|
| Global Political Summit | Address world crises, form coalitions, broker peace | UN General Assembly special session, Camp David-style talks |
| Economic / Trade Summit | Negotiate trade frameworks, currency agreements, sanctions relief | G7, G20, Bretton Woods-equivalent |
| Tech Summit | Set global AI standards, semiconductor agreements, space cooperation treaties, internet governance | Davos-style tech forum |
| Climate / Environment Summit | Emissions targets, deforestation treaties, ocean protection agreements | COP-equivalent |
| Security Summit | Military alliances, arms control, nuclear non-proliferation | NATO summit, START treaty talks |
| Cultural Summit | Soft power exchange, co-production treaties, sport diplomacy | Commonwealth Heads of Government Meeting |

**Attending Another Nation's Summit**
- AI nations host their own summits and send invitations
- Attending builds relations; declining without reason causes minor diplomatic friction
- Player can use summits hosted by others to push their own agenda items

### Pressure & Coercion

Beyond outright war or sanctions, the player can apply targeted pressure to change another country's behaviour.

**Diplomatic Pressure**
- Issue public condemnations (low cost, low effect — but accumulates reputation)
- Threaten to withdraw from joint projects or organisations
- Coordinate pressure campaigns through alliances ("convince NATO allies to jointly pressure Turkey")
- Demand another country meets conditions before renewing a trade deal

**Economic Pressure**
- Threaten or apply targeted tariffs on specific sectors
- Freeze assets held in your financial institutions
- Lobby international financial bodies (IMF, World Bank equivalent) to restrict loans
- Weaponise strategic passage control (see above)

**Soft Power Pressure**
- Fund opposition media or civil society groups in the target country (covert — requires intelligence agency)
- Support diaspora communities abroad politically
- Cultural boycotts: ban their films, sports teams, artists from your territory
- Withdraw from their hosted events (Olympics boycott, etc.)

**Ultimatums**
- Issue a formal ultimatum with a deadline: "Withdraw troops from the border within 6 months or we impose full sanctions"
- AI evaluates likelihood of compliance based on power balance, their alliances, economic dependency, and world opinion
- Other nations observe and factor your willingness to follow through into their own calculations — empty ultimatums damage credibility

**Pressure Outcomes**
All pressure mechanics are resolved by the AI over subsequent time jumps, with narrative explaining the target's response, third-party reactions, and stat effects. Pressure can succeed partially (e.g. token concessions) or backfire (target hardens position, rallies domestic support against you).

---

## 6. AI Integration

### Backend Proxy (`/api/ai`)
Single endpoint that accepts a structured prompt payload and normalises it across providers:
- **OpenAI**: `POST /v1/chat/completions`
- **Anthropic**: `POST /v1/messages`
- **Google**: Gemini API
- **Custom**: Any OpenAI-compatible base URL + optional `Authorization` header

The prompt sent to the AI includes: current era, game date, player country stats, all queued actions, recent world history, and NPC country states. The AI returns a structured JSON response: action outcomes, NPC decisions, world events, stat deltas.

### AI Roles
1. **Narrative engine**: writes outcome text for all actions and events
2. **NPC controller**: decides actions for all other countries each turn
3. **Advisor**: generates 3 contextual suggestions when requested

### Config Storage
Provider, model, API key, and custom endpoint stored in `config.json` on disk. Never logged or transmitted except directly to the configured provider.

---

## 7. Investment & Development System

All investments are queued as actions and resolved on time advance. They produce ongoing stat bonuses, unlock new actions, generate map dots, and trigger AI-generated world reactions.

### Domestic Investment Categories

**Infrastructure Projects**
- Roads, bridges, tunnels, metro systems, national highway networks
- 5G / 6G telecommunications rollout (upgrades existing Telecom Grid Node dots)
- Smart grid electrical networks
- Water treatment and sanitation systems
- Each project has a build time, cost, and ongoing stat effect (GDP, Approval, Tech Level)

**Housing Projects**
- Public housing programmes, urban renewal, new cities
- Affects population happiness (Approval), reduces inequality stat
- Megaprojects like NEOM-style planned cities generate a unique map dot

**Tourism Projects**
- National parks, heritage sites, international airports, resort zones
- Generates GDP income per turn, boosts soft power
- Requires existing Airport dot to unlock international tourism tier

**Sector Investments**
Investing in a sector increases its output per turn and unlocks era-gated technologies:

| Sector | Unlocks / Effects |
|---|---|
| Defence | Advanced weapons, stealth tech, drone programmes, hypersonic missiles |
| Technology | AI research, semiconductor fabs, software exports |
| Batteries & Energy Storage | Enables large-scale renewable grid, EV transition |
| Microchips / Semiconductors | Boosts all tech outputs, export revenue, strategic leverage |
| Pharmaceuticals | Population health stat, pandemic resilience |
| Agriculture | Food security, famine prevention, export commodities |
| Finance | Banking influence, currency stability, foreign investment attraction |
| Space (see below) | Unlocks full space programme tree |

Sector investment levels (1–5) shown as a country stat panel. Competing nations invest in the same sectors — AI tracks relative advantages and reacts (e.g. chip export bans, tech theft via covert ops).

**Megaprojects**
Large single investments with outsized long-term effects and prominent map markers:
- High-speed rail network (unlocks HSR lines on map)
- National space launch facility
- Transcontinental power grid
- Gigafactory / battery manufacturing hub
- Artificial island / coastal reclamation
- International canal (e.g. new Suez-scale project)
- Nuclear fusion research facility
- Deep sea mining operation

Megaprojects take multiple time jumps to complete, have a dedicated progress tracker in the results panel, and can be sabotaged by rival nations.

### Space Programme

Unlocked by investing in the Space sector. Operates as a separate tech tree gated by era and research points:

**Tier 1 — Early Space (available from 1945 era onward)**
- Launch first satellite (Sputnik-equivalent) — boosts Tech, triggers global reaction
- Crewed orbital mission
- Weather / spy satellite network (passive intel bonus each turn)

**Tier 2 — Deep Space Exploration**
- Lunar flyby / lunar orbit mission
- Mars probe / rover
- Space telescope

**Tier 3 — Colonisation & Exploitation**
- Crewed Moon landing
- Permanent Moon base — generates Research Points per turn, new map layer showing lunar territory
- Mars colonisation mission — long multi-turn project, high RP cost, massive prestige
- Orbital space station — enables joint research with allied nations

**Tier 4 — Resource Extraction**
- Asteroid mining programme — targets near-Earth asteroids, returns rare materials boosting specific sectors (microchips, batteries, defence)
- Helium-3 mining on Moon — unlocks fusion energy research bonus
- Space-based solar power — clean energy stat bonus

Other nations run parallel space programmes (AI-driven). A space race dynamic emerges naturally — being first to the Moon or Mars generates large global prestige bonuses and unlocks exclusive diplomatic options ("Space Cooperation Treaty"). NPC nations can also invite you into joint programmes.

### Urban Development

**Skyscrapers & City Growth**
- Invest in high-density urban zones — skyscraper districts, CBDs, mixed-use towers
- Appears as a density indicator on city dots (small bar showing urban tier 1–5)
- Higher urban density = GDP boost, population growth, but housing cost pressure

**Undersea Tunnels**
- Build tunnel connections between landmasses (e.g. Channel Tunnel equivalent, Strait of Gibraltar crossing, Bering Strait tunnel)
- Rendered on the map as a distinct dashed undersea line between two coastal city dots
- Requires bilateral agreement with the other country if it crosses foreign territory
- Massively boosts trade and GDP for both connected nations

**Strategic Passage Control**
- Certain sea passages are strategically significant: Strait of Hormuz, Strait of Malacca, Suez Canal, Panama Canal, Bosporus, Strait of Gibraltar, Bab-el-Mandeb
- If your country controls the adjacent territory, you can:
  - Charge tolls (generates passive income per turn)
  - Block passage to specific nations (acts as an economic weapon — triggers major diplomatic fallout)
  - Allow or deny military transit
- Other nations can challenge blockades militarily or through the UN

### Laws & Legislation

Laws are passed as actions and take effect from the next time jump. Each law affects stats and triggers AI-driven domestic and international reactions.

**Economic Laws**
- Minimum wage (level 1–5: sets wage floor — boosts Approval, slight GDP drag)
- Workers' rights act (union protections, working hours limits — Approval up, business investment slightly down)
- Foreign investment incentives / restrictions
- Nationalisation laws (see Nationalisation below)
- Tax reform (progressive / flat / corporate rate changes)

**Social Laws**
- Equality acts (gender, racial, LGBTQ+ protections — Approval split depending on country's political profile)
- Education reform acts (mandate subjects, free university, compulsory attendance)
- Healthcare acts (universal healthcare, private insurance mandates)

**Environmental Laws**
- Emissions standards and carbon taxes
- Deforestation bans / logging restrictions
- Marine protected area declarations
- Plastic bans, recycling mandates

**Architectural & Heritage Laws**
- Heritage preservation act: designates historic districts — prevents demolition, maintains cultural identity, boosts tourism
- Architectural style act: new buildings in certain cities must conform to a defined aesthetic (Parisian Haussmann, Japanese machiya, Brutalist, etc.) — AI describes outcomes and tourist/resident reactions
- Green building standards: all new construction must meet energy efficiency targets

### Environment & Land Management

**Reforestation & Deforestation**
- Plant forests / create forest corridors between regions — improves climate stat, biodiversity, long-term GDP from timber
- Chop down forests for farmland, industry, or resources — short-term GDP gain, climate stat penalty, international criticism
- Both appear as land-use changes on the map (subtle colour overlay on affected regions)

**Desertification & Land Restoration**
- Combat desertification: fund the Great Green Wall equivalent, plant drought-resistant vegetation — long-term land recovery project
- Desert agriculture investment: drip irrigation systems, drought-resistant crop programmes — unlocks food production in arid zones

**Desalination Plants**
- Build coastal desalination infrastructure — counters water scarcity, enables agriculture in arid coastal regions
- Appears as a distinct map dot (cyan, near coast)
- High energy cost — pairs well with renewable energy investment

**National Parks & Nature Corridors**
- Declare national parks — locks land from development, boosts tourism and Approval, generates soft power internationally
- Nature corridors: connect two national parks or forest regions, allows wildlife migration — biodiversity stat bonus
- Both shown as a green overlay region on the map distinct from country fill colour

### Agriculture

- General agriculture investment: improve crop yields, modernise farming, food security
- Desert agriculture: specialised investment for arid-zone food production (requires desalination or irrigation)
- Vertical farming / urban agriculture: high-tech food production in cities
- Agricultural export programme: negotiate food export contracts (generates trade income)
- GMO research and rollout (boosts yields, controversial — Approval split)
- Affects: food security stat, population health, GDP, export revenues

### Data Centres & Digital Infrastructure

- Build national data centres: boosts tech sector output, enables AI research, attracts tech companies
- Sovereign cloud infrastructure: government data independence (intelligence/security bonus)
- Subsea cable networks: connect to other nations' internet infrastructure (trade and intel bonus; can be severed as a covert action)
- Appears on map as a Telecom Grid Node variant dot with a distinct badge

### Education Investment

Player can promote specific fields of education, shifting the country's talent pipeline over time:

| Field | Long-term Effect |
|---|---|
| Nuclear Science | Unlocks nuclear power + weapons research faster |
| Artificial Intelligence | Tech sector bonus, AI-driven economic productivity |
| Healthcare / Medicine | Population health stat, pandemic resilience, pharma exports |
| Engineering | Infrastructure build speed and quality |
| Agriculture | Food security, desert agriculture unlocks |
| Military Science | Military strength growth rate |
| Finance & Economics | GDP growth rate, banking sector |
| Arts & Culture | Soft power, tourism, Approval |

Education investments take multiple turns to yield results. NPC nations invest in competing fields — AI may trigger talent poaching between nations.

### Foreign Investment & Talent

**Attracting Foreign Investment**
- Offer tax incentives, free trade zones, special economic zones (SEZ)
- Investment-friendly legal reforms (intellectual property protection, contract law)
- Invite specific industries: "Attract semiconductor manufacturers to set up fabs here"
- Generates GDP boost but may trigger pushback from rival nations ("unfair subsidies")

**Attracting Foreign Talent**
- Offer skilled worker visas, golden visa programmes, research fellowships
- Target specific nationalities or skill sets: "Encourage German engineers to relocate", "Offer asylum to Iranian nuclear scientists"
- Brain drain effect on source countries — can trigger diplomatic complaints
- Boosts Research Points and relevant sector levels over time

### Nationalisation

Player can nationalise any key resource or sector within their territory:
- **What can be nationalised**: oil fields, mining operations, telecommunications, railways, banks, utilities, pharmaceutical companies, tech companies
- **Effect**: immediate GDP and sector control boost, but triggers foreign investor reactions (capital flight risk), possible diplomatic fallout if foreign-owned assets are seized, Approval impact depends on domestic political leaning
- **Partial nationalisation**: take a controlling stake rather than full seizure — milder reactions
- **Denationalisation / privatisation**: sell state assets to raise capital or improve relations with market-economy nations

Nationalised industries appear with a distinct state-ownership badge on their infrastructure dot info card.

### Culture, Arts & Entertainment

Culture generates **Soft Power** — a stat that influences diplomacy, foreign talent attraction, tourism, and other nations' willingness to cooperate. AI nations react to your cultural dominance or decline.

**Sports Infrastructure & Investment**
- Build stadiums, training academies, national sports institutes
- Fund national teams across sports (football, athletics, swimming, rugby, cricket, basketball, etc.)
- Invest in grassroots sport programmes (boosts Approval, long-term talent pipeline)
- Host domestic leagues — generates ongoing GDP and Approval

**Bidding for Major Events**
Player can bid to host international events:

| Event | Requirements | Effects |
|---|---|---|
| FIFA World Cup | Stadium network, airports, hotels | Massive GDP spike, Soft Power boost, global visibility |
| Olympic Games | Multi-sport facilities, transport, security | Huge construction investment, Approval boost, prestige |
| Commonwealth Games | Sporting infrastructure, commonwealth membership | Moderate boost, strengthen Commonwealth ties |
| Rugby / Cricket World Cup | Sport-specific stadia | Regional soft power, GDP boost |
| Formula 1 Grand Prix | Circuit infrastructure | Tourism, prestige, tech sector interest |
| Expo / World's Fair | Convention centres, transport | Innovation showcase, trade deal catalyst |

Bidding is resolved by the AI based on your infrastructure level, diplomatic standing with the governing body's member nations, and rival bids from other countries. Events can be awarded to NPC nations independently. Hosting poorly (security incidents, corruption scandals) damages Approval and Soft Power.

**Cinema, Television & Gaming**

- **Film industry investment**: fund national film studios, co-production treaties with other nations, tax incentives for foreign productions filming on your soil
- **Film festival**: establish or bid to host a prestigious festival (Cannes equivalent) — ongoing annual Soft Power boost, tourism draw
- **Award show**: create a national or international award ceremony — prestige, cultural influence
- **Television**: invest in national broadcasting, streaming platforms, media exports — cultural reach stat
- **Gaming industry**: fund game development studios, esports arenas, host international esports tournaments — boosts tech sector interest, youth Approval, exports
- **Cultural export programme**: actively promote your language, music, cuisine, and art internationally — think French cultural diplomacy, Korean Wave (Hallyu), Hollywood

**Cultural Infrastructure Dots**
New dot types added to the map (visible at mid/close zoom):

| Type | Colour |
|---|---|
| Stadium / Sports Complex | Coral `#f97316` |
| Concert Hall / Arts Centre | Magenta `#d946ef` |
| Film Studio / Media Hub | Pink `#ec4899` |

**Cultural Laws & Policies**
- Language protection act: mandate national language use in media and commerce (Approval split, Soft Power boost domestically, friction with minorities)
- Arts funding act: state subsidy for arts and culture — boosts cultural output, mild GDP cost
- Content regulations: restrict foreign media (boosts domestic industry, diplomatic friction) or open market (boosts Approval, reduces domestic industry)
- Sports doping / clean sport policy: affects international standing and results

**Interaction with Diplomacy**
- Strong cultural presence unlocks "Cultural diplomacy" actions — soft influence over other nations without military or economic pressure
- Countries with aligned cultural ties are easier to form organisations with
- Cultural rivalry (e.g. US vs USSR space race equivalent in cinema) can emerge as an AI-driven world event

---

## 8. Cheat Menu

Accessible via a dedicated button (or keyboard shortcut). Contains:

**Resource cheats:**
- Max GDP / Military / Research Points / Approval instantly
- Set any stat to a specific value

**World state cheats:**
- Set relationship between any two countries (allied / neutral / hostile / at war)
- Force annexation of any territory
- Trigger any world event manually
- Skip to any year

**Reveal all:**
- Reveal all hidden infrastructure (enemy nukes, silos, intelligence agencies) globally

**Free-text console:**
- Type commands: `give_tech nuclear_weapons`, `set_relation USA hostile`, `add_money 500B`, `annex France`, `spawn_org "Steel Pact" [Germany, Italy]`
- AI interprets ambiguous commands

---

## 8. Game State & Saves

Game state is a single JSON blob saved to `saves/<name>-<timestamp>.json`:
```
{
  era, currentDate, playerCountry,
  countries: {
    [id]: {
      stats: { gdp, military, researchPoints, approval, softPower, techLevel, culturalReach },
      sectors: { defence, technology, batteries, microchips, space, ... },  // level 1–5
      infrastructure[],
      relations,
      organisations[],
      nationalisedAssets[]
    }
  },
  infrastructureMap: [ { countryId, type, lat, lng, level, nationalised } ],
  railLines: [ { from, to, type } ],
  organisations: [ { id, name, type, members[], founded } ],
  disputes: [ { id, parties[], status, history[] } ],
  spaceProgrammes: { [countryId]: { tier, completedMilestones[], activeProject, lunarBase, marsBase } },
  megaprojects: [ { countryId, type, startDate, completionDate, progress } ],
  actionHistory: [ { date, action, outcome } ]
}
```
Auto-save after every time jump. Manual save/load from the setup screen.

---

## 9. UI Layout Summary

```
┌─────────────────────────────────────────────────────────────┐
│  [☰]  Ad Astra: Historia          [Date]    [Save] [Config] │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│ ACTION PANEL │           MAPLIBRE WORLD MAP                 │
│              │         (full screen, WebGL)                 │
│ - Stats      │                                              │
│ - Type action│                                              │
│ - AI suggest │                                              │
│ - Queue list │                                              │
│              │                                              │
│ RESULTS      │                                              │
│ (post-jump)  │                                              │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  [1 Week] [1 Month] [1 Year] [⚡ Next Event]  [▶ EXECUTE]  │
└─────────────────────────────────────────────────────────────┘
```

Cheat console slides up from the bottom as an overlay.
Organisation panel accessible via a tab in the left sidebar.

---

## 10. Out of Scope (v1)

- Multiplayer
- Mobile / touch support
- Custom map mods
- 3D globe view
- Lunar / Mars surface map layer (space programme tracks progress as text/stats only in v1)
