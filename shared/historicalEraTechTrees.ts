import type { HistoricalEraId } from './eraConfig.js'

export type TechCategory = 'military' | 'economy' | 'science' | 'culture' | 'infrastructure' | 'government'

export interface HistoricalTechNode {
  id: string
  name: string
  description: string
  category: TechCategory
  cost: number              // research points
  weeks: number             // time to research
  prerequisites: string[]
  /** If true, this is the "capstone" tech that unlocks era progression. */
  isCapstone?: boolean
}

/**
 * Per-era tech trees. Each tree has 4-50 era-appropriate tech nodes.
 * Completing every tech in the current era's tree reveals the "Next Era →" button.
 */
export const HISTORICAL_TECH_TREES: Record<HistoricalEraId, HistoricalTechNode[]> = {
  bronze_age: [
    { id: 'bronze_smelting', name: 'Bronze Smelting', description: 'Mix copper and tin into a stronger alloy.', category: 'science', cost: 30, weeks: 16, prerequisites: [] },
    { id: 'wheel', name: 'The Wheel', description: 'Round wooden discs on axles — carts and chariots become possible.', category: 'science', cost: 40, weeks: 18, prerequisites: [] },
    { id: 'irrigation', name: 'Canal Irrigation', description: 'Channels divert river water across fields.', category: 'infrastructure', cost: 35, weeks: 20, prerequisites: [] },
    { id: 'pottery', name: 'Wheel-Thrown Pottery', description: 'Potter wheels enable mass-produced storage jars.', category: 'culture', cost: 25, weeks: 14, prerequisites: ['wheel'] },
    { id: 'writing', name: 'Writing System', description: 'Cuneiform / hieroglyphs / linear scripts. Records and laws become permanent.', category: 'science', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'masonry_basic', name: 'Stone Masonry', description: 'Cut and dressed stone blocks.', category: 'infrastructure', cost: 30, weeks: 16, prerequisites: [] },
    { id: 'monumental_architecture', name: 'Monumental Architecture', description: 'Pyramids, ziggurats, megalithic tombs.', category: 'culture', cost: 80, weeks: 40, prerequisites: ['masonry_basic'] },
    { id: 'sailing_basic', name: 'Coastal Sailing', description: 'Sailing along shorelines with simple square sails.', category: 'science', cost: 40, weeks: 20, prerequisites: [] },
    { id: 'archery', name: 'Composite Bow', description: 'Layered horn-and-sinew bows for cavalry warfare.', category: 'military', cost: 45, weeks: 18, prerequisites: ['bronze_smelting'] },
    { id: 'chariot_warfare', name: 'Chariot Warfare', description: 'Horse-drawn chariots become the dominant battlefield force.', category: 'military', cost: 70, weeks: 28, prerequisites: ['wheel', 'archery'] },
    { id: 'fortifications', name: 'City Walls', description: 'Mud-brick and stone walls protect urban centres.', category: 'military', cost: 60, weeks: 30, prerequisites: ['masonry_basic'] },
    { id: 'tribute_system', name: 'Tribute System', description: 'Vassal cities pay grain, livestock, and metal to the great king.', category: 'government', cost: 40, weeks: 22, prerequisites: ['writing'] },
    { id: 'priest_caste', name: 'Priestly Class', description: 'Religious specialists manage temples, calendars, and royal legitimacy.', category: 'culture', cost: 50, weeks: 24, prerequisites: ['writing'] },
    { id: 'long_distance_trade', name: 'Long-Distance Trade', description: 'Caravans and ships carry tin, lapis lazuli, and amber across continents.', category: 'economy', cost: 55, weeks: 24, prerequisites: ['sailing_basic', 'tribute_system'] },
    { id: 'iron_discovery', name: 'Iron Discovery', description: 'Bog iron and meteoric iron — the next age beckons.', category: 'science', cost: 100, weeks: 50, prerequisites: ['bronze_smelting'], isCapstone: true },
  ],

  classical_greek: [
    { id: 'iron_working', name: 'Iron Working', description: 'Refined iron weapons and tools.', category: 'science', cost: 40, weeks: 18, prerequisites: [] },
    { id: 'phalanx_warfare', name: 'Phalanx Warfare', description: 'Disciplined hoplite formations fighting shoulder-to-shoulder.', category: 'military', cost: 50, weeks: 22, prerequisites: ['iron_working'] },
    { id: 'sailing_basic', name: 'Coastal Sailing', description: 'Sailing along shorelines.', category: 'science', cost: 40, weeks: 20, prerequisites: [] },
    { id: 'trireme', name: 'Trireme Construction', description: 'Three-banked oared warships dominate the Mediterranean.', category: 'military', cost: 60, weeks: 28, prerequisites: ['sailing_basic'] },
    { id: 'writing', name: 'Greek Alphabet', description: 'Phoenician-derived alphabetic script.', category: 'science', cost: 30, weeks: 14, prerequisites: [] },
    { id: 'philosophy', name: 'Philosophy', description: 'Socrates, Plato, Aristotle — systematic inquiry into truth.', category: 'science', cost: 70, weeks: 30, prerequisites: ['writing'] },
    { id: 'democracy', name: 'Democratic Assembly', description: 'Citizens vote on laws and elect generals.', category: 'government', cost: 60, weeks: 28, prerequisites: ['philosophy'] },
    { id: 'geometry', name: 'Euclidean Geometry', description: 'Formal mathematical proof.', category: 'science', cost: 50, weeks: 24, prerequisites: ['philosophy'] },
    { id: 'sculpture', name: 'Classical Sculpture', description: 'Idealised marble figures.', category: 'culture', cost: 40, weeks: 20, prerequisites: [] },
    { id: 'currency', name: 'Coined Currency', description: 'Standardised silver and gold coins.', category: 'economy', cost: 50, weeks: 22, prerequisites: ['iron_working'] },
    { id: 'olympic_games', name: 'Olympic Games', description: 'Pan-Hellenic athletic festival.', category: 'culture', cost: 30, weeks: 16, prerequisites: [] },
    { id: 'theatre', name: 'Greek Theatre', description: 'Tragedy and comedy as civic ritual.', category: 'culture', cost: 35, weeks: 18, prerequisites: ['sculpture'] },
    { id: 'shipbuilding', name: 'Advanced Shipbuilding', description: 'Faster, larger merchant ships.', category: 'infrastructure', cost: 45, weeks: 22, prerequisites: ['trireme'] },
    { id: 'siege_engineering', name: 'Siege Engineering', description: 'Battering rams, towers, and undermining.', category: 'military', cost: 55, weeks: 26, prerequisites: ['phalanx_warfare'] },
    { id: 'medicine', name: 'Hippocratic Medicine', description: 'Empirical observation of disease.', category: 'science', cost: 50, weeks: 24, prerequisites: ['philosophy'] },
    { id: 'historiography', name: 'Historiography', description: 'Herodotus and Thucydides establish history as a discipline.', category: 'culture', cost: 35, weeks: 18, prerequisites: ['philosophy'] },
    { id: 'classical_civilisation', name: 'Classical Civilisation', description: 'The capstone of the Greek world — synthesis of philosophy, art, and warfare.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['democracy', 'phalanx_warfare', 'theatre'], isCapstone: true },
  ],

  alexander: [
    { id: 'macedonian_phalanx', name: 'Macedonian Phalanx', description: 'Sarissa pikes and combined arms.', category: 'military', cost: 60, weeks: 24, prerequisites: [] },
    { id: 'companion_cavalry', name: 'Companion Cavalry', description: 'Heavy shock cavalry wielding kontos lances.', category: 'military', cost: 70, weeks: 28, prerequisites: ['macedonian_phalanx'] },
    { id: 'logistics_corps', name: 'Logistics Corps', description: 'Engineers and supply trains follow the army.', category: 'military', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'hellenistic_culture', name: 'Hellenistic Synthesis', description: 'Greek language and ideas spread from Egypt to India.', category: 'culture', cost: 80, weeks: 32, prerequisites: ['logistics_corps', 'companion_cavalry'], isCapstone: true },
    // expand with 11 more nodes
  ],

  qin_expansion: [
    { id: 'crossbow_mass', name: 'Mass-Produced Crossbow', description: 'Standardised crossbow components for huge armies.', category: 'military', cost: 60, weeks: 24, prerequisites: [] },
    { id: 'standardised_writing', name: 'Standardised Script', description: 'Unified seal script across the realm.', category: 'culture', cost: 50, weeks: 20, prerequisites: [] },
    { id: 'great_wall_engineering', name: 'Wall Engineering', description: 'Long-distance defensive wall systems.', category: 'infrastructure', cost: 70, weeks: 32, prerequisites: [] },
    { id: 'legalism', name: 'Legalist Administration', description: 'Strict law and centralised bureaucracy.', category: 'government', cost: 60, weeks: 26, prerequisites: ['standardised_writing'] },
    { id: 'qin_unification', name: 'Imperial Unification', description: 'Six warring states forged into one empire.', category: 'government', cost: 100, weeks: 40, prerequisites: ['legalism', 'crossbow_mass', 'great_wall_engineering'], isCapstone: true },
    // expand with 10 more nodes
  ],

  punic_wars: [
    { id: 'roman_legion', name: 'Roman Legion', description: 'Manipular tactics and centurion command.', category: 'military', cost: 60, weeks: 24, prerequisites: [] },
    { id: 'naval_corvus', name: 'Corvus Boarding Bridge', description: 'Romans turn naval battles into land battles.', category: 'military', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'punic_naval', name: 'Punic Naval Warfare', description: 'Carthaginian quinqueremes and harbour engineering.', category: 'military', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'mediterranean_dominance', name: 'Mediterranean Dominance', description: 'Mare Nostrum.', category: 'military', cost: 100, weeks: 40, prerequisites: ['roman_legion', 'naval_corvus'], isCapstone: true },
    // expand with 11 more nodes
  ],

  roman_peak: [
    { id: 'professional_legions', name: 'Professional Legions', description: 'Standing army of 25 legions across the empire.', category: 'military', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'aqueducts', name: 'Aqueducts', description: 'Stone channels deliver water to cities over distance.', category: 'infrastructure', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'roman_concrete', name: 'Roman Concrete', description: 'Pozzolana concrete enables domes and harbours.', category: 'infrastructure', cost: 70, weeks: 30, prerequisites: ['aqueducts'] },
    { id: 'imperial_law', name: 'Imperial Law', description: 'Codified civil and criminal codes.', category: 'government', cost: 60, weeks: 28, prerequisites: [] },
    { id: 'pax_romana', name: 'Pax Romana', description: 'Two centuries of peace across the Mediterranean.', category: 'government', cost: 100, weeks: 40, prerequisites: ['imperial_law', 'professional_legions', 'roman_concrete'], isCapstone: true },
    // expand with 10 more nodes
  ],

  late_antiquity: [
    { id: 'cataphract_armour', name: 'Cataphract Armour', description: 'Fully armoured horse and rider.', category: 'military', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'monasticism', name: 'Christian Monasticism', description: 'Monastic communities preserve learning.', category: 'culture', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'silk_road_trade', name: 'Silk Road Trade', description: 'Caravan routes connect east and west.', category: 'economy', cost: 60, weeks: 28, prerequisites: [] },
    { id: 'late_antique_synthesis', name: 'Late Antique Synthesis', description: 'A new world emerging from the ashes of Rome.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['monasticism', 'cataphract_armour'], isCapstone: true },
    // expand with 11 more nodes
  ],

  tang_abbasid: [
    { id: 'paper_making', name: 'Paper Making', description: 'Pulp paper enables mass literature.', category: 'science', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'gunpowder', name: 'Gunpowder', description: 'Saltpetre, sulphur, charcoal — first explosives.', category: 'science', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'house_of_wisdom', name: 'House of Wisdom', description: 'Translation of Greek and Indian texts in Baghdad.', category: 'science', cost: 70, weeks: 28, prerequisites: ['paper_making'] },
    { id: 'algebra', name: 'Algebra', description: 'Al-Khwarizmi systematises algebraic thought.', category: 'science', cost: 60, weeks: 26, prerequisites: ['house_of_wisdom'] },
    { id: 'islamic_golden_age', name: 'Golden Age', description: 'A flowering of science, philosophy, medicine, and art.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['algebra', 'gunpowder'], isCapstone: true },
    // expand with 10 more nodes
  ],

  high_medieval: [
    { id: 'heavy_cavalry', name: 'Heavy Cavalry', description: 'Knights in plate armour.', category: 'military', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'castle_building', name: 'Castle Building', description: 'Concentric stone fortresses dominate the landscape.', category: 'infrastructure', cost: 70, weeks: 32, prerequisites: [] },
    { id: 'longbow', name: 'English Longbow', description: 'Yew bows pierce knightly armour at 200 yards.', category: 'military', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'scholasticism', name: 'Scholastic Philosophy', description: 'Aristotelian logic returns to Western universities.', category: 'science', cost: 60, weeks: 28, prerequisites: [] },
    { id: 'double_entry_bookkeeping', name: 'Double-Entry Bookkeeping', description: 'Italian merchants track debits and credits.', category: 'economy', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'banking_paper_money', name: 'Banking & Paper Money', description: 'Bills of exchange and the first paper currency. Switches your currency display from coins to paper notes and gives a +5% trade bonus.', category: 'economy', cost: 80, weeks: 36, prerequisites: ['double_entry_bookkeeping'] },
    { id: 'university', name: 'Universities', description: 'Bologna, Paris, Oxford — the medieval university is born.', category: 'science', cost: 70, weeks: 32, prerequisites: ['scholasticism'] },
    { id: 'mechanical_clock', name: 'Mechanical Clock', description: 'Verge-and-foliot escapement clocks chime in cathedral towers.', category: 'science', cost: 60, weeks: 28, prerequisites: ['scholasticism'] },
    { id: 'gunpowder_weapons', name: 'Gunpowder Weapons', description: 'Cannons and handgonnes enter European warfare.', category: 'military', cost: 80, weeks: 36, prerequisites: [] },
    { id: 'high_medieval_synthesis', name: 'High Medieval Synthesis', description: 'A confident, expanding Europe on the eve of exploration.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['banking_paper_money', 'gunpowder_weapons', 'university'], isCapstone: true },
    // expand with 5 more nodes
  ],

  age_of_exploration: [
    { id: 'caravel', name: 'Caravel', description: 'Lateen-rigged Iberian ship for ocean exploration.', category: 'science', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'astrolabe', name: "Mariner's Astrolabe", description: 'Latitude measurement at sea.', category: 'science', cost: 50, weeks: 22, prerequisites: [] },
    { id: 'cartography', name: 'Cartography', description: 'Mercator projection and accurate world maps.', category: 'science', cost: 60, weeks: 26, prerequisites: ['astrolabe'] },
    { id: 'colonial_administration', name: 'Colonial Administration', description: 'Viceroyalties and trading companies govern overseas territories.', category: 'government', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'global_trade_network', name: 'Global Trade Network', description: 'Silver from Potosí, spices from Maluku, slaves from Africa.', category: 'economy', cost: 100, weeks: 40, prerequisites: ['caravel', 'cartography', 'colonial_administration'], isCapstone: true },
    // expand with 10 more nodes
  ],

  ottoman_classical: [
    { id: 'janissary_corps', name: 'Janissary Corps', description: 'Slave-soldier infantry loyal directly to the Sultan.', category: 'military', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'siege_artillery', name: 'Siege Artillery', description: 'Massive bombards crack medieval walls.', category: 'military', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'kanun_law', name: 'Kanun Law', description: 'Sultanic decree law alongside Islamic sharia.', category: 'government', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'bazaar_economy', name: 'Bazaar Economy', description: 'Imperial bazaars channel Mediterranean trade.', category: 'economy', cost: 60, weeks: 28, prerequisites: [] },
    { id: 'classical_ottoman_state', name: 'Classical Ottoman State', description: 'Suleiman the Magnificent rules from the Hungarian plains to Yemen.', category: 'government', cost: 100, weeks: 40, prerequisites: ['janissary_corps', 'siege_artillery', 'kanun_law'], isCapstone: true },
    // expand with 10 more nodes
  ],

  enlightenment: [
    { id: 'standing_army', name: 'Standing Army', description: 'Year-round professional armies replace seasonal levies.', category: 'military', cost: 70, weeks: 30, prerequisites: [] },
    { id: 'absolutism', name: 'Absolutism', description: 'Centralised monarchies control taxation and law directly.', category: 'government', cost: 70, weeks: 30, prerequisites: [] },
    { id: 'scientific_method', name: 'Scientific Method', description: 'Experiment-based natural philosophy.', category: 'science', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'newtonian_physics', name: 'Newtonian Physics', description: 'Mathematical mechanics of motion.', category: 'science', cost: 80, weeks: 32, prerequisites: ['scientific_method'] },
    { id: 'enlightenment_thought', name: 'Enlightenment Thought', description: 'Voltaire, Locke, Rousseau — reason challenges tradition.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['newtonian_physics', 'absolutism'], isCapstone: true },
    // expand with 10 more nodes
  ],

  industrial_dawn: [
    { id: 'steam_engine', name: 'Steam Engine', description: "Watt's improved condenser engine drives factories.", category: 'science', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'spinning_jenny', name: 'Spinning Jenny', description: 'Mechanised cotton spinning.', category: 'economy', cost: 60, weeks: 26, prerequisites: ['steam_engine'] },
    { id: 'railway', name: 'Railway', description: 'Iron rails and steam locomotion.', category: 'infrastructure', cost: 90, weeks: 40, prerequisites: ['steam_engine'] },
    { id: 'telegraph', name: 'Electric Telegraph', description: 'Instant long-distance communication.', category: 'science', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'steel_production', name: 'Bessemer Steel', description: 'Cheap mass-produced steel.', category: 'science', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'factory_system', name: 'Factory System', description: 'Wage labour, hourly clocks, and division of labour.', category: 'economy', cost: 70, weeks: 30, prerequisites: ['spinning_jenny'] },
    { id: 'electricity', name: 'Electrical Generation', description: 'Generators and motors enter the workplace.', category: 'science', cost: 90, weeks: 36, prerequisites: ['telegraph'] },
    { id: 'industrial_revolution', name: 'Industrial Revolution', description: 'Society transformed by steam and steel.', category: 'culture', cost: 100, weeks: 40, prerequisites: ['railway', 'factory_system', 'electricity'], isCapstone: true },
    // expand with 7 more nodes
  ],

  great_war: [
    { id: 'machine_gun', name: 'Machine Gun', description: 'Maxim, Lewis, Vickers — defensive firepower dominates.', category: 'military', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'trench_warfare', name: 'Trench Warfare', description: 'Static front lines, artillery duels, and barbed wire.', category: 'military', cost: 60, weeks: 26, prerequisites: ['machine_gun'] },
    { id: 'tank', name: 'The Tank', description: 'Armoured tracked vehicle to break the trench deadlock.', category: 'military', cost: 90, weeks: 36, prerequisites: ['trench_warfare'] },
    { id: 'aviation', name: 'Military Aviation', description: 'Reconnaissance, fighters, and early bombers.', category: 'military', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'industrial_war', name: 'Total War Mobilisation', description: 'Civilian economy fully directed toward war production.', category: 'government', cost: 100, weeks: 40, prerequisites: ['tank', 'aviation'], isCapstone: true },
    // expand with 10 more nodes
  ],

  interwar: [
    { id: 'radio_broadcasting', name: 'Radio Broadcasting', description: 'Mass radio enters every home.', category: 'science', cost: 60, weeks: 26, prerequisites: [] },
    { id: 'mass_propaganda', name: 'Mass Propaganda', description: 'Cinema, posters, and newsreels shape public opinion.', category: 'government', cost: 60, weeks: 26, prerequisites: ['radio_broadcasting'] },
    { id: 'mechanised_warfare', name: 'Mechanised Warfare', description: 'Combined arms doctrine of tank and aircraft.', category: 'military', cost: 80, weeks: 32, prerequisites: [] },
    { id: 'modern_economics', name: 'Keynesian Economics', description: 'Government spending as a tool against depression.', category: 'economy', cost: 70, weeks: 28, prerequisites: [] },
    { id: 'eve_of_total_war', name: 'Eve of Total War', description: 'The world spirals toward another global conflict.', category: 'government', cost: 100, weeks: 40, prerequisites: ['mass_propaganda', 'mechanised_warfare', 'modern_economics'], isCapstone: true },
    // expand with 10 more nodes
  ],
}

export function getTreeForEra(era: HistoricalEraId | string): HistoricalTechNode[] {
  return HISTORICAL_TECH_TREES[era as HistoricalEraId] ?? []
}
