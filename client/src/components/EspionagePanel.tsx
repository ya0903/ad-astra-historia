import { useState } from 'react'
import { useGameStore } from '../stores'
import type { EspionageMissionType } from '@ad-astra/shared/types'

// ── Real-world agency database ─────────────────────────────────────────────
export const AGENCY_DATABASE: {
  id: string
  name: string
  shortName: string
  country: string
  iso: string
  tier: number     // 1 = global, 2 = regional, 3 = national
  focus: string
  founded: number
  icon: string
  description: string
}[] = [
  { id: 'cia',    name: 'Central Intelligence Agency',                  shortName: 'CIA',     country: 'United States', iso: 'USA', tier: 1, focus: 'HUMINT/SIGINT/Covert Ops', founded: 1947, icon: '🦅', description: 'Largest foreign intelligence service globally. Unparalleled covert action capability.' },
  { id: 'mi6',    name: 'Secret Intelligence Service (MI6)',             shortName: 'MI6',     country: 'United Kingdom', iso: 'GBR', tier: 1, focus: 'HUMINT/Covert Ops',        founded: 1909, icon: '🎩', description: 'Elite HUMINT network spanning the Commonwealth and beyond.' },
  { id: 'mossad', name: 'Institute for Intelligence and Special Ops',   shortName: 'Mossad',  country: 'Israel',         iso: 'ISR', tier: 1, focus: 'HUMINT/Targeted Ops',      founded: 1949, icon: '✡️', description: 'Renowned for precision operations. Best assassination capability, per capita.' },
  { id: 'svr',    name: 'Foreign Intelligence Service',                 shortName: 'SVR',     country: 'Russia',         iso: 'RUS', tier: 1, focus: 'HUMINT/Political Ops',      founded: 1991, icon: '🐻', description: 'Successor to KGB foreign branch. Deep cover networks in Europe and the West.' },
  { id: 'fsb',    name: 'Federal Security Service',                     shortName: 'FSB',     country: 'Russia',         iso: 'RUS', tier: 1, focus: 'Counterintel/Domestic',     founded: 1995, icon: '🔐', description: 'Domestic counter-intelligence and border security, with foreign reach.' },
  { id: 'mss',    name: 'Ministry of State Security',                   shortName: 'MSS',     country: 'China',          iso: 'CHN', tier: 1, focus: 'HUMINT/Cyber/Econ Intel',   founded: 1983, icon: '🐉', description: 'China\'s premier civilian intelligence agency. Massive cyber and economic espionage.' },
  { id: 'isi',    name: 'Inter-Services Intelligence',                  shortName: 'ISI',     country: 'Pakistan',       iso: 'PAK', tier: 2, focus: 'HUMINT/Proxy Ops',          founded: 1948, icon: '🌙', description: 'Powerful regional actor. Extensive proxy network in South Asia and Central Asia.' },
  { id: 'raw',    name: 'Research and Analysis Wing',                   shortName: 'RAW',     country: 'India',          iso: 'IND', tier: 2, focus: 'HUMINT/Regional',            founded: 1968, icon: '🦁', description: 'Primary foreign intelligence. Strong focus on Pakistan, China and South Asia.' },
  { id: 'dgse',   name: 'General Directorate for External Security',    shortName: 'DGSE',    country: 'France',         iso: 'FRA', tier: 2, focus: 'HUMINT/Africa/SIGINT',      founded: 1982, icon: '🐓', description: 'Deep African network. Covert action capability across Francophone states.' },
  { id: 'bnd',    name: 'Federal Intelligence Service',                 shortName: 'BND',     country: 'Germany',        iso: 'DEU', tier: 2, focus: 'SIGINT/Eastern Europe',      founded: 1956, icon: '🦅', description: 'Strong SIGINT and Eastern European networks. Major NATO intelligence provider.' },
  { id: 'shin_bet', name: 'Shin Bet (Shabak)',                          shortName: 'Shin Bet',country: 'Israel',         iso: 'ISR', tier: 2, focus: 'Counter-terrorism/Domestic', founded: 1948, icon: '🛡️', description: 'Internal security. Counter-terrorism expertise exported to allies worldwide.' },
  { id: 'vaja',   name: 'Ministry of Intelligence (VAJA/MOIS)',        shortName: 'VAJA',    country: 'Iran',           iso: 'IRN', tier: 2, focus: 'Regional/Proxy Ops',         founded: 1984, icon: '🦁', description: 'Manages Iran\'s proxy network across Iraq, Lebanon, Yemen and Syria.' },
  { id: 'asis',   name: 'Australian Secret Intelligence Service',       shortName: 'ASIS',    country: 'Australia',      iso: 'AUS', tier: 3, focus: 'Pacific/HUMINT',             founded: 1952, icon: '🦘', description: 'Five Eyes member. Strong Pacific and South-East Asian coverage.' },
  { id: 'csis',   name: 'Canadian Security Intelligence Service',       shortName: 'CSIS',    country: 'Canada',         iso: 'CAN', tier: 3, focus: 'Counter-terrorism/Cyber',    founded: 1984, icon: '🍁', description: 'Counterterrorism and counterintelligence. Five Eyes core member.' },
  { id: 'nis',    name: 'National Intelligence Service',                shortName: 'NIS',     country: 'South Korea',    iso: 'KOR', tier: 3, focus: 'DPRK/Regional',              founded: 1961, icon: '🌸', description: 'Deep penetration into North Korea. Strong cyber offensive capability.' },
]

const MISSION_TYPES: { type: EspionageMissionType; label: string; icon: string; desc: string; duration: string }[] = [
  { type: 'coup',           label: 'Stage Coup',         icon: '🗡️', desc: 'Destabilise and topple a foreign government',         duration: '6–18 months' },
  { type: 'tech_theft',     label: 'Steal Technology',   icon: '💾', desc: 'Extract classified R&D from a target nation',          duration: '3–9 months' },
  { type: 'fund_rebellion', label: 'Fund Rebellion',     icon: '🔥', desc: 'Finance separatist or rebel groups inside target',      duration: '12–36 months' },
  { type: 'assassination',  label: 'Assassination',      icon: '🎯', desc: 'Eliminate a foreign leader or key official',           duration: '1–6 months' },
  { type: 'sabotage',       label: 'Sabotage',           icon: '💣', desc: 'Destroy critical infrastructure or military assets',   duration: '2–8 months' },
  { type: 'disinformation', label: 'Disinformation',     icon: '📡', desc: 'Spread destabilising propaganda in target country',    duration: '6–24 months' },
  { type: 'recruit_agent',  label: 'Recruit Agent',      icon: '🕵️', desc: 'Place a double agent inside target government/military', duration: '3–12 months' },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface EspionagePanelProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

type SubView = 'overview' | 'agencies' | 'missions'

export default function EspionagePanel({ isOpen, onOpen, onClose }: EspionagePanelProps) {
  const [subView, setSubView] = useState<SubView>('overview')
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const espionage = useGameStore(s => s.state?.espionage)
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')

  const tier1 = AGENCY_DATABASE.filter(a => a.tier === 1)
  const tier2 = AGENCY_DATABASE.filter(a => a.tier === 2)
  const tier3 = AGENCY_DATABASE.filter(a => a.tier === 3)

  const tierColour = (t: number) =>
    t === 1 ? '#f59e0b' : t === 2 ? '#60a5fa' : '#94a3b8'
  const tierLabel = (t: number) =>
    t === 1 ? 'Global' : t === 2 ? 'Regional' : 'National'

  const budget = espionage?.agencyBudget ?? 0
  const agencyTier = espionage?.agencyTier ?? 1
  const operatives = espionage?.operativeCount ?? 0
  const activeMissions = espionage?.activeMissions ?? []
  const completedMissions = espionage?.completedMissions ?? []

  const formatBudget = (v: number) =>
    v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${v}`

  return (
    <div className="relative">
      <button
        onClick={() => isOpen ? onClose() : onOpen()}
        className={`w-9 h-9 rounded-full border flex items-center justify-center text-base transition-colors shadow-lg ${
          isOpen ? 'bg-slate-700/60 border-slate-400/50' : 'bg-[#0d1829]/90 border-white/10 hover:bg-white/[0.08]'
        }`}
        title="Intelligence & Espionage"
      >
        🕵️
      </button>

      {isOpen && (
        <div className="absolute bottom-11 right-0 w-80 bg-[#080f1e]/97 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 160px)' }}>

          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Intelligence</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>

          {/* Sub-navigation */}
          <div className="flex border-b border-white/[0.06] shrink-0">
            {(['overview', 'agencies', 'missions'] as SubView[]).map(v => (
              <button key={v} onClick={() => setSubView(v)}
                className={`flex-1 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  subView === v
                    ? 'text-blue-300 border-b border-blue-400 bg-blue-950/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                {v}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            {/* ── Overview ── */}
            {subView === 'overview' && (
              <div className="p-4 space-y-4">
                {!espionage ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-xs mb-3">No intelligence agency established.</p>
                    <p className="text-gray-600 text-[10px]">Use the AI action panel to establish an intelligence service.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider">Agency Tier</p>
                        <p className="text-lg font-bold text-amber-400 mt-0.5">{agencyTier}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider">Budget</p>
                        <p className="text-sm font-bold text-blue-300 mt-0.5">{formatBudget(budget)}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider">Operatives</p>
                        <p className="text-lg font-bold text-green-400 mt-0.5">{operatives}</p>
                      </div>
                    </div>
                    {activeMissions.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Active Missions</p>
                        <div className="space-y-1.5">
                          {activeMissions.map(m => {
                            const mInfo = MISSION_TYPES.find(t => t.type === m.type)
                            return (
                              <div key={m.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                                <span className="text-base">{mInfo?.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-white font-medium">{mInfo?.label}</p>
                                  <p className="text-[9px] text-gray-500">Target: {m.targetIso}</p>
                                </div>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                  m.status === 'active' ? 'bg-blue-500/20 text-blue-300' :
                                  m.status === 'planning' ? 'bg-gray-500/20 text-gray-300' :
                                  'bg-amber-500/20 text-amber-300'
                                }`}>{m.status}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {completedMissions.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                          Completed ({completedMissions.length})
                        </p>
                        <div className="space-y-1">
                          {completedMissions.slice(-3).reverse().map(m => {
                            const mInfo = MISSION_TYPES.find(t => t.type === m.type)
                            return (
                              <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] border border-white/[0.03]">
                                <span className="text-sm">{mInfo?.icon}</span>
                                <span className="text-[9px] text-gray-400 flex-1 min-w-0 truncate">{mInfo?.label} → {m.targetIso}</span>
                                <span className={`text-[9px] font-semibold ${
                                  m.status === 'success' ? 'text-green-400' :
                                  m.status === 'blown' ? 'text-red-400' : 'text-amber-400'
                                }`}>{m.status}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-white/[0.05]">
                      <p className="text-[9px] text-gray-600">Counter-intel level: {espionage.counterIntelLevel}/100</p>
                      {espionage.detectedBy?.length > 0 && (
                        <p className="text-[9px] text-amber-400 mt-0.5">⚠ Detected by: {espionage.detectedBy.join(', ')}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Agencies ── */}
            {subView === 'agencies' && (
              <div className="p-3 space-y-3">
                <p className="text-[9px] text-gray-600 leading-relaxed">Real-world intelligence agencies ranked by global reach and operational capability.</p>
                {[1, 2, 3].map(tier => (
                  <div key={tier}>
                    <button
                      onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                      className="w-full flex items-center justify-between py-1.5 mb-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${tierColour(tier)}20`, color: tierColour(tier) }}>
                          T{tier}
                        </span>
                        <span className="text-[10px] text-gray-300 font-medium">{tierLabel(tier)} Agencies</span>
                      </div>
                      <span className="text-[9px] text-gray-600">{selectedTier === tier ? '▲' : '▼'}</span>
                    </button>
                    {selectedTier === tier && (
                      <div className="space-y-2">
                        {(tier === 1 ? tier1 : tier === 2 ? tier2 : tier3).map(a => (
                          <div key={a.id} className={`px-3 py-2.5 rounded-lg border ${
                            a.iso === playerCountryId.toUpperCase()
                              ? 'border-blue-500/30 bg-blue-900/10'
                              : 'border-white/[0.06] bg-white/[0.02]'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{a.icon}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-white font-semibold">{a.shortName}</span>
                                <span className="text-[9px] text-gray-500 ml-1.5">{a.country}</span>
                              </div>
                              <span className="text-[9px] text-gray-600">est. {a.founded}</span>
                            </div>
                            <p className="text-[9px] text-gray-500">{a.focus}</p>
                            <p className="text-[9px] text-gray-600 mt-0.5 leading-relaxed">{a.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Missions ── */}
            {subView === 'missions' && (
              <div className="p-3 space-y-2">
                <p className="text-[9px] text-gray-600 leading-relaxed mb-3">
                  Queue covert operations through the Free Action tab. Describe the mission and AI will execute it as a covert op.
                </p>
                {MISSION_TYPES.map(m => (
                  <div key={m.type} className="px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base">{m.icon}</span>
                      <span className="text-[10px] text-white font-semibold">{m.label}</span>
                      <span className="ml-auto text-[9px] text-gray-600">{m.duration}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 ml-6">{m.desc}</p>
                  </div>
                ))}
                <div className="mt-3 px-3 py-2 rounded-lg bg-amber-900/10 border border-amber-600/20">
                  <p className="text-[9px] text-amber-400 leading-relaxed">
                    💡 To launch a mission: type e.g. "Have the CIA stage a coup in Venezuela" in the Free Action tab.
                    Mission success depends on your agency tier, budget, and target country's counter-intel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
