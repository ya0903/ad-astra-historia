// Real-world intelligence agency lookup, keyed by ISO_A3 country code.
// Used by the Intelligence panel for read-only reference alongside
// the player's created IntelAgency list in state.espionage.agencies.

export type RealAgencyRank = 'local' | 'regional' | 'global'

export interface RealAgency {
  name: string
  rank: RealAgencyRank
  hint: string
}

export const REAL_AGENCIES: Record<string, RealAgency[]> = {
  USA: [
    { name: 'CIA',  rank: 'global',   hint: 'Foreign HUMINT, covert action worldwide' },
    { name: 'NSA',  rank: 'global',   hint: 'Global SIGINT and cyber collection' },
    { name: 'FBI',  rank: 'regional', hint: 'Domestic security, counter-intelligence' },
    { name: 'DIA',  rank: 'regional', hint: 'Defence intelligence, military HUMINT' },
  ],
  GBR: [
    { name: 'MI6 (SIS)', rank: 'global',   hint: 'Foreign intelligence, Commonwealth reach' },
    { name: 'GCHQ',      rank: 'global',   hint: 'SIGINT, cyber, Five Eyes core' },
    { name: 'MI5',       rank: 'regional', hint: 'Domestic security service' },
  ],
  RUS: [
    { name: 'FSB', rank: 'global', hint: 'Internal security and foreign ops' },
    { name: 'SVR', rank: 'global', hint: 'Foreign intelligence (post-KGB)' },
    { name: 'GRU', rank: 'global', hint: 'Military intelligence, spetsnaz' },
  ],
  CHN: [
    { name: 'MSS', rank: 'global',   hint: 'Civilian foreign & domestic intel' },
    { name: 'MPS', rank: 'regional', hint: 'Public security, surveillance' },
  ],
  PAK: [
    { name: 'ISI', rank: 'regional', hint: 'Inter-Services Intelligence, proxy ops' },
  ],
  IND: [
    { name: 'RAW', rank: 'regional', hint: 'Research & Analysis Wing, foreign intel' },
    { name: 'IB',  rank: 'regional', hint: 'Intelligence Bureau, domestic' },
  ],
  ISR: [
    { name: 'Mossad',   rank: 'global',   hint: 'Foreign intel, targeted operations' },
    { name: 'Shin Bet', rank: 'regional', hint: 'Internal security service' },
  ],
  FRA: [{ name: 'DGSE', rank: 'regional', hint: 'External security, African reach' }],
  DEU: [{ name: 'BND',  rank: 'regional', hint: 'Federal foreign intelligence' }],
  JPN: [{ name: 'PSIA', rank: 'regional', hint: 'Public Security Intelligence' }],
  IRN: [{ name: 'MOIS', rank: 'regional', hint: 'Ministry of Intelligence, proxy networks' }],
  KOR: [{ name: 'NIS',  rank: 'regional', hint: 'National Intelligence Service, DPRK focus' }],
  EGY: [{ name: 'GID',  rank: 'regional', hint: 'General Intelligence Directorate' }],
  SAU: [{ name: 'GID',  rank: 'regional', hint: 'General Intelligence Presidency' }],
  TUR: [{ name: 'MIT',  rank: 'regional', hint: 'Millî İstihbarat Teşkilatı' }],
}
