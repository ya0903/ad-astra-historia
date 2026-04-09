import { useState, useMemo } from 'react'
import { useGameStore } from '../stores'
import { REAL_AGENCIES } from '@ad-astra/shared/intelAgencies'
import { prompt as uiPrompt } from './ModalHost'
import type { IntelMissionType, IntelAgency } from '@ad-astra/shared/types'

interface EspionagePanelProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

type Tab = 'overview' | 'missions' | 'rankings'

const MISSION_TYPES: IntelMissionType[] = [
  'infiltration', 'sabotage', 'assassination', 'cyber', 'surveillance', 'extraction', 'propaganda',
]

const RANK_COLOURS: Record<string, string> = {
  local: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  regional: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  global: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

function RankBadge({ rank }: { rank: 'local' | 'regional' | 'global' }) {
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${RANK_COLOURS[rank]}`}>
      {rank}
    </span>
  )
}

function Slider({ label, value, colour, onChange }: {
  label: string; value: number; colour: string; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400">{label}</span>
        <span className="text-[10px] font-mono" style={{ color: colour }}>{value}</span>
      </div>
      <input
        type="range" min={0} max={100} step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer"
        style={{ accentColor: colour }}
      />
    </div>
  )
}

function AgencyCard({ agency }: { agency: IntelAgency }) {
  const setFunding = useGameStore(s => s.setAgencyFunding)
  const setCorruption = useGameStore(s => s.setAgencyCorruption)
  const setEfficiency = useGameStore(s => s.setAgencyEfficiency)
  return (
    <div className="px-3 py-2.5 rounded-lg border border-blue-500/20 bg-blue-900/10 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white font-semibold flex-1 min-w-0 truncate">{agency.name}</span>
        <RankBadge rank={agency.rank} />
      </div>
      <div className="flex justify-between text-[9px] text-gray-500">
        <span>Founded {agency.founded}</span>
        <span className="text-green-400">✓ {agency.successfulMissions}</span>
        <span className="text-red-400">✗ {agency.failedMissions}</span>
      </div>
      <Slider label="Funding" value={agency.funding} colour="#22c55e" onChange={v => setFunding(agency.id, v)} />
      <Slider label="Corruption" value={agency.corruption} colour="#f59e0b" onChange={v => setCorruption(agency.id, v)} />
      <Slider label="Efficiency" value={agency.efficiency} colour="#60a5fa" onChange={v => setEfficiency(agency.id, v)} />
    </div>
  )
}

export default function EspionagePanel({ isOpen, onOpen, onClose }: EspionagePanelProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const state = useGameStore(s => s.state)
  const createIntelAgency = useGameStore(s => s.createIntelAgency)
  const startMission = useGameStore(s => s.startMission)

  const playerIso = state?.playerCountryId ?? ''
  const [selectedIso, setSelectedIso] = useState<string>(playerIso)
  const [countrySearch, setCountrySearch] = useState('')

  // Mission form
  const [mAgency, setMAgency] = useState('')
  const [mType, setMType] = useState<IntelMissionType>('infiltration')
  const [mDifficulty, setMDifficulty] = useState(5)
  const [mTargetIso, setMTargetIso] = useState<string | undefined>(undefined)
  const [mTargetName, setMTargetName] = useState<string | undefined>(undefined)
  const [targetModal, setTargetModal] = useState(false)
  const [targetTab, setTargetTab] = useState<'country' | 'custom'>('country')
  const [targetSearch, setTargetSearch] = useState('')
  const [customTarget, setCustomTarget] = useState('')

  const countries = useMemo(() => {
    if (!state) return [] as { iso: string; name: string }[]
    return Object.values(state.countries).map(c => ({ iso: c.id, name: c.name }))
  }, [state])

  const filteredCountries = useMemo(() =>
    countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 100),
    [countries, countrySearch])

  const filteredTargetCountries = useMemo(() =>
    countries.filter(c => c.name.toLowerCase().includes(targetSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 80),
    [countries, targetSearch])

  const allAgencies = state?.espionage?.agencies ?? []
  const activeMissions = state?.espionage?.activeMissions ?? []
  const selectedName = state?.countries[selectedIso]?.name ?? selectedIso
  const ownedAgencies = allAgencies.filter(a => a.ownerIso === selectedIso)
  const realAgencies = REAL_AGENCIES[selectedIso.toUpperCase()] ?? []

  const handleCreate = async (iso: string) => {
    const name = await uiPrompt({ title: 'Name your new agency', placeholder: 'e.g. Bureau of State Security' })
    if (name && name.trim()) createIntelAgency(iso, name.trim())
  }

  const handleStartMission = () => {
    if (!mAgency) return
    startMission(mAgency, mType, { targetIso: mTargetIso, targetName: mTargetName, difficulty: mDifficulty })
    setMTargetIso(undefined); setMTargetName(undefined)
  }

  return (
    <div className="relative">
      <button
        onClick={() => isOpen ? onClose() : onOpen()}
        className={`w-9 h-9 rounded-full border flex items-center justify-center text-base transition-colors shadow-lg ${
          isOpen ? 'bg-purple-700/60 border-purple-500/50' : 'bg-[#0d1829]/90 border-white/10 hover:bg-white/[0.08]'
        }`}
        title="Intelligence & Espionage"
      >
        🕵️
      </button>

      {isOpen && (
        <div
          className="fixed w-80 max-h-[calc(100vh-120px)] overflow-y-auto bg-[#080f1e]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl"
          style={{ right: 380, bottom: 80, zIndex: 30 }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between sticky top-0 bg-[#080f1e]/95 z-10">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Intelligence</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] sticky top-[40px] bg-[#080f1e]/95 z-10">
            {(['overview', 'missions', 'rankings'] as Tab[]).map(v => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`flex-1 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  tab === v ? 'text-blue-300 border-b border-blue-400 bg-blue-950/20' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Country selector (all tabs share) */}
          {tab === 'overview' && (
            <div className="px-3 py-2 border-b border-white/[0.05] space-y-1.5">
              <input
                type="text"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                placeholder="Search countries…"
                className="w-full px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder-gray-600"
              />
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {filteredCountries.map(c => (
                  <button
                    key={c.iso}
                    onClick={() => setSelectedIso(c.iso)}
                    className={`w-full text-left px-2 py-1 text-[10px] rounded ${
                      selectedIso === c.iso ? 'bg-blue-500/20 text-blue-200' : 'text-gray-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    {c.name} <span className="text-gray-600">({c.iso})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Overview */}
          {tab === 'overview' && (
            <div className="p-3 space-y-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{selectedName}</p>

              {ownedAgencies.length === 0 && realAgencies.length === 0 && (
                <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                  <p className="text-[11px] text-gray-400 mb-2">No intelligence service detected in {selectedName}.</p>
                  <button
                    onClick={() => handleCreate(selectedIso)}
                    className="px-3 py-1 rounded bg-blue-600/30 border border-blue-500/40 text-[10px] text-blue-200 hover:bg-blue-600/50"
                  >
                    Create one?
                  </button>
                </div>
              )}

              {ownedAgencies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest">Player Agencies</p>
                  {ownedAgencies.map(a => <AgencyCard key={a.id} agency={a} />)}
                </div>
              )}

              {realAgencies.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest">Known Services</p>
                  {realAgencies.map(r => (
                    <div key={r.name} className="px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] text-white font-semibold flex-1 min-w-0 truncate">{r.name}</span>
                        <RankBadge rank={r.rank} />
                      </div>
                      <p className="text-[9px] text-gray-500">{r.hint}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedIso === playerIso && (
                <button
                  onClick={() => handleCreate(playerIso)}
                  className="w-full px-3 py-1.5 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] text-blue-200 hover:bg-blue-600/40"
                >
                  + Create Agency
                </button>
              )}
            </div>
          )}

          {/* Missions */}
          {tab === 'missions' && (
            <div className="p-3 space-y-3">
              <div>
                <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">Active Missions</p>
                {activeMissions.length === 0 ? (
                  <p className="text-[10px] text-gray-600">No active missions.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeMissions.map(m => {
                      const ag = allAgencies.find(a => a.id === m.agencyId)
                      const pct = 100 - Math.round((m.weeksRemaining / m.totalWeeks) * 100)
                      const target = m.targetName || (m.targetIso && state?.countries[m.targetIso]?.name) || m.targetIso || '—'
                      return (
                        <div key={m.id} className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-white font-semibold">{m.type}</span>
                            <span className="text-[9px] text-gray-500">{m.weeksRemaining}w left</span>
                          </div>
                          <p className="text-[9px] text-gray-500 mb-1">{ag?.name ?? 'Agency'} → {target}</p>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* New mission form */}
              <div className="pt-2 border-t border-white/[0.05] space-y-2">
                <p className="text-[9px] text-gray-600 uppercase tracking-widest">New Mission</p>
                <select
                  value={mAgency}
                  onChange={e => setMAgency(e.target.value)}
                  className="w-full px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded text-white"
                >
                  <option value="">Select agency…</option>
                  {allAgencies.filter(a => a.ownerIso === playerIso).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <select
                  value={mType}
                  onChange={e => setMType(e.target.value as IntelMissionType)}
                  className="w-full px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded text-white"
                >
                  {MISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  onClick={() => setTargetModal(true)}
                  className="w-full px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded text-left text-gray-300 hover:bg-white/[0.08]"
                >
                  Target: {mTargetName || (mTargetIso && state?.countries[mTargetIso]?.name) || 'Select target…'}
                </button>
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px] text-gray-500">Difficulty</span>
                    <span className="text-[9px] font-mono text-gray-300">{mDifficulty}</span>
                  </div>
                  <input
                    type="range" min={1} max={10} step={1}
                    value={mDifficulty}
                    onChange={e => setMDifficulty(Number(e.target.value))}
                    className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer accent-amber-500"
                  />
                </div>
                <button
                  onClick={handleStartMission}
                  disabled={!mAgency}
                  className="w-full px-3 py-1.5 rounded bg-blue-600/30 border border-blue-500/40 text-[10px] text-blue-200 hover:bg-blue-600/50 disabled:opacity-40"
                >
                  Launch Mission
                </button>
              </div>

              {targetModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setTargetModal(false)}>
                  <div
                    className="w-72 bg-[#080f1e] border border-white/10 rounded-xl shadow-2xl p-3 space-y-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex gap-1">
                      {(['country', 'custom'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setTargetTab(t)}
                          className={`flex-1 py-1 text-[10px] rounded ${
                            targetTab === t ? 'bg-blue-500/20 text-blue-200' : 'text-gray-500 hover:bg-white/[0.06]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {targetTab === 'country' ? (
                      <>
                        <input
                          type="text"
                          value={targetSearch}
                          onChange={e => setTargetSearch(e.target.value)}
                          placeholder="Search countries…"
                          className="w-full px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder-gray-600"
                        />
                        <div className="max-h-60 overflow-y-auto space-y-0.5">
                          {filteredTargetCountries.map(c => (
                            <button
                              key={c.iso}
                              onClick={() => {
                                setMTargetIso(c.iso); setMTargetName(undefined); setTargetModal(false)
                              }}
                              className="w-full text-left px-2 py-1 text-[10px] text-gray-300 hover:bg-white/[0.06] rounded"
                            >
                              {c.name} <span className="text-gray-600">({c.iso})</span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={customTarget}
                          onChange={e => setCustomTarget(e.target.value)}
                          placeholder="Individual, organisation, facility…"
                          className="w-full px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder-gray-600"
                        />
                        <button
                          onClick={() => {
                            if (customTarget.trim()) {
                              setMTargetName(customTarget.trim()); setMTargetIso(undefined); setTargetModal(false)
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded bg-blue-600/30 border border-blue-500/40 text-[10px] text-blue-200 hover:bg-blue-600/50"
                        >
                          Confirm
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rankings */}
          {tab === 'rankings' && (
            <div className="p-3 space-y-1.5">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Global Rankings</p>
              {(() => {
                const rankOrder: Record<string, number> = { global: 0, regional: 1, local: 2 }
                type Row = { name: string; iso: string; rank: 'local' | 'regional' | 'global'; success: number; fail: number; isPlayer: boolean }
                const rows: Row[] = []
                for (const a of allAgencies) {
                  rows.push({ name: a.name, iso: a.ownerIso, rank: a.rank, success: a.successfulMissions, fail: a.failedMissions, isPlayer: true })
                }
                for (const [iso, arr] of Object.entries(REAL_AGENCIES)) {
                  for (const r of arr) rows.push({ name: r.name, iso, rank: r.rank, success: 0, fail: 0, isPlayer: false })
                }
                rows.sort((a, b) => rankOrder[a.rank] - rankOrder[b.rank] || b.success - a.success)
                return rows.map((r, i) => (
                  <div key={`${r.name}-${r.iso}-${i}`} className={`px-2.5 py-1.5 rounded border flex items-center gap-2 ${
                    r.isPlayer ? 'border-blue-500/30 bg-blue-900/10' : 'border-white/[0.06] bg-white/[0.02]'
                  }`}>
                    <span className="text-[10px] text-white font-semibold flex-1 min-w-0 truncate">{r.name}</span>
                    <span className="text-[9px] text-gray-600">{r.iso}</span>
                    <RankBadge rank={r.rank} />
                    {r.isPlayer && (
                      <span className="text-[9px] text-gray-500">{r.success}/{r.fail}</span>
                    )}
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
