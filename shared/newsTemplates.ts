import type { HistoricalEraId } from './eraConfig.js'
import type { WorldTickEventType, NewsCategory, NewsImportance } from './types.js'

export interface EraUniqueEvent {
  id: string
  weeklyRollChance: number   // 0-1
  headline: string           // template with {country} placeholder
  body: string               // 1-2 sentence body
  category: NewsCategory
  importance: NewsImportance
  conditions?: { minTier?: number; maxTier?: number }
}

export interface EraNewsTemplate {
  baseEventWording: Partial<Record<WorldTickEventType, string[]>>
  uniqueEvents: EraUniqueEvent[]
}

export const NEWS_TEMPLATES_BY_ERA: Record<HistoricalEraId, EraNewsTemplate> = {
  bronze_age: {
    baseEventWording: {
      war_declared: ['{primary} Sends War Tablets to {target}', 'Royal Decree from {primary}: Total War on {target}'],
      trade_deal_signed: ['{primary} Exchanges Tribute Gifts with {target}', '{primary} and {target} Conclude Bronze-Tin Pact'],
      alliance_formed: ['{primary} Marries Princess to {target} Royal House'],
      coup_attempt: ['Court Conspiracy Unmasked in {primary}'],
    },
    uniqueEvents: [
      { id: 'famine', weeklyRollChance: 0.04, headline: 'Famine Strikes {country} Granaries', body: 'River floods fail; the priest-king proclaims rituals of supplication.', category: 'disaster', importance: 'major' },
      { id: 'lapis_tribute', weeklyRollChance: 0.02, headline: 'Caravan of Lapis Lazuli Reaches {country}', body: 'Trade with the Indus brings precious blue stone for the temples.', category: 'economy', importance: 'minor' },
      { id: 'ziggurat_completed', weeklyRollChance: 0.01, headline: '{country} Completes Towering Ziggurat', body: 'A new step pyramid touches the sky and astonishes neighbouring kingdoms.', category: 'culture', importance: 'major' },
      { id: 'new_dynasty', weeklyRollChance: 0.015, headline: 'New Dynasty Founded in {country}', body: 'A general overthrows the old king and proclaims a new royal line.', category: 'politics', importance: 'breaking' },
    ],
  },
  classical_greek: {
    baseEventWording: {
      war_declared: ['Assembly of {primary} Votes for War Against {target}', '{primary} Hoplites March on {target}'],
      trade_deal_signed: ['{primary} and {target} Exchange Honoured Proxenoi', '{primary} Grants Trade Privileges to {target}'],
      alliance_formed: ['{primary} Joins {target} in Sworn League'],
    },
    uniqueEvents: [
      { id: 'olympic_games', weeklyRollChance: 0.005, headline: 'Olympic Games Held — Athletes Compete for {country}', body: 'A truce holds across the Greek world for the duration of the games.', category: 'culture', importance: 'major' },
      { id: 'oracle_consulted', weeklyRollChance: 0.03, headline: '{country} Sends Envoys to Consult the Oracle at Delphi', body: 'The Pythia speaks in riddles. Diviners debate the meaning.', category: 'politics', importance: 'minor' },
      { id: 'ostracism', weeklyRollChance: 0.02, headline: 'Citizens of {country} Vote to Ostracise Prominent Figure', body: 'Pottery shards mark the votes; the loser must leave the city for ten years.', category: 'politics', importance: 'minor' },
      { id: 'philosophical_school', weeklyRollChance: 0.01, headline: 'New Philosophical School Founded in {country}', body: 'Students gather to debate ethics, nature, and the soul.', category: 'culture', importance: 'minor' },
      { id: 'naval_battle', weeklyRollChance: 0.025, headline: 'Naval Battle Fought Off {country} Coast', body: 'Triremes clash; many oarsmen drown. The victors claim mastery of the sea-lanes.', category: 'military', importance: 'major' },
    ],
  },
  alexander: {
    baseEventWording: {
      war_declared: ['{primary} Phalanx Marches Against {target}'],
    },
    uniqueEvents: [
      { id: 'macedonian_victory', weeklyRollChance: 0.03, headline: '{country} Phalanx Wins Decisive Field Battle', body: 'Sarissa pikes shatter the enemy line.', category: 'military', importance: 'major' },
      { id: 'satrap_appointed', weeklyRollChance: 0.02, headline: '{country} Appoints New Satrap of Conquered Province', body: 'A trusted Companion takes command of a distant region.', category: 'politics', importance: 'minor' },
      { id: 'cultural_fusion', weeklyRollChance: 0.015, headline: 'Greek Settlers Found New City in {country} Territory', body: 'A colonia of veterans and merchants is planted in the east.', category: 'culture', importance: 'minor' },
    ],
  },
  qin_expansion: {
    baseEventWording: {
      war_declared: ['{primary} Crossbow Armies Move on {target}'],
    },
    uniqueEvents: [
      { id: 'unification', weeklyRollChance: 0.005, headline: '{country} Annexes Rival Warring State', body: 'Centralised legalist administration replaces local rule.', category: 'politics', importance: 'breaking' },
      { id: 'wall_extension', weeklyRollChance: 0.01, headline: '{country} Extends Defensive Wall', body: 'Conscript labour adds new ramparts against the steppe.', category: 'infrastructure', importance: 'minor' },
      { id: 'standardisation', weeklyRollChance: 0.015, headline: '{country} Standardises Weights and Measures', body: 'Imperial decrees enforce uniform script, currency, and axle widths.', category: 'government', importance: 'minor' },
    ],
  },
  punic_wars: {
    baseEventWording: {
      war_declared: ['Senate of {primary} Declares Bellum Against {target}'],
      trade_deal_signed: ['{primary} and {target} Agree Foedus'],
    },
    uniqueEvents: [
      { id: 'naval_engagement', weeklyRollChance: 0.025, headline: 'Fleets Clash in {country} Waters', body: 'Quinqueremes ram and grapple; thousands of sailors are lost.', category: 'military', importance: 'major' },
      { id: 'triumph_awarded', weeklyRollChance: 0.015, headline: '{country} General Awarded Triumph', body: 'A victorious commander parades through the streets with captives and spoils.', category: 'culture', importance: 'major' },
      { id: 'mercenary_revolt', weeklyRollChance: 0.01, headline: 'Mercenary Revolt in {country} Territory', body: 'Unpaid Numidian and Iberian troops turn on their employer.', category: 'military', importance: 'major' },
    ],
  },
  roman_peak: {
    baseEventWording: {
      war_declared: ['Senate of {primary} Declares War on {target}', 'Tribunes of {primary} Pass Lex Bellum Against {target}'],
      trade_deal_signed: ['{primary} Grants Trading Rights to {target}'],
    },
    uniqueEvents: [
      { id: 'triumph_awarded', weeklyRollChance: 0.015, headline: 'Triumph Awarded to General of {country}', body: 'A victorious commander rides through the streets in a four-horse chariot.', category: 'culture', importance: 'major' },
      { id: 'gladiator_games', weeklyRollChance: 0.02, headline: '{country} Hosts Grand Gladiator Games', body: 'The mob is appeased; the senators look on approvingly.', category: 'culture', importance: 'minor' },
      { id: 'sumptuary_law', weeklyRollChance: 0.01, headline: '{country} Senate Passes Sumptuary Law', body: 'Restrictions on luxury spending and triclinium decoration take effect.', category: 'government', importance: 'minor' },
      { id: 'aqueduct_completed', weeklyRollChance: 0.008, headline: 'New Aqueduct Brings Water to {country}', body: 'Stone arches now span the valleys, delivering fresh mountain water to the city.', category: 'infrastructure', importance: 'major' },
    ],
  },
  late_antiquity: {
    baseEventWording: {
      war_declared: ['{primary} Federates March Against {target}'],
    },
    uniqueEvents: [
      { id: 'plague_outbreak', weeklyRollChance: 0.03, headline: 'Plague Strikes {country}', body: 'Ports and trade routes carry contagion across the empire.', category: 'disaster', importance: 'breaking' },
      { id: 'barbarian_raid', weeklyRollChance: 0.04, headline: 'Barbarian Raid on {country} Frontier', body: 'Federate troops are recalled to defend a breach in the limes.', category: 'military', importance: 'major' },
      { id: 'monastery_founded', weeklyRollChance: 0.02, headline: 'New Monastery Founded in {country}', body: 'Monks copy ancient texts and minister to the surrounding villages.', category: 'culture', importance: 'minor' },
    ],
  },
  tang_abbasid: {
    baseEventWording: {
      war_declared: ['Caliph of {primary} Calls Jihad Against {target}', '{primary} Imperial Edict Declares War on {target}'],
    },
    uniqueEvents: [
      { id: 'silk_caravan', weeklyRollChance: 0.025, headline: 'Silk Caravan Reaches {country} Markets', body: 'Bolts of silk, spices, and porcelain arrive from the east.', category: 'economy', importance: 'minor' },
      { id: 'translation_movement', weeklyRollChance: 0.015, headline: '{country} Scholars Translate Greek Manuscripts', body: 'Aristotle, Galen, and Ptolemy are rendered into Arabic.', category: 'science', importance: 'minor' },
      { id: 'mosque_built', weeklyRollChance: 0.01, headline: 'Grand Mosque Completed in {country}', body: 'A new place of worship rises with minaret, dome, and ablution fountains.', category: 'culture', importance: 'major' },
    ],
  },
  high_medieval: {
    baseEventWording: {
      war_declared: ['{primary} Issues Diffidatio Against {target}', 'Crown of {primary} Calls Levy Against {target}'],
      trade_deal_signed: ['{primary} Grants Charter to {target} Merchants'],
    },
    uniqueEvents: [
      { id: 'plague_outbreak', weeklyRollChance: 0.03, headline: 'Black Death Strikes {country}', body: 'Whole villages depopulated; the surviving peasantry demands higher wages.', category: 'disaster', importance: 'breaking' },
      { id: 'crusade_declared', weeklyRollChance: 0.005, headline: 'Pope Calls Crusade — {country} Knights Take the Cross', body: 'Holy warriors prepare to march east.', category: 'military', importance: 'breaking' },
      { id: 'papal_interdict', weeklyRollChance: 0.008, headline: '{country} Placed Under Papal Interdict', body: 'Sacraments suspended; the king reels from spiritual sanctions.', category: 'politics', importance: 'major' },
      { id: 'peasant_revolt', weeklyRollChance: 0.012, headline: 'Peasant Revolt Breaks Out in {country}', body: 'Manors burn and lords flee; royal troops march to restore order.', category: 'politics', importance: 'major' },
      { id: 'cathedral_completed', weeklyRollChance: 0.01, headline: 'Gothic Cathedral Consecrated in {country}', body: 'Decades of stonework end with bishops, kings, and pilgrims in attendance.', category: 'culture', importance: 'minor' },
    ],
  },
  age_of_exploration: {
    baseEventWording: {
      war_declared: ['{primary} Crown Declares War on {target}'],
    },
    uniqueEvents: [
      { id: 'new_world_landfall', weeklyRollChance: 0.01, headline: '{country} Explorer Makes Landfall in Distant Lands', body: 'Strange shores yield gold, captives, and new diseases.', category: 'science', importance: 'breaking' },
      { id: 'spice_fleet', weeklyRollChance: 0.015, headline: '{country} Spice Fleet Returns Laden', body: 'Pepper, cloves, and nutmeg arrive in port — fortunes are made overnight.', category: 'economy', importance: 'major' },
      { id: 'colonial_revolt', weeklyRollChance: 0.012, headline: 'Native Uprising Against {country} Settlers', body: 'Frontier outposts burn; viceroys send punitive expeditions.', category: 'military', importance: 'major' },
    ],
  },
  ottoman_classical: {
    baseEventWording: {
      war_declared: ['Sublime Porte of {primary} Declares Holy War on {target}', '{primary} Sultan Orders Mobilisation Against {target}'],
      trade_deal_signed: ['{primary} Grants Capitulations to {target}'],
    },
    uniqueEvents: [
      { id: 'janissary_revolt', weeklyRollChance: 0.012, headline: 'Janissary Corps Revolts in {country}', body: 'Soldiers overturn cooking pots — a sign of imminent mutiny.', category: 'politics', importance: 'major' },
      { id: 'royal_marriage', weeklyRollChance: 0.01, headline: 'Royal Marriage Sealed in {country}', body: 'A dynastic alliance binds two ruling houses.', category: 'diplomacy', importance: 'minor' },
      { id: 'siege_of_capital', weeklyRollChance: 0.005, headline: 'Siege Begins at {country} Capital', body: 'Walls are battered by giant bombards; the defenders pray for relief.', category: 'military', importance: 'breaking' },
    ],
  },
  enlightenment: {
    baseEventWording: {
      war_declared: ['{primary} Ambassador Recalled — War with {target} Imminent'],
    },
    uniqueEvents: [
      { id: 'salon_society', weeklyRollChance: 0.01, headline: 'Philosophes Gather in {country} Salon', body: 'Ideas of liberty and natural rights spread through coffeehouses and printed pamphlets.', category: 'culture', importance: 'minor' },
      { id: 'court_intrigue', weeklyRollChance: 0.015, headline: 'Court Intrigue Rocks {country} Royal Household', body: 'Mistresses, ministers, and ambassadors jockey for influence.', category: 'politics', importance: 'minor' },
      { id: 'scientific_discovery', weeklyRollChance: 0.012, headline: 'Natural Philosopher in {country} Publishes New Treatise', body: 'A new theory of gases, electricity, or astronomy circulates through Europe.', category: 'science', importance: 'minor' },
    ],
  },
  industrial_dawn: {
    baseEventWording: {
      war_declared: ['{primary} Parliament Votes War Credits Against {target}'],
    },
    uniqueEvents: [
      { id: 'factory_strike', weeklyRollChance: 0.02, headline: 'Mill Workers Strike in {country}', body: 'Loom hands walk out demanding shorter hours and safer machines.', category: 'economy', importance: 'major' },
      { id: 'stock_panic', weeklyRollChance: 0.015, headline: 'Bank Run Strikes {country} Markets', body: 'Crowds gather at the doors of failing banks. Bullion drains away.', category: 'economy', importance: 'major' },
      { id: 'telegraph_cable', weeklyRollChance: 0.01, headline: 'Submarine Telegraph Cable Lands in {country}', body: 'Messages now cross oceans in minutes.', category: 'science', importance: 'major' },
      { id: 'colonial_war', weeklyRollChance: 0.018, headline: '{country} Expeditionary Force Engages African Tribes', body: 'Maxim guns, malaria, and steamers carve out new territory.', category: 'military', importance: 'major' },
    ],
  },
  great_war: {
    baseEventWording: {
      war_declared: ['{primary} Mobilises Reservists Against {target}'],
    },
    uniqueEvents: [
      { id: 'trench_offensive', weeklyRollChance: 0.025, headline: '{country} Launches Trench Offensive', body: 'Artillery rolls forward; tens of thousands go over the top.', category: 'military', importance: 'breaking' },
      { id: 'submarine_warfare', weeklyRollChance: 0.018, headline: '{country} Submarines Sink Merchant Vessels', body: 'Unrestricted U-boat campaigns disrupt Atlantic trade.', category: 'military', importance: 'major' },
      { id: 'food_riots', weeklyRollChance: 0.015, headline: 'Food Riots Strike {country} Cities', body: 'Bread lines turn into protest marches.', category: 'politics', importance: 'major' },
    ],
  },
  interwar: {
    baseEventWording: {
      war_declared: ['{primary} Cabinet Declares Hostilities Against {target}'],
    },
    uniqueEvents: [
      { id: 'fascist_rally', weeklyRollChance: 0.012, headline: 'Mass Rally Held in {country} Capital', body: 'Uniformed paramilitaries march through the city with torches.', category: 'politics', importance: 'major' },
      { id: 'depression_crash', weeklyRollChance: 0.008, headline: '{country} Stock Exchange Crashes', body: 'Investors leap from windows. Banks shutter. Unemployment surges.', category: 'economy', importance: 'breaking' },
      { id: 'rearmament_program', weeklyRollChance: 0.02, headline: '{country} Announces Major Rearmament Program', body: 'Tanks, aircraft, and submarines roll out of factories.', category: 'military', importance: 'major' },
      { id: 'newsreel_propaganda', weeklyRollChance: 0.015, headline: 'New Government Newsreel Plays in {country} Cinemas', body: 'Slick film montages glorify the leader and warn of foreign enemies.', category: 'culture', importance: 'minor' },
    ],
  },
}

export function getEraTemplate(era: HistoricalEraId | string, eventType: WorldTickEventType): string[] {
  const tpl = NEWS_TEMPLATES_BY_ERA[era as HistoricalEraId]
  if (!tpl) return []
  return tpl.baseEventWording[eventType] ?? []
}

export function getEraUniqueEvents(era: HistoricalEraId | string): EraUniqueEvent[] {
  const tpl = NEWS_TEMPLATES_BY_ERA[era as HistoricalEraId]
  if (!tpl) return []
  return tpl.uniqueEvents
}
