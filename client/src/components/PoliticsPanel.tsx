import { useState } from 'react'
import { useGameStore } from '../stores'

import type { GovernmentType } from '@ad-astra/shared/types'

function Meter({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400">{label}</span>
        <span className="text-[10px] font-mono" style={{ color: colour }}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: colour }} />
      </div>
    </div>
  )
}

const GOV_TYPES: { id: GovernmentType; label: string; icon: string }[] = [
  { id: 'tribal',          label: 'Tribal',             icon: '🪶' },
  { id: 'monarchy',        label: 'Monarchy',            icon: '👑' },
  { id: 'shogunate',       label: 'Shogunate',           icon: '⛩️' },
  { id: 'theocracy',       label: 'Theocracy',           icon: '✝️' },
  { id: 'republic',        label: 'Republic',            icon: '🏛️' },
  { id: 'autocracy',       label: 'Autocracy',           icon: '🦅' },
  { id: 'military_junta',  label: 'Military Junta',      icon: '🎖️' },
  { id: 'democracy',       label: 'Democracy',           icon: '🗳️' },
  { id: 'communist',       label: 'Communist',           icon: '☭' },
  { id: 'federal_republic',label: 'Federal Republic',    icon: '📜' },
]

const POLICY_OPTIONS = [
  { id: 'free_press',           label: 'Free Press',           effect: '−Censorship, +Approval' },
  { id: 'state_propaganda',     label: 'State Propaganda',     effect: '+Stability, −Approval' },
  { id: 'anti_corruption_drive',label: 'Anti-Corruption Drive',effect: '−Corruption, −Approval' },
  { id: 'martial_law',          label: 'Martial Law',          effect: '−Unrest, −Approval' },
  { id: 'welfare_expansion',    label: 'Welfare Expansion',    effect: '+Happiness, −GDP' },
  { id: 'austerity',            label: 'Austerity',            effect: '−Debt, −Happiness' },
]

interface PoliticsPanelProps { isOpen: boolean; onOpen: () => void; onClose: () => void }

export default function PoliticsPanel({ isOpen, onOpen, onClose }: PoliticsPanelProps) {
  const [showGovPicker, setShowGovPicker] = useState(false)
  const politics = useGameStore(s => s.state?.politics)
  const playerIso = useGameStore(s => s.state?.playerCountryId ?? '')
  const playerAgencies = useGameStore(s => (s.state?.espionage?.agencies ?? []).filter(a => a.ownerIso === playerIso))
  const setPolitics = useGameStore(s => s.setPolitics)
  const playerStats = useGameStore(s => {
    const pid = s.state?.playerCountryId
    return pid ? s.state?.countries[pid]?.stats : undefined
  })

  if (!politics) return null

  const unrestColour = politics.unrestLevel < 30 ? '#22c55e' : politics.unrestLevel < 60 ? '#f59e0b' : '#ef4444'
  const corruptionColour = politics.corruption < 30 ? '#22c55e' : politics.corruption < 65 ? '#f59e0b' : '#ef4444'

  const govInfo = GOV_TYPES.find(g => g.id === politics.governmentType)

  const togglePolicy = (id: string) => {
    const current = politics.policies ?? []
    if (current.includes(id)) {
      setPolitics({ policies: current.filter(p => p !== id) })
    } else {
      setPolitics({ policies: [...current, id] })
    }
  }

  return (
    <>
      <button
        onClick={() => { if (isOpen) { onClose(); setShowGovPicker(false) } else onOpen() }}
        className={`w-9 h-9 rounded-full border flex items-center justify-center text-base transition-colors shadow-lg ${
          isOpen ? 'bg-purple-700/60 border-purple-500/50' : 'bg-[#0d1829]/90 border-white/10 hover:bg-white/[0.08]'
        }`}
        title="Internal Politics"
      >
        🏛️
      </button>

      {/* Gov picker flyout — flies left of the main (fixed) panel */}
      {isOpen && showGovPicker && (
        <div
          className="fixed w-48 bg-[#080f1e]/98 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          style={{ right: 380 + 288 + 8, bottom: 80, zIndex: 31 }}
        >
          <div className="px-3 py-2 border-b border-white/[0.07]">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Government Type</p>
          </div>
          {GOV_TYPES.map(g => (
            <button
              key={g.id}
              onClick={() => { setPolitics({ governmentType: g.id }); setShowGovPicker(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] transition-colors ${
                politics.governmentType === g.id ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              <span>{g.icon}</span><span>{g.label}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed w-72 max-h-[calc(100vh-120px)] overflow-y-auto bg-[#080f1e]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl"
          style={{ right: 380, bottom: 80, zIndex: 30 }}
        >
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Internal Politics</span>
            <button onClick={() => { onClose(); setShowGovPicker(false) }} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>

          {/* Government type */}
          <div className="px-4 pt-3 pb-2 border-b border-white/[0.05]">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Government</p>
            <button
              onClick={() => setShowGovPicker(p => !p)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
            >
              <span className="text-base">{govInfo?.icon}</span>
              <span className="text-xs text-white font-medium">{govInfo?.label ?? politics.governmentType}</span>
              <span className="ml-auto text-[10px] text-gray-500">{showGovPicker ? '▴' : '▾'}</span>
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            {/* Meters */}
            <div className="space-y-2.5">
              <Meter label="Unrest" value={politics.unrestLevel} colour={unrestColour} />
              <Meter label="Corruption" value={politics.corruption} colour={corruptionColour} />
              {playerAgencies.length > 0 && (() => {
                const totalFunding = playerAgencies.reduce((s, a) => s + a.funding, 0) || 1
                const intelCorruption = playerAgencies.reduce((s, a) => s + a.corruption * a.funding, 0) / totalFunding
                const intelEfficiency = playerAgencies.reduce((s, a) => s + a.efficiency * a.funding, 0) / totalFunding
                return (
                  <>
                    <Meter label="Intel Corruption" value={intelCorruption} colour="#f59e0b" />
                    <Meter label="Intel Efficiency" value={intelEfficiency} colour="#60a5fa" />
                  </>
                )
              })()}
            </div>

            {/* Censorship slider */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-400">Censorship Level</span>
                <span className="text-[10px] font-mono text-gray-300">{politics.censorshipLevel}</span>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={politics.censorshipLevel}
                onChange={e => setPolitics({ censorshipLevel: Number(e.target.value) })}
                className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer accent-purple-500"
              />
            </div>

            {/* Stability from stats */}
            {playerStats && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Stability Score</span>
                <span className={`text-[10px] font-mono font-semibold ${
                  playerStats.stability >= 60 ? 'text-green-400' : playerStats.stability >= 35 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {playerStats.stability} / 100
                </span>
              </div>
            )}

            {/* Years in power */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Years in Power</span>
              <span className="text-[10px] font-mono text-gray-300">{politics.yearsInPower}</span>
            </div>

            {/* Policies */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Active Policies</p>
              <div className="space-y-1">
                {POLICY_OPTIONS.map(pol => {
                  const active = politics.policies.includes(pol.id)
                  return (
                    <button
                      key={pol.id}
                      onClick={() => togglePolicy(pol.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors ${
                        active
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-200'
                          : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold">{pol.label}</span>
                        {active && <span className="text-[9px] text-purple-400">●</span>}
                      </div>
                      <div className="text-[9px] opacity-60 mt-0.5">{pol.effect}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
