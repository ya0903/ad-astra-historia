import type { Dispute, NonStateActor, Era } from './types'

// ── Pre-loaded historical conflicts per era ───────────────────────────────────
// These seed the disputes and nonStateActors arrays when a new game starts.

export const ERA_DISPUTES: Record<Era, Dispute[]> = {
  '1945': [
    { id: 'ko-45', name: 'Korean Occupation Zones', parties: ['USA', 'USSR', 'KOR', 'PRK'], status: 'active', history: ['Japan surrendered Korea — US/USSR split at 38th parallel (Sep 1945)'] },
    { id: 'ic-45', name: 'First Indochina War', parties: ['FRA', 'VNM'], status: 'active', history: ['Ho Chi Minh declares independence; France seeks to reassert control (1945)'] },
    { id: 'gr-45', name: 'Greek Civil War', parties: ['GRC'], status: 'active', history: ['Communist insurgency vs government backed by UK and US (1945–1949)'] },
    { id: 'pal-45', name: 'Palestine Mandate Crisis', parties: ['GBR', 'ISR', 'PSE', 'JOR', 'EGY'], status: 'active', history: ['British mandate over Palestine; Jewish and Arab factions clash (1945–1948)'] },
    { id: 'chi-45', name: 'Chinese Civil War', parties: ['CHN', 'TWN'], status: 'active', history: ['KMT vs Communist Party of China resumes after WWII (1945)'] },
    { id: 'ind-45', name: 'Indonesian National Revolution', parties: ['IDN', 'NLD'], status: 'active', history: ['Indonesia declares independence; Netherlands attempts to retake (1945–1949)'] },
    { id: 'ber-45', name: 'Berlin Occupation Zones', parties: ['USA', 'GBR', 'FRA', 'RUS'], status: 'negotiating', history: ['Berlin divided into four occupation sectors after Nazi surrender'] },
    { id: 'irn-45', name: 'Iran Azerbaijan Crisis', parties: ['IRN', 'RUS'], status: 'active', history: ['Soviet forces remain in northern Iran; support for separatist movements (1945)'] },
  ],

  '1960s': [
    { id: 'vn-60', name: 'Vietnam War', parties: ['VNM', 'USA', 'KHM', 'LAO', 'CHN', 'RUS'], status: 'active', history: ['US escalates involvement; Gulf of Tonkin incident 1964', 'NLF (Viet Cong) insurgency ongoing in South Vietnam'] },
    { id: 'kash-60', name: 'Kashmir Dispute', parties: ['IND', 'PAK'], status: 'active', history: ['First Kashmir War 1947; Line of Control established', 'Indo-Pakistani War 1965 over Kashmir'] },
    { id: 'cuba-60', name: 'Cuban Missile Crisis', parties: ['USA', 'RUS', 'CUB'], status: 'frozen', history: ['Soviet missiles discovered in Cuba Oct 1962; 13-day standoff', 'Resolved: Soviets remove missiles; US pledges not to invade Cuba'] },
    { id: 'arab-60', name: 'Arab-Israeli Conflict', parties: ['ISR', 'EGY', 'JOR', 'SYR', 'IRQ'], status: 'active', history: ['Six-Day War June 1967 — Israel captures Sinai, Gaza, West Bank, Golan Heights'] },
    { id: 'cong-60', name: 'Congo Crisis', parties: ['COD', 'BEL', 'USA', 'RUS'], status: 'active', history: ['Congo independence 1960; Katanga secession; UN intervention', 'Mobutu coup 1965'] },
    { id: 'alg-60', name: 'Algerian Independence Aftermath', parties: ['DZA', 'FRA'], status: 'frozen', history: ['Algeria independence 1962 after brutal war', 'Mass exodus of pieds-noirs; ongoing diplomatic tensions'] },
    { id: 'brl-60', name: 'Berlin Wall', parties: ['DEU', 'USA', 'RUS'], status: 'active', history: ['Wall constructed August 1961 dividing East and West Berlin'] },
    { id: 'ys-60', name: 'Yemen Civil War', parties: ['YEM', 'EGY', 'SAU'], status: 'active', history: ['Republican coup 1962; Egypt supports republicans, Saudi Arabia backs royalists'] },
    { id: 'sn-60', name: 'Sino-Soviet Split', parties: ['CHN', 'RUS'], status: 'active', history: ['Ideological break between China and USSR; border tensions mount'] },
    { id: 'bio-60', name: 'Biafra War', parties: ['NGA'], status: 'active', history: ['Biafran secession from Nigeria 1967; devastating civil war'] },
  ],

  '1990s': [
    { id: 'gw-90', name: 'Gulf War', parties: ['IRQ', 'KWT', 'USA', 'SAU', 'GBR', 'FRA'], status: 'resolved', history: ['Iraq invades Kuwait Aug 1990; US-led coalition liberates Kuwait Feb 1991'] },
    { id: 'yug-90', name: 'Yugoslav Wars', parties: ['SRB', 'HRV', 'BIH', 'SVN', 'MKD', 'ALB'], status: 'active', history: ['Yugoslavia dissolves 1991; Slovenia, Croatia declare independence', 'Bosnian War 1992–1995; Srebrenica massacre 1995', 'Kosovo War 1998–1999'] },
    { id: 'rwa-90', name: 'Rwandan Genocide', parties: ['RWA', 'COD'], status: 'resolved', history: ['Hutu extremists kill ~800,000 Tutsi and moderate Hutu in 100 days (1994)', 'RPF takes Kinali; millions flee to DRC'] },
    { id: 'som-90', name: 'Somali Civil War', parties: ['SOM', 'USA'], status: 'active', history: ['Siad Barre ousted 1991; warlord chaos', 'Battle of Mogadishu 1993; US withdraws'] },
    { id: 'che-90', name: 'First Chechen War', parties: ['RUS', 'CHE'], status: 'active', history: ['Chechnya declares independence 1991; Russia invades Dec 1994', 'Grozny siege; massive Russian casualties; ceasefire 1996'] },
    { id: 'pal-90', name: 'Oslo Peace Process', parties: ['ISR', 'PSE'], status: 'negotiating', history: ['Oslo Accords 1993 — Arafat and Rabin shake hands', 'Palestinian Authority established in West Bank and Gaza'] },
    { id: 'kash-90', name: 'Kashmir Insurgency', parties: ['IND', 'PAK'], status: 'active', history: ['Armed insurgency begins 1989; Pakistani support alleged', 'Kargil War 1999 — Pakistan-backed forces infiltrate Indian Kashmir'] },
    { id: 'ang-90', name: 'Angolan Civil War', parties: ['AGO'], status: 'active', history: ['UNITA vs MPLA; UNITA rejects 1992 election results; war resumes', 'Diamonds fund UNITA; oil funds MPLA'] },
    { id: 'afg-90', name: 'Afghan Civil War', parties: ['AFG', 'RUS', 'USA', 'PAK'], status: 'active', history: ['Soviet withdrawal 1989; Mujahideen factions fight for Kabul', 'Taliban emerges 1994; capture Kabul 1996'] },
  ],

  '2010s': [
    { id: 'syr-10', name: 'Syrian Civil War', parties: ['SYR', 'RUS', 'USA', 'TUR', 'IRN', 'ISR', 'SAU', 'QAT'], status: 'active', history: ['Arab Spring protests 2011; Assad cracks down', 'ISIS emerges 2013; US-led coalition strikes 2014', 'Russian intervention 2015; Aleppo siege 2016'] },
    { id: 'ukr-10', name: 'Donbas Conflict', parties: ['UKR', 'RUS'], status: 'active', history: ['Euromaidan revolution 2014; Russia annexes Crimea', 'Pro-Russian separatists seize Donetsk and Luhansk', 'MH17 shot down Jul 2014; Minsk agreements 2014-2015'] },
    { id: 'yen-10', name: 'Yemeni Civil War', parties: ['YEM', 'SAU', 'UAE', 'IRN'], status: 'active', history: ['Houthi rebels seize Sanaa 2014; Saudi-led coalition intervenes 2015', 'Humanitarian catastrophe; blockade on Hodeidah port'] },
    { id: 'lib-10', name: 'Libyan Civil War', parties: ['LBY', 'USA', 'GBR', 'FRA', 'RUS', 'TUR', 'UAE'], status: 'active', history: ['NATO intervention topples Gaddafi 2011; power vacuum', 'Two rival governments; LNA vs GNA; foreign proxy war'] },
    { id: 'isis-10', name: 'War on ISIS / Islamic State', parties: ['IRQ', 'SYR', 'USA', 'RUS', 'TUR', 'IRN'], status: 'active', history: ['ISIS declares caliphate Jun 2014; controls Mosul, Raqqa', 'Coalition airstrikes; Kurdish Peshmerga and SDF on ground', 'Mosul retaken 2017; ISIS loses territory but remains active'] },
    { id: 'kash-10', name: 'Kashmir Tensions', parties: ['IND', 'PAK'], status: 'active', history: ['Mumbai attacks 2008; India-Pakistan near war', 'Uri attack 2016; Indian surgical strikes', 'Pulwama attack 2019; air skirmish over Kashmir'] },
    { id: 'scs-10', name: 'South China Sea Dispute', parties: ['CHN', 'PHL', 'VNM', 'MYS', 'BRN', 'USA'], status: 'active', history: ['China constructs artificial islands and militarises reefs', 'Permanent Court of Arbitration rules against China 2016; China rejects ruling'] },
    { id: 'afg-10', name: 'Afghan War', parties: ['AFG', 'USA', 'GBR', 'PAK', 'IRN'], status: 'active', history: ['NATO combat mission ends 2014; Taliban resurgence', 'US-Taliban Doha Agreement 2020; troop withdrawal announced'] },
    { id: 'iran-nuc-10', name: 'Iran Nuclear Crisis', parties: ['IRN', 'USA', 'ISR', 'GBR', 'FRA', 'DEU', 'RUS', 'CHN'], status: 'negotiating', history: ['Iran enriches uranium; Israel and US threaten strikes', 'JCPOA nuclear deal signed 2015 — sanctions lifted', 'US withdraws from JCPOA 2018; sanctions reimposed; Iran resumes enrichment'] },
    { id: 'nk-10', name: 'North Korea Nuclear Standoff', parties: ['PRK', 'USA', 'KOR', 'JPN', 'CHN', 'RUS'], status: 'active', history: ['North Korea conducts nuclear and ICBM tests 2017', 'Trump-Kim summits 2018-2019; no denuclearisation deal', 'Continued missile tests; sanctions in place'] },
    { id: 'isr-pal-10', name: 'Israel-Palestine Conflict', parties: ['ISR', 'PSE', 'EGY', 'JOR'], status: 'active', history: ['Operation Cast Lead 2008-09; Pillar of Defense 2012', 'Operation Protective Edge 2014 — Gaza war', 'Recurring Hamas rocket fire and Israeli airstrikes'] },
    { id: 'ven-10', name: 'Venezuelan Crisis', parties: ['VEN', 'USA', 'COL', 'BRA', 'CUB'], status: 'active', history: ['Maduro succeeds Chavez 2013; economic collapse', 'Hyperinflation; mass migration to Colombia', 'Guaidó claims interim presidency 2019; US recognises'] },
    { id: 'eth-tig-10', name: 'Ethiopia Internal Tensions', parties: ['ETH', 'ERI'], status: 'tense' as unknown as 'frozen', history: ['Border tensions with Eritrea (peace 2018)', 'Tigray TPLF political marginalisation building'] },
    { id: 'cam-10', name: 'Cameroon Anglophone Crisis', parties: ['CMR'], status: 'active', history: ['English-speaking regions protest marginalisation 2016', 'Armed separatist groups; government crackdown'] },
    { id: 'turk-kurd-10', name: 'Turkey-Kurdish Conflict', parties: ['TUR', 'SYR', 'IRQ'], status: 'active', history: ['PKK insurgency in southeast Turkey', 'Turkish operations against YPG in northern Syria 2016, 2018, 2019'] },
  ],

  'modern': [
    { id: 'rus-ukr', name: 'Russia-Ukraine War', parties: ['RUS', 'UKR', 'USA', 'GBR', 'DEU', 'FRA', 'POL'], status: 'active', history: ['Russia full-scale invasion Feb 2022; Kyiv withstands early assault', 'NATO supplies weapons; Western sanctions on Russia', 'Frontline stabilises in Donbas and Zaporizhzhia; counteroffensives'] },
    { id: 'gaz-mod', name: 'Gaza-Israel War', parties: ['ISR', 'PSE', 'LBN', 'IRN', 'USA', 'EGY', 'QAT'], status: 'active', history: ['Hamas attacks Israel Oct 7 2023; 1200 killed', 'Israel launches major Gaza offensive; Rafah ground operation', 'Hezbollah-Israel exchanges; Iran strikes Israel Apr 2024'] },
    { id: 'sdn-mod', name: 'Sudanese Civil War', parties: ['SDN'], status: 'active', history: ['SAF vs RSF para-military conflict erupts Apr 2023', 'Khartoum devastated; humanitarian crisis; millions displaced'] },
    { id: 'myn-mod', name: 'Myanmar Civil War', parties: ['MMR', 'CHN', 'USA'], status: 'active', history: ['Military coup Feb 2021; mass protests', 'PDF resistance forces vs Tatmadaw; ethnic armed groups advance', 'Brotherhood Alliance offensive 2023 captures major towns'] },
    { id: 'eth-mod', name: 'Ethiopia Tigray Aftermath', parties: ['ETH', 'ERI'], status: 'negotiating', history: ['Tigray War 2020–2022; Pretoria peace deal Nov 2022', 'Amhara conflict 2023; Fano militias vs government'] },
    { id: 'scs-mod', name: 'South China Sea Tensions', parties: ['CHN', 'PHL', 'USA', 'VNM'], status: 'active', history: ['Chinese coast guard vessels block Philippine resupply missions at Second Thomas Shoal', 'US-Philippines enhanced defence cooperation; joint patrols'] },
    { id: 'twn-mod', name: 'Taiwan Strait Crisis', parties: ['CHN', 'TWN', 'USA', 'JPN'], status: 'active', history: ['China military exercises around Taiwan Aug 2022 following Pelosi visit', 'US arms sales to Taiwan; Japan increases defence spending'] },
    { id: 'irn-mod', name: 'Iran Regional Conflict', parties: ['IRN', 'ISR', 'USA', 'SAU', 'YEM', 'IRQ', 'SYR', 'LBN'], status: 'active', history: ['Iran-Israel shadow war; direct Iran-Israel strikes Apr-Oct 2024', 'Houthi Red Sea attacks disrupt global shipping', 'Axis of Resistance — Hezbollah, Hamas, Islamic Jihad, Houthis'] },
    { id: 'sah-mod', name: 'Sahel Instability', parties: ['MLI', 'NER', 'BFA', 'RUS', 'FRA', 'USA'], status: 'active', history: ['Coups in Mali 2021, Burkina Faso 2022, Niger 2023', 'France expelled; Wagner/Africa Corps deployed', 'Alliance of Sahel States formed; ECOWAS crisis'] },
    { id: 'irn-isr-mod', name: 'Iran-Israel Direct Confrontation', parties: ['IRN', 'ISR', 'USA', 'LBN', 'SYR'], status: 'active', history: ['Iran direct missile strike on Israel Apr 2024 — first ever', 'Israel retaliatory strikes on Iranian air defences Oct 2024', 'Hezbollah-Israel war Sep-Nov 2024; Nasrallah killed'] },
    { id: 'nk-mod', name: 'North Korea Missile Tests', parties: ['PRK', 'KOR', 'USA', 'JPN', 'RUS'], status: 'active', history: ['Record number of missile tests 2022-2024', 'Kim-Putin summit 2023; military cooperation deepens', 'North Korean troops deployed to support Russia in Ukraine 2024'] },
    { id: 'ven-mod', name: 'Venezuela Election Crisis', parties: ['VEN', 'USA', 'BRA', 'COL'], status: 'active', history: ['Maduro claims victory in 2024 election; opposition disputes', 'Mass protests; international condemnation', 'Refugee crisis continues; sanctions remain'] },
    { id: 'haiti-mod', name: 'Haiti Gang Crisis', parties: ['HTI', 'USA', 'KEN'], status: 'active', history: ['Gang coalition seizes Port-au-Prince 2024', 'Prime Minister resigns; transitional council formed', 'Kenyan-led multinational security mission deployed'] },
    { id: 'kor-mod', name: 'Korean Peninsula Tensions', parties: ['KOR', 'PRK', 'USA', 'JPN', 'CHN'], status: 'tense' as unknown as 'frozen', history: ['North-South relations at lowest point in years', 'South Korea ends 2018 inter-Korean military agreement 2023'] },
    { id: 'art-mod', name: 'Arctic Resource Competition', parties: ['RUS', 'USA', 'CAN', 'NOR', 'DNK', 'CHN'], status: 'tense' as unknown as 'frozen', history: ['Climate change opens Northern Sea Route', 'Russian and Chinese military activity in Arctic increases', 'NATO Arctic exercises expand'] },
  ],

  // ── Ancient Eras ─────────────────────────────────────────────────────────
  'greek': [
    { id: 'pel-war', name: 'Peloponnesian War', parties: ['ATH', 'SPA', 'THE', 'COR'], status: 'active', history: ['Athens and Sparta clash for supremacy over Greece (431 BCE)', 'Delian League vs Peloponnesian League', 'Plague of Athens devastates the city (430 BCE)'] },
    { id: 'ath-per', name: 'Greco-Persian Tensions', parties: ['ATH', 'SPA', 'ACH'], status: 'tense' as unknown as 'frozen', history: ['Persian Wars ended with Peace of Callias (449 BCE)', 'Persian Empire still threatens Ionian Greek cities', 'Persian gold funds Greek factions'] },
    { id: 'sic-war', name: 'Sicilian Power Struggle', parties: ['SYR', 'CAR', 'ATH'], status: 'active', history: ['Carthage contests control of Sicily with Greek Syracuse', 'Athens eyes Sicily as strategic prize'] },
  ],

  'roman': [
    { id: 'par-rom', name: 'Roman-Parthian Rivalry', parties: ['ROM', 'PAR', 'ARM'], status: 'active', history: ['Armenia is a contested buffer state', 'Trajan campaigns in Mesopotamia (113-117 CE)', 'Crassus defeated at Battle of Carrhae (53 BCE) — humiliation not forgotten'] },
    { id: 'bar-raids', name: 'Germanic Border Raids', parties: ['ROM', 'GER'], status: 'active', history: ['Germanic tribes raid across the Rhine and Danube', 'Battle of Teutoburg Forest (9 CE) — three legions destroyed', 'Trajan fortifies the Danube limes'] },
    { id: 'jud-rev', name: 'Jewish Revolts', parties: ['ROM'], status: 'active', history: ['First Jewish-Roman War ended with destruction of Jerusalem (70 CE)', 'Diaspora Revolt (115-117 CE) ongoing in Egypt, Cyrene, Cyprus'] },
  ],

  'ottoman': [
    { id: 'hab-ott', name: 'Ottoman-Habsburg Wars', parties: ['OTT', 'HAB'], status: 'active', history: ['Battle of Mohács 1526 — Ottomans crush Hungary', 'Siege of Vienna 1529 — Ottoman advance into Europe halted', 'Ongoing border conflicts along the Danube'] },
    { id: 'ott-saf', name: 'Ottoman-Safavid War', parties: ['OTT', 'SAF'], status: 'active', history: ['Battle of Chaldiran 1514 — Ottomans defeat Safavids', 'Religious conflict: Sunni Ottomans vs Shia Safavids', 'Control of Mesopotamia and Azerbaijan disputed'] },
    { id: 'med-piracy', name: 'Mediterranean Piracy', parties: ['OTT', 'VEN', 'POR', 'HAB'], status: 'active', history: ['Barbary corsairs raid Christian shipping', 'Battle of Lepanto (1571) — Holy League defeats Ottoman fleet', 'Control of Mediterranean trade routes at stake'] },
  ],

  'abbasid': [
    { id: 'abb-byz', name: 'Arab-Byzantine Frontier Wars', parties: ['ABB', 'BYZ'], status: 'active', history: ['Abbasid and Byzantine forces clash along the Taurus Mountains', 'Annual summer raids (Sayfa) into Anatolia', 'Tarsus and Cilicia — contested border fortresses'] },
    { id: 'frk-abb', name: 'Frankish-Saracen Conflicts', parties: ['FRK', 'UMA'], status: 'active', history: ['Battle of Tours/Poitiers 732 — Charles Martel halts Muslim advance', 'Charlemagne campaigns across the Pyrenees', 'Umayyad Al-Andalus remains a rival power'] },
    { id: 'abb-sam', name: 'Abbasid-Samanid Rivalry', parties: ['ABB', 'SAM'], status: 'tense' as unknown as 'frozen', history: ['Samanid governors grow increasingly autonomous in Khorasan', 'Control of the Silk Road trade routes disputed', 'Tahirid then Samanid dynasty controls eastern provinces'] },
  ],

  'tang': [
    { id: 'tang-tib', name: 'Tang-Tibetan Wars', parties: ['TNG', 'TIB'], status: 'active', history: ['Tibet emerges as a major power under Songtsen Gampo', 'Battle of the Talas River 751 — Tang defeated by Abbasids and Tibetans', 'Four Garrisons of Anxi contested'] },
    { id: 'tang-tur', name: 'Tang vs Göktürk Khaganate', parties: ['TNG', 'GOK'], status: 'frozen', history: ['Tang defeats Eastern Göktürks 630 — Emperor Taizong becomes Great Khan', 'Western Türks continue to challenge Tang authority in Central Asia', 'Uyghur Khaganate replaces Göktürks as northern power'] },
    { id: 'silla-unif', name: 'Korean Unification', parties: ['SLL', 'TNG'], status: 'frozen', history: ['Silla allied with Tang to defeat Baekje (660) and Goguryeo (668)', 'Tang attempts to control Korean peninsula; Silla resists', 'Unified Silla established south of the Taedong River'] },
  ],

  'aztec': [
    { id: 'azt-tlx', name: 'Aztec-Tlaxcala Conflict', parties: ['AZT', 'TLX'], status: 'active', history: ['Tlaxcala resists Aztec Triple Alliance expansion', 'Flower Wars — ritual combat to capture sacrificial victims', 'Tlaxcala maintains independence as a thorn in Aztec side'] },
    { id: 'azt-inc', name: 'Aztec-Inca Rivalry', parties: ['AZT', 'INC'], status: 'tense' as unknown as 'frozen', history: ['Two great empires of the Americas — no direct contact but competing spheres', 'Both empires expand rapidly through the 15th century', 'Inca under Huayna Capac rules from Ecuador to Chile'] },
    { id: 'mya-frag', name: 'Maya City-State Wars', parties: ['MYA', 'AZT'], status: 'active', history: ['Maya cities of Yucatán engage in constant inter-city warfare', 'Aztec influence expands into southern Mexico', 'Chichen Itza in decline; new Maya powers emerge'] },
  ],

  'songhai': [
    { id: 'sgh-mali', name: 'Songhai-Mali Rivalry', parties: ['SGH', 'MLR'], status: 'active', history: ['Songhai conquers Timbuktu from Mali 1468 under Sunni Ali', 'Mali Empire in terminal decline; Songhai fills the power vacuum', 'Timbuktu — centre of trans-Saharan gold and salt trade'] },
    { id: 'sgh-mor', name: 'Songhai-Moroccan Tensions', parties: ['SGH', 'MOR'], status: 'tense' as unknown as 'frozen', history: ['Morocco controls Saharan salt mines vital to Songhai trade', 'Moroccan sultans eye Timbuktu gold', 'Battle of Tondibi 1591 will end Songhai Empire — but not yet'] },
    { id: 'eth-adal', name: 'Ethiopian-Adal War', parties: ['ETH', 'ABB'], status: 'active', history: ['Adal Sultanate (supported by Ottomans) pressures Christian Ethiopia', 'Imam Ahmad ibn Ibrahim al-Ghazi wages jihad against Ethiopia', 'Portuguese ally with Ethiopia against Muslim expansion'] },
  ],

  'sengoku': [
    { id: 'oda-rival', name: 'Oda Unification Wars', parties: ['ODA', 'TAK', 'UES', 'HOJ'], status: 'active', history: ['Oda Nobunaga begins conquest of Japan from Owari province', 'Battle of Okehazama 1560 — Nobunaga defeats Imagawa Yoshimoto', 'Nobunaga allies with Tokugawa Ieyasu; enemies surround him'] },
    { id: 'tak-ues', name: 'Takeda-Uesugi Rivalry', parties: ['TAK', 'UES'], status: 'active', history: ['Shingen vs Kenshin — five battles of Kawanakajima', 'Legendary rivalry between two greatest generals of Sengoku', 'Neither achieves decisive victory'] },
    { id: 'mng-jap', name: 'Ming-Japan Trade Tensions', parties: ['MIN', 'ODA', 'JOS'], status: 'tense' as unknown as 'frozen', history: ['Wako pirates (Japanese/Chinese) raid Ming and Korean coasts', 'Official trade restricted; smuggling flourishes', 'Korea acts as intermediary between Japan and China'] },
  ],
}

export const ERA_NON_STATE_ACTORS: Record<Era, NonStateActor[]> = {
  '1945': [
    { id: 'viet-minh', name: 'Viet Minh', type: 'insurgency', regions: ['VNM'], strength: 60, sponsors: ['CHN', 'RUS'] },
    { id: 'irgun', name: 'Irgun', type: 'paramilitary', regions: ['PSE'], strength: 30, sponsors: ['ISR'] },
  ],
  '1960s': [
    { id: 'viet-cong', name: 'Viet Cong / NLF', type: 'insurgency', regions: ['VNM'], strength: 70, sponsors: ['VNM', 'CHN', 'RUS'] },
    { id: 'plo', name: 'Palestine Liberation Organization', type: 'paramilitary', regions: ['PSE', 'JOR', 'LBN'], strength: 45, sponsors: ['EGY', 'SYR'] },
    { id: 'farc-proto', name: 'FARC (founded 1964)', type: 'insurgency', regions: ['COL'], strength: 20, sponsors: [] },
  ],
  '1990s': [
    { id: 'taliban-90', name: 'Taliban', type: 'paramilitary', regions: ['AFG'], strength: 65, sponsors: ['PAK'] },
    { id: 'al-qaeda-90', name: 'Al-Qaeda', type: 'terror', regions: ['AFG', 'SDN', 'YEM'], strength: 40, sponsors: [] },
    { id: 'hamas-90', name: 'Hamas', type: 'paramilitary', regions: ['PSE'], strength: 35, sponsors: ['IRN', 'QAT'] },
    { id: 'ira-90', name: 'IRA', type: 'paramilitary', regions: ['GBR', 'IRL'], strength: 25, sponsors: [] },
    { id: 'ltte-90', name: 'Tamil Tigers (LTTE)', type: 'separatist', regions: ['LKA'], strength: 50, sponsors: [] },
  ],
  '2010s': [
    { id: 'isis-10', name: 'Islamic State (ISIS/ISIL)', type: 'terror', regions: ['IRQ', 'SYR'], strength: 80, sponsors: [] },
    { id: 'hamas-10', name: 'Hamas', type: 'paramilitary', regions: ['PSE'], strength: 55, sponsors: ['IRN', 'QAT'] },
    { id: 'hezbollah-10', name: 'Hezbollah', type: 'paramilitary', regions: ['LBN', 'SYR'], strength: 70, sponsors: ['IRN'] },
    { id: 'houthi-10', name: 'Houthi Movement (Ansarallah)', type: 'insurgency', regions: ['YEM'], strength: 60, sponsors: ['IRN'] },
    { id: 'al-shabaab', name: 'Al-Shabaab', type: 'terror', regions: ['SOM', 'KEN', 'ETH'], strength: 45, sponsors: [] },
    { id: 'boko-haram', name: 'Boko Haram / ISWAP', type: 'terror', regions: ['NGA', 'NER', 'TCD', 'CMR'], strength: 50, sponsors: [] },
    { id: 'wagner-10', name: 'Wagner Group', type: 'paramilitary', regions: ['UKR', 'LBY', 'MLI', 'CAF'], strength: 65, sponsors: ['RUS'] },
  ],
  'modern': [
    { id: 'hamas-mod', name: 'Hamas', type: 'paramilitary', regions: ['PSE'], strength: 55, sponsors: ['IRN', 'QAT'] },
    { id: 'hezbollah-mod', name: 'Hezbollah', type: 'paramilitary', regions: ['LBN', 'SYR'], strength: 75, sponsors: ['IRN'] },
    { id: 'houthi-mod', name: 'Houthi Movement', type: 'insurgency', regions: ['YEM'], strength: 65, sponsors: ['IRN'] },
    { id: 'rsf-mod', name: 'Rapid Support Forces (RSF)', type: 'paramilitary', regions: ['SDN'], strength: 70, sponsors: ['UAE', 'RUS'] },
    { id: 'wagner-mod', name: 'Africa Corps (ex-Wagner)', type: 'paramilitary', regions: ['MLI', 'NER', 'BFA', 'LBY', 'CAF'], strength: 60, sponsors: ['RUS'] },
    { id: 'isis-mod', name: 'Islamic State (remnants)', type: 'terror', regions: ['IRQ', 'SYR', 'AFG', 'SAH'], strength: 35, sponsors: [] },
    { id: 'pdf-mod', name: 'Myanmar PDF', type: 'insurgency', regions: ['MMR'], strength: 50, sponsors: ['USA'] },
  ],

  'greek': [
    { id: 'hell-pirates', name: 'Aegean Pirates', type: 'paramilitary', regions: ['ATH', 'SYR'], strength: 20, sponsors: [] },
    { id: 'persian-satraps', name: 'Persian Satraps (rebel)', type: 'separatist', regions: ['ACH'], strength: 30, sponsors: ['ATH'] },
  ],

  'roman': [
    { id: 'sicarii', name: 'Sicarii (Jewish rebels)', type: 'terror', regions: ['ROM'], strength: 25, sponsors: [] },
    { id: 'parthian-nomads', name: 'Parthian Horse Archers', type: 'paramilitary', regions: ['PAR'], strength: 50, sponsors: ['PAR'] },
    { id: 'caledonian-clans', name: 'Caledonian Clans', type: 'paramilitary', regions: ['CAL'], strength: 30, sponsors: [] },
  ],

  'ottoman': [
    { id: 'barbary-corsairs', name: 'Barbary Corsairs', type: 'paramilitary', regions: ['OTT'], strength: 45, sponsors: ['OTT'] },
    { id: 'safavid-qizilbash', name: 'Qizilbash Warriors', type: 'paramilitary', regions: ['SAF'], strength: 55, sponsors: ['SAF'] },
    { id: 'cossacks', name: 'Cossack Hosts', type: 'paramilitary', regions: ['POL', 'MUS'], strength: 40, sponsors: [] },
  ],

  'abbasid': [
    { id: 'kharijites', name: 'Kharijite Rebels', type: 'insurgency', regions: ['ABB'], strength: 35, sponsors: [] },
    { id: 'ismaili', name: 'Ismaili Assassins (proto)', type: 'paramilitary', regions: ['ABB', 'SAM'], strength: 25, sponsors: [] },
    { id: 'norse-varangians', name: 'Varangian Raiders', type: 'paramilitary', regions: ['BYZ', 'KHZ'], strength: 40, sponsors: [] },
  ],

  'tang': [
    { id: 'an-lushan', name: 'An Lushan Rebels', type: 'insurgency', regions: ['TNG'], strength: 65, sponsors: [] },
    { id: 'wako-tang', name: 'Coastal Pirates', type: 'paramilitary', regions: ['TNG', 'SLL', 'NAR'], strength: 20, sponsors: [] },
    { id: 'tibetan-raiders', name: 'Tibetan Border Raiders', type: 'paramilitary', regions: ['TIB'], strength: 45, sponsors: ['TIB'] },
  ],

  'aztec': [
    { id: 'tlaxcala-warriors', name: 'Tlaxcalan Eagle Warriors', type: 'paramilitary', regions: ['TLX'], strength: 55, sponsors: ['TLX'] },
    { id: 'maya-raiders', name: 'Maya City-State Raiders', type: 'insurgency', regions: ['MYA'], strength: 30, sponsors: [] },
    { id: 'zapotec-rebels', name: 'Zapotec Resistance', type: 'separatist', regions: ['AZT'], strength: 25, sponsors: [] },
  ],

  'songhai': [
    { id: 'tuareg-raiders', name: 'Tuareg Saharan Raiders', type: 'paramilitary', regions: ['SGH', 'MLR'], strength: 40, sponsors: [] },
    { id: 'mossi-cavalry', name: 'Mossi Kingdom Raiders', type: 'paramilitary', regions: ['SGH'], strength: 35, sponsors: [] },
    { id: 'adal-jihadists', name: 'Adal Sultanate Warriors', type: 'paramilitary', regions: ['ETH'], strength: 50, sponsors: [] },
  ],

  'sengoku': [
    { id: 'ikko-ikki', name: 'Ikkō-ikki (Buddhist Rebels)', type: 'insurgency', regions: ['ODA'], strength: 55, sponsors: [] },
    { id: 'wako-pirates', name: 'Wakō Pirates', type: 'paramilitary', regions: ['MIN', 'JOS', 'ODA'], strength: 35, sponsors: [] },
    { id: 'ninja-clans', name: 'Iga & Kōka Ninja', type: 'paramilitary', regions: ['ODA', 'TAK', 'UES'], strength: 20, sponsors: [] },
  ],
}
