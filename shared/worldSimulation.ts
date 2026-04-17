import type { CountryPersonality, Country, WorldTickEvent, WorldTickEventType, NewsCategory, NewsImportance, DiplomaticProposal } from './types.js'
import { COUNTRY_PERSONALITIES } from './countryPersonalities.js'
import { HISTORICAL_POLITIES } from './historicalPolities.js'
import { countryName } from './newsGenerator.js'
import { MODERN_COUNTRY_DATA } from './countryData.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function roll(probability: number): boolean {
  return Math.random() < probability
}

function weightedPick<T>(options: Array<{ value: T; weight: number }>): T {
  const total = options.reduce((s, o) => s + o.weight, 0)
  let r = Math.random() * total
  for (const o of options) {
    r -= o.weight
    if (r <= 0) return o.value
  }
  return options[options.length - 1].value
}

function relationKey(a: string, b: string): string {
  return [a, b].sort().join('-')
}

function getRelation(relations: Record<string, number>, a: string, b: string): number {
  return relations[relationKey(a, b)] ?? 0
}

function getPersonality(iso: string, era?: string): CountryPersonality {
  if (era) {
    const slug = iso.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const polityKey = `${era}:${slug}`
    const polity = HISTORICAL_POLITIES[polityKey]
    if (polity) return polity.personality
  }
  return COUNTRY_PERSONALITIES[iso] ?? { aggression: 30, diplomacy: 50, economicFocus: 50, stability: 50, unpredictability: 10 }
}

// ── Realism filters ──────────────────────────────────────────────────────────

/** Major / regional powers — these countries dominate global diplomacy */
const MAJOR_POWERS = new Set([
  'USA', 'CHN', 'RUS', 'GBR', 'FRA', 'DEU', 'JPN', 'IND', 'BRA', 'ITA', 'CAN', 'KOR',
  'AUS', 'ESP', 'MEX', 'TUR', 'IDN', 'SAU', 'NLD', 'CHE', 'POL',
])

/** Regional powers — significant within their continent/region */
const REGIONAL_POWERS = new Set([
  'IRN', 'ISR', 'EGY', 'ARE', 'NGA', 'ZAF', 'KEN', 'ETH', 'DZA', 'MAR',
  'PAK', 'BGD', 'VNM', 'THA', 'PHL', 'MYS', 'SGP',
  'ARG', 'COL', 'CHL', 'PER', 'VEN',
  'UKR', 'SWE', 'NOR', 'FIN', 'BEL', 'AUT', 'GRC', 'CZE', 'PRT',
  'QAT', 'KWT', 'IRQ', 'JOR',
])

/** Arms-exporting countries — only these can plausibly sell weapons */
const ARMS_EXPORTERS = new Set([
  'USA', 'RUS', 'FRA', 'CHN', 'GBR', 'DEU', 'ITA', 'KOR', 'ISR', 'ESP',
  'NLD', 'TUR', 'CHE', 'SWE', 'CAN', 'BRA', 'IND', 'JPN', 'NOR', 'POL',
])

/** Power tier — higher = more globally influential */
function powerTier(iso: string): number {
  if (MAJOR_POWERS.has(iso)) return 3
  if (REGIONAL_POWERS.has(iso)) return 2
  return 1
}

/**
 * Geographic + political compatibility score for two countries.
 * Returns a multiplier 0-1 for opportunity event probability.
 *
 * Real-world logic:
 * - Same continent → high compatibility
 * - Major powers can interact globally
 * - Major + minor: only if same continent OR existing positive relations
 * - Two minor powers from different continents: very unlikely to interact
 */
function geoPoliticalCompatibility(a: string, b: string): number {
  const dataA = MODERN_COUNTRY_DATA[a]
  const dataB = MODERN_COUNTRY_DATA[b]
  if (!dataA || !dataB) return 0.3

  const tierA = powerTier(a)
  const tierB = powerTier(b)
  const sameContinent = dataA.continent === dataB.continent
  const sameSubregion = dataA.subregion === dataB.subregion

  // Two major powers — global reach, always plausible
  if (tierA === 3 && tierB === 3) return 1.0

  // Major + regional power — plausible across regions
  if ((tierA === 3 && tierB === 2) || (tierA === 2 && tierB === 3)) {
    return sameContinent ? 1.0 : 0.6
  }

  // Major + minor power — plausible if same region, otherwise rare
  if ((tierA === 3 && tierB === 1) || (tierA === 1 && tierB === 3)) {
    if (sameSubregion) return 0.8
    if (sameContinent) return 0.5
    return 0.15  // distant minor + major: occasional aid/trade
  }

  // Two regional powers — strong if same continent
  if (tierA === 2 && tierB === 2) {
    if (sameContinent) return 0.9
    return 0.3
  }

  // Regional + minor power — only really interact in same region
  if ((tierA === 2 && tierB === 1) || (tierA === 1 && tierB === 2)) {
    if (sameSubregion) return 0.7
    if (sameContinent) return 0.4
    return 0.1
  }

  // Two minor powers — basically only interact as direct neighbors
  if (sameSubregion) return 0.5
  if (sameContinent) return 0.2
  return 0.03  // Namibia × Sri Lanka case — almost never
}

// ── Headline Templates ───────────────────────────────────────────────────────

const HEADLINES: Record<WorldTickEventType, string[]> = {
  alliance_proposed:      ['{primary} Proposes Military Alliance with {target}', '{primary} Extends Alliance Offer to {target}'],
  alliance_formed:        ['{primary} and {target} Sign Alliance Pact', 'New Alliance Formed Between {primary} and {target}'],
  alliance_dissolved:     ['{primary} Dissolves Alliance with {target}', 'Alliance Between {primary} and {target} Collapses'],
  trade_deal_proposed:    ['{primary} Proposes Trade Agreement with {target}', '{primary} Seeks Trade Deal with {target}'],
  trade_deal_signed:      ['{primary} and {target} Sign Major Trade Deal', 'Historic Trade Agreement Between {primary} and {target}'],
  trade_deal_collapsed:   ['Trade Deal Between {primary} and {target} Collapses', '{primary}-{target} Trade Agreement Falls Apart'],
  peace_talks_initiated:  ['{primary} and {target} Begin Peace Negotiations', 'Peace Talks Open Between {primary} and {target}'],
  peace_treaty_signed:    ['{primary} and {target} Sign Peace Treaty', 'Historic Peace Deal Reached Between {primary} and {target}'],
  diplomatic_incident:    ['Diplomatic Row Erupts Between {primary} and {target}', '{primary} Accuses {target} of Diplomatic Provocation'],
  embassy_recalled:       ['{primary} Recalls Ambassador from {target}', '{primary} Withdraws Diplomatic Staff from {target}'],
  sanctions_imposed:      ['{primary} Imposes Sanctions on {target}', '{primary} Announces Economic Sanctions Against {target}'],
  sanctions_lifted:       ['{primary} Lifts Sanctions on {target}', '{primary} Eases Restrictions on {target}'],
  territorial_claim:      ['{primary} Asserts Territorial Claim Against {target}', '{primary} Lays Claim to Disputed {target} Territory'],
  military_mobilisation:  ['{primary} Mobilises Forces Near {target} Border', '{primary} Deploys Troops Along {target} Frontier'],
  border_skirmish:        ['Border Clash Reported Between {primary} and {target}', '{primary} and {target} Forces Exchange Fire at Border'],
  war_declared:           ['{primary} Declares War on {target}', 'War Erupts: {primary} Launches Offensive Against {target}'],
  ceasefire:              ['{primary} and {target} Agree to Ceasefire', 'Guns Fall Silent as {primary} and {target} Halt Hostilities'],
  arms_deal:              ['{primary} Agrees Major Arms Deal with {target}', '{primary} Sells Weapons Systems to {target}'],
  military_exercise:      ['{primary} Conducts Military Exercise Near {target}', '{primary} Holds War Games Close to {target} Waters'],
  naval_standoff:         ['Naval Standoff Between {primary} and {target} in Disputed Waters', '{primary} and {target} Warships in Tense Confrontation'],
  coup_attempt:           ['Attempted Coup in {primary} Fails', 'Military Officers Stage Failed Coup in {primary}'],
  coup_success:           ['Military Seizes Power in {primary}', 'Government of {primary} Overthrown in Military Coup'],
  election_held:          ['{primary} Holds National Elections', 'Voters Go to the Polls in {primary}'],
  protests_erupt:         ['Mass Protests Erupt Across {primary}', 'Thousands Take to the Streets in {primary}'],
  reform_passed:          ['{primary} Passes Sweeping Reforms', '{primary} Government Enacts Major Policy Changes'],
  crackdown:              ['{primary} Launches Crackdown on Dissent', 'Authorities in {primary} Arrest Opposition Figures'],
  economic_crisis:        ['Economic Crisis Grips {primary}', '{primary} Economy in Freefall as Markets Crash'],
  economic_boom:          ['{primary} Experiences Economic Boom', 'Record Growth Reported in {primary} Economy'],
  separatist_movement:    ['Separatist Movement Grows in {primary}', 'Breakaway Region Declares Autonomy in {primary}'],
  leadership_change:      ['New Leader Takes Power in {primary}', 'Leadership Transition in {primary}'],
  unexpected_ultimatum:   ['{primary} Issues Ultimatum to {target}', '{primary} Demands Immediate Concessions from {target}'],
  surprise_summit:        ['{primary} and {target} Announce Surprise Summit', 'Unexpected Meeting Between {primary} and {target} Leaders'],
  defection:              ['Senior {primary} Official Defects to {target}', 'High-Ranking {primary} Diplomat Seeks Asylum in {target}'],
  intelligence_leak:      ['{primary} Intelligence Secrets Leaked by {target} Operatives', 'Spy Scandal: {target} Accused of Espionage Against {primary}'],
  humanitarian_crisis:    ['Humanitarian Crisis Deepens in {primary}', 'Aid Agencies Warn of Catastrophe in {primary}'],
}

function makeHeadline(type: WorldTickEventType, primary: string, target?: string): string {
  const templates = HEADLINES[type]
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template
    .replace(/\{primary\}/g, countryName(primary))
    .replace(/\{target\}/g, target ? countryName(target) : '')
}

// ── Event category / importance mapping ──────────────────────────────────────

function eventCategory(type: WorldTickEventType): NewsCategory {
  switch (type) {
    case 'alliance_proposed': case 'alliance_formed': case 'alliance_dissolved':
    case 'trade_deal_proposed': case 'trade_deal_signed': case 'trade_deal_collapsed':
    case 'peace_talks_initiated': case 'peace_treaty_signed':
    case 'diplomatic_incident': case 'embassy_recalled':
    case 'sanctions_imposed': case 'sanctions_lifted':
    case 'surprise_summit': case 'defection':
      return 'diplomacy'
    case 'territorial_claim': case 'military_mobilisation': case 'border_skirmish':
    case 'war_declared': case 'ceasefire': case 'arms_deal':
    case 'military_exercise': case 'naval_standoff':
      return 'military'
    case 'economic_crisis': case 'economic_boom':
      return 'economy'
    case 'coup_attempt': case 'coup_success': case 'election_held':
    case 'protests_erupt': case 'reform_passed': case 'crackdown':
    case 'separatist_movement': case 'leadership_change':
    case 'unexpected_ultimatum':
      return 'politics'
    case 'intelligence_leak':
      return 'politics'
    case 'humanitarian_crisis':
      return 'world'
    default:
      return 'world'
  }
}

function eventImportance(type: WorldTickEventType): NewsImportance {
  switch (type) {
    case 'war_declared': case 'coup_success': case 'humanitarian_crisis':
    case 'peace_treaty_signed':
      return 'breaking'
    case 'border_skirmish': case 'naval_standoff': case 'military_mobilisation':
    case 'sanctions_imposed': case 'alliance_formed': case 'coup_attempt':
    case 'economic_crisis': case 'territorial_claim': case 'unexpected_ultimatum':
    case 'separatist_movement': case 'crackdown': case 'intelligence_leak':
      return 'major'
    default:
      return 'minor'
  }
}

// ── World Tick Result ────────────────────────────────────────────────────────

export interface WorldTickResult {
  events: WorldTickEvent[]
  relationDeltas: Record<string, number>
  /** Diplomatic proposals directed at the player country, to be added to the inbox */
  proposalsForPlayer: DiplomaticProposal[]
}

// ── Core Simulation ──────────────────────────────────────────────────────────

export function worldTick(
  countries: Record<string, Country>,
  relations: Record<string, number>,
  date: string,
  existingAlliances: string[],
  playerCountryId?: string,
  era?: string,
): WorldTickResult {
  const events: WorldTickEvent[] = []
  const relationDeltas: Record<string, number> = {}
  const proposalsForPlayer: DiplomaticProposal[] = []
  const isos = Object.keys(countries)

  // Step 1 — Bilateral tension evaluation
  for (let i = 0; i < isos.length; i++) {
    for (let j = i + 1; j < isos.length; j++) {
      const a = isos[i]
      const b = isos[j]
      const rel = getRelation(relations, a, b)
      if (rel >= -20) continue

      const tensionScore = Math.abs(rel) / 100 // 0.2 to 1.0
      const pA = getPersonality(a, era)
      const pB = getPersonality(b, era)
      const avgAggression = (pA.aggression + pB.aggression) / 200 // 0-1
      // Apply geographic compatibility — distant minor powers don't have border skirmishes
      const compatibility = geoPoliticalCompatibility(a, b)
      const probability = tensionScore * avgAggression * 0.08 * compatibility

      if (!roll(probability)) continue

      // Determine stronger / weaker
      const milA = countries[a].stats.military
      const milB = countries[b].stats.military
      const stronger = milA >= milB ? a : b
      const weaker = milA >= milB ? b : a
      const pStronger = getPersonality(stronger, era)
      const pWeaker = getPersonality(weaker, era)
      const avgDiplomacy = (pA.diplomacy + pB.diplomacy) / 200
      const avgUnpredictability = (pA.unpredictability + pB.unpredictability) / 40 // 0-1

      // Weighted pick of event type
      const tensionOptions: Array<{ value: WorldTickEventType; weight: number }> = [
        { value: 'diplomatic_incident',   weight: 30 },
        { value: 'embassy_recalled',      weight: 15 },
        { value: 'sanctions_imposed',     weight: 15 * (1 + avgDiplomacy) },
        { value: 'military_mobilisation', weight: 20 * avgAggression },
        { value: 'border_skirmish',       weight: 15 * avgAggression },
        { value: 'territorial_claim',     weight: 10 * avgAggression },
        { value: 'naval_standoff',        weight: 10 * avgAggression },
        { value: 'military_exercise',     weight: 12 },
        { value: 'war_declared',          weight: 5 * tensionScore * avgAggression },
        { value: 'unexpected_ultimatum',  weight: 5 * avgUnpredictability },
        { value: 'peace_talks_initiated', weight: 10 * avgDiplomacy },
        { value: 'ceasefire',             weight: 5 * avgDiplomacy },
      ]

      const eventType = weightedPick(tensionOptions)
      const relDelta = getRelationDelta(eventType)
      const key = relationKey(a, b)
      relationDeltas[key] = (relationDeltas[key] ?? 0) + relDelta

      events.push(makeEvent(eventType, stronger, weaker, date, relDelta, countries))
    }
  }

  // Step 2 — Opportunity generation (positive relations)
  for (let i = 0; i < isos.length; i++) {
    for (let j = i + 1; j < isos.length; j++) {
      const a = isos[i]
      const b = isos[j]
      const rel = getRelation(relations, a, b)
      if (rel < 0) continue

      const pA = getPersonality(a, era)
      const pB = getPersonality(b, era)
      const avgDiplomacy = (pA.diplomacy + pB.diplomacy) / 200
      const friendliness = (rel + 50) / 150 // normalize 0-100 to ~0.33-1.0
      // Apply geographic + political realism filter — distant minor powers
      // shouldn't randomly form alliances with each other
      const compatibility = geoPoliticalCompatibility(a, b)
      const probability = avgDiplomacy * friendliness * 0.005 * compatibility

      if (!roll(probability)) continue

      // Arms deals only plausible if at least one party is an arms exporter
      const armsDealWeight = (ARMS_EXPORTERS.has(a) || ARMS_EXPORTERS.has(b)) ? 15 : 0
      // Surprise summits and alliances need both parties to be at least regional
      const tierA = powerTier(a)
      const tierB = powerTier(b)
      const summitWeight = (tierA >= 2 && tierB >= 2) ? 10 : 2
      const allianceWeight = (tierA >= 2 || tierB >= 2) ? 20 : 5

      const oppOptions: Array<{ value: WorldTickEventType; weight: number }> = [
        { value: 'trade_deal_proposed', weight: 40 },
        { value: 'alliance_proposed',   weight: allianceWeight },
        { value: 'arms_deal',           weight: armsDealWeight },
        { value: 'surprise_summit',     weight: summitWeight },
        { value: 'reform_passed',       weight: 8 },
      ]

      const eventType = weightedPick(oppOptions)
      const relDelta = getPositiveRelationDelta(eventType)
      const key = relationKey(a, b)
      relationDeltas[key] = (relationDeltas[key] ?? 0) + relDelta

      // If the player is involved in this opportunity, route it to the diplomatic
      // inbox instead of as a generic news event — the player needs to actively
      // accept or decline. Otherwise it's a third-party event.
      const playerInvolved = playerCountryId && (a === playerCountryId || b === playerCountryId)
      if (playerInvolved) {
        const fromCountry = a === playerCountryId ? b : a
        const fromName = countries[fromCountry]?.name ?? countryName(fromCountry)
        let proposalType: DiplomaticProposal['type'] = 'trade_deal'
        let message = ''
        switch (eventType) {
          case 'trade_deal_proposed':
            proposalType = 'trade_deal'
            message = `${fromName} proposes a major trade agreement. Mutual tariff reductions and preferred market access. Accepting boosts both economies but may strain relations with rivals.`
            break
          case 'alliance_proposed':
            proposalType = 'alliance'
            message = `${fromName} extends an offer of military alliance. We would defend each other in war and coordinate foreign policy. A serious commitment.`
            break
          case 'arms_deal':
            proposalType = 'arms_deal'
            message = `${fromName} offers to sell us advanced weapons systems. Strengthens our military capability but at a financial cost.`
            break
          case 'surprise_summit':
            proposalType = 'summit'
            message = `${fromName} requests an emergency summit between our leaders. Topic to be agreed upon. Improves bilateral relations.`
            break
          default:
            // Fall through to normal news event for other types
            events.push(makeEvent(eventType, a, b, date, relDelta, countries))
            continue
        }
        proposalsForPlayer.push({
          id: `prop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          date,
          fromCountry,
          type: proposalType,
          message,
          status: 'pending',
        })
      } else {
        events.push(makeEvent(eventType, a, b, date, relDelta, countries))
      }
    }
  }

  // Step 3 — Internal events (higher probabilities for a livelier world)
  for (const iso of isos) {
    const c = countries[iso]
    const p = getPersonality(iso, era)
    const { stability, approval, gdp, military } = c.stats

    // Coup attempt: stability < 25, base 4% + modifier
    if (stability < 25) {
      const coupChance = 0.04 + (25 - stability) / 300 + p.unpredictability / 300
      if (roll(coupChance)) {
        const eventType: WorldTickEventType = roll(0.3) ? 'coup_success' : 'coup_attempt'
        events.push(makeInternalEvent(eventType, iso, date))
      }
    }

    // Protests: approval < 40, base 5% + modifier
    if (approval < 40) {
      const protestChance = 0.05 + (40 - approval) / 400
      if (roll(protestChance)) {
        const eventType: WorldTickEventType = roll(0.35) ? 'crackdown' : 'protests_erupt'
        events.push(makeInternalEvent(eventType, iso, date))
      }
    }

    // Economic boom: stability > 65, moderate GDP, 2%
    if (stability > 65 && gdp > 200_000_000_000) {
      if (roll(0.02)) {
        events.push(makeInternalEvent('economic_boom', iso, date))
      }
    }

    // Economic crisis: stability < 45, 2% + unpredictability modifier
    if (stability < 45) {
      const crisisChance = 0.02 + p.unpredictability / 500
      if (roll(crisisChance)) {
        events.push(makeInternalEvent('economic_crisis', iso, date))
      }
    }

    // Separatist movement: stability < 25, 2.5%
    if (stability < 25) {
      if (roll(0.025)) {
        events.push(makeInternalEvent('separatist_movement', iso, date))
      }
    }

    // Election: democracies ~1.5% (roughly once per year)
    const govType = MODERN_COUNTRY_DATA[iso]?.governmentType ?? ''
    const isDemocratic = ['democracy', 'federal_republic', 'republic', 'constitutional_monarchy'].includes(govType)
    if (isDemocratic && roll(0.015)) {
      events.push(makeInternalEvent('election_held', iso, date))
    }

    // Leadership change: non-democracies, 0.5%
    if (!isDemocratic && roll(0.005)) {
      events.push(makeInternalEvent('leadership_change', iso, date))
    }

    // Humanitarian crisis: stability < 35, 1.5%
    if (stability < 35) {
      if (roll(0.015)) {
        events.push(makeInternalEvent('humanitarian_crisis', iso, date))
      }
    }

    // Reform: moderate stability + high approval, 1%
    if (stability > 50 && approval > 60 && roll(0.01)) {
      events.push(makeInternalEvent('reform_passed', iso, date))
    }

    // Military powers build up: high military + moderate aggression, 0.8%
    if (military > 60 && p.aggression > 40 && roll(0.008)) {
      // Pick a neighboring country for military exercise
      const neighbors = isos.filter(other => other !== iso && geoPoliticalCompatibility(iso, other) > 0.5)
      if (neighbors.length > 0) {
        const target = neighbors[Math.floor(Math.random() * neighbors.length)]
        events.push(makeEvent('military_exercise', iso, target, date, -3, countries))
        const key = relationKey(iso, target)
        relationDeltas[key] = (relationDeltas[key] ?? 0) - 3
      }
    }
  }

  // Step 4 — Chain reactions
  const chainEvents: WorldTickEvent[] = []
  for (const evt of events) {
    if (evt.type === 'war_declared' && evt.targetCountry) {
      // Neighbors may condemn or sanction
      for (const iso of isos) {
        if (iso === evt.primaryCountry || iso === evt.targetCountry) continue
        const p = getPersonality(iso, era)
        // Condemn (diplomatic_incident against aggressor) — 40% * diplomacy
        if (roll(0.4 * p.diplomacy / 100)) {
          chainEvents.push(makeEvent('diplomatic_incident', iso, evt.primaryCountry, date, -5, countries))
          const key = relationKey(iso, evt.primaryCountry)
          relationDeltas[key] = (relationDeltas[key] ?? 0) - 5
        }
        // Sanction — 15% * economicFocus
        if (roll(0.15 * p.economicFocus / 100)) {
          chainEvents.push(makeEvent('sanctions_imposed', iso, evt.primaryCountry, date, -10, countries))
          const key = relationKey(iso, evt.primaryCountry)
          relationDeltas[key] = (relationDeltas[key] ?? 0) - 10
        }
      }
    }

    if (evt.type === 'territorial_claim' && evt.targetCountry) {
      // Target's friends may show force — 25% roll
      for (const iso of isos) {
        if (iso === evt.primaryCountry || iso === evt.targetCountry) continue
        const relToTarget = getRelation(relations, iso, evt.targetCountry)
        if (relToTarget > 20 && roll(0.25)) {
          chainEvents.push(makeEvent('military_exercise', iso, evt.primaryCountry, date, -3, countries))
          const key = relationKey(iso, evt.primaryCountry)
          relationDeltas[key] = (relationDeltas[key] ?? 0) - 3
        }
      }
    }
  }

  events.push(...chainEvents)

  // Step 5 — Cap at 12 events, sorted by importance (breaking first)
  const importanceOrder: Record<NewsImportance, number> = { breaking: 0, major: 1, minor: 2 }
  events.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
  const capped = events.slice(0, 12)

  return { events: capped, relationDeltas, proposalsForPlayer }
}

// ── Event construction helpers ───────────────────────────────────────────────

function getRelationDelta(type: WorldTickEventType): number {
  switch (type) {
    case 'war_declared':          return -30
    case 'border_skirmish':       return -15
    case 'naval_standoff':        return -10
    case 'military_mobilisation': return -8
    case 'territorial_claim':     return -12
    case 'sanctions_imposed':     return -10
    case 'embassy_recalled':      return -8
    case 'diplomatic_incident':   return -5
    case 'unexpected_ultimatum':  return -10
    case 'military_exercise':     return -3
    case 'peace_talks_initiated': return 5
    case 'ceasefire':             return 10
    default:                      return -5
  }
}

function getPositiveRelationDelta(type: WorldTickEventType): number {
  switch (type) {
    case 'trade_deal_proposed': return 5
    case 'alliance_proposed':   return 8
    case 'arms_deal':           return 5
    case 'surprise_summit':     return 10
    case 'reform_passed':       return 2
    default:                    return 3
  }
}

function makeEvent(
  type: WorldTickEventType,
  primary: string,
  target: string,
  date: string,
  relDelta: number,
  countries?: Record<string, Country>,
): WorldTickEvent {
  return {
    id: uid('wt'),
    type,
    date,
    primaryCountry: primary,
    targetCountry: target,
    headline: makeHeadline(type, primary, target),
    category: eventCategory(type),
    importance: eventImportance(type),
    relationsDelta: { [relationKey(primary, target)]: relDelta },
    statChanges: getStatChanges(type, primary, target, countries),
  }
}

function makeInternalEvent(
  type: WorldTickEventType,
  country: string,
  date: string,
): WorldTickEvent {
  return {
    id: uid('wt'),
    type,
    date,
    primaryCountry: country,
    headline: makeHeadline(type, country),
    category: eventCategory(type),
    importance: eventImportance(type),
    statChanges: getInternalStatChanges(type, country),
  }
}

function getStatChanges(type: WorldTickEventType, primary: string, target: string, countries?: Record<string, Country>): WorldTickEvent['statChanges'] {
  switch (type) {
    case 'war_declared':
      return [
        { country: primary, field: 'stability', delta: -10 },
        { country: target, field: 'stability', delta: -15 },
        { country: primary, field: 'approval', delta: -5 },
        { country: target, field: 'approval', delta: 5 },
      ]
    case 'border_skirmish':
      return [
        { country: primary, field: 'stability', delta: -3 },
        { country: target, field: 'stability', delta: -3 },
      ]
    case 'sanctions_imposed': {
      const targetGdp = countries?.[target]?.stats.gdp ?? 0
      return [
        { country: target, field: 'gdp', delta: Math.round(targetGdp * -0.03) },
        { country: target, field: 'approval', delta: -3 },
      ]
    }
    case 'trade_deal_proposed':
    case 'trade_deal_signed': {
      const primaryGdp = countries?.[primary]?.stats.gdp ?? 0
      const targetGdp2 = countries?.[target]?.stats.gdp ?? 0
      return [
        { country: primary, field: 'gdp', delta: Math.round(primaryGdp * 0.01) },
        { country: target, field: 'gdp', delta: Math.round(targetGdp2 * 0.01) },
      ]
    }
    case 'alliance_proposed':
    case 'alliance_formed':
      return [
        { country: primary, field: 'softPower', delta: 3 },
        { country: target, field: 'softPower', delta: 3 },
      ]
    default:
      return []
  }
}

function getInternalStatChanges(type: WorldTickEventType, country: string): WorldTickEvent['statChanges'] {
  switch (type) {
    case 'coup_attempt':
      return [
        { country, field: 'stability', delta: -15 },
        { country, field: 'approval', delta: -10 },
      ]
    case 'coup_success':
      return [
        { country, field: 'stability', delta: -25 },
        { country, field: 'approval', delta: -20 },
        { country, field: 'military', delta: 10 },
      ]
    case 'protests_erupt':
      return [
        { country, field: 'stability', delta: -5 },
        { country, field: 'approval', delta: -5 },
      ]
    case 'crackdown':
      return [
        { country, field: 'stability', delta: 5 },
        { country, field: 'approval', delta: -10 },
        { country, field: 'softPower', delta: -5 },
      ]
    case 'economic_boom':
      return [
        { country, field: 'gdp', delta: 100_000_000_000 },
        { country, field: 'approval', delta: 5 },
      ]
    case 'economic_crisis':
      return [
        { country, field: 'gdp', delta: -200_000_000_000 },
        { country, field: 'approval', delta: -10 },
        { country, field: 'stability', delta: -5 },
      ]
    case 'separatist_movement':
      return [
        { country, field: 'stability', delta: -10 },
        { country, field: 'approval', delta: -5 },
      ]
    case 'election_held':
      return [
        { country, field: 'approval', delta: 5 },
        { country, field: 'softPower', delta: 2 },
      ]
    case 'humanitarian_crisis':
      return [
        { country, field: 'stability', delta: -8 },
        { country, field: 'approval', delta: -8 },
        { country, field: 'softPower', delta: -5 },
      ]
    case 'reform_passed':
      return [
        { country, field: 'approval', delta: 8 },
        { country, field: 'stability', delta: 3 },
        { country, field: 'softPower', delta: 3 },
      ]
    case 'leadership_change':
      return [
        { country, field: 'stability', delta: -5 },
        { country, field: 'approval', delta: -3 },
      ]
    default:
      return []
  }
}
