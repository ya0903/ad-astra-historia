import { useGameStore } from '../stores'
import type { MilitaryDoctrine } from '@ad-astra/shared/types'

function StrengthBar({ label, value, icon }: { label: string; value: number; icon: string }) {
  const colour = value > 70 ? '#22c55e' : value > 35 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{icon} {label}</span>
        <span className="text-[10px] font-mono font-semibold" style={{ color: colour }}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: colour }} />
      </div>
    </div>
  )
}

const DOCTRINES: { id: MilitaryDoctrine; label: string; desc: string }[] = [
  { id: 'offensive',         label: 'Offensive',      desc: '+15% attack, −10% defence' },
  { id: 'defensive',         label: 'Defensive',      desc: '+20% fortification strength' },
  { id: 'expeditionary',     label: 'Expeditionary',  desc: 'Reduced supply penalty abroad' },
  { id: 'guerrilla',         label: 'Guerrilla',       desc: '+25% vs superior force' },
  { id: 'blitzkrieg',        label: 'Blitzkrieg',      desc: '+20% speed, +10% armour' },
  { id: 'nuclear_deterrence',label: 'Nuclear Deterrence', desc: 'Reduces war risk from majors' },
]

interface MilitaryPanelProps { isOpen: boolean; onOpen: () => void; onClose: () => void }

export default function MilitaryPanel({ isOpen, onOpen, onClose }: MilitaryPanelProps) {
  const militaryState = useGameStore(s => s.state?.militaryState)
  const setMilitaryState = useGameStore(s => s.setMilitaryState)
  const runCounterInsurgency = useGameStore(s => s.runCounterInsurgency)
  const atWarWith = useGameStore(s => s.state?.atWarWith ?? [])
  const playerStats = useGameStore(s => {
    const pid = s.state?.playerCountryId
    return pid ? s.state?.countries[pid]?.stats : undefined
  })
  const unlockedTechs = useGameStore(s => s.state?.unlockedTechs ?? [])

  if (!militaryState) return null

  const hasAir = unlockedTechs.includes('drone_warfare') || unlockedTechs.includes('stealth_tech') || unlockedTechs.includes('aircraft_carrier')
  const hasNaval = unlockedTechs.includes('naval_warfare') || unlockedTechs.includes('ironclad_warship') || unlockedTechs.includes('aircraft_carrier')
  const atWar = atWarWith.length > 0

  const handleMobilise = () => {
    if (!militaryState) return
    setMilitaryState({ mobilisationLevel: Math.min(100, militaryState.mobilisationLevel + 20) })
  }
  const handleDemobilise = () => {
    if (!militaryState) return
    setMilitaryState({ mobilisationLevel: Math.max(0, militaryState.mobilisationLevel - 20) })
  }

  return (
    <div className="relative">
      <button
        onClick={() => isOpen ? onClose() : onOpen()}
        className={`w-9 h-9 rounded-full border flex items-center justify-center text-base transition-colors shadow-lg ${
          isOpen ? 'bg-red-700/60 border-red-500/50' : 'bg-[#0d1829]/90 border-white/10 hover:bg-white/[0.08]'
        }`}
        title="Military"
      >
        ⚔️
      </button>

      {isOpen && (
        <div className="absolute bottom-11 right-0 w-72 bg-[#080f1e]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Military</span>
              {atWar && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold animate-pulse">
                  AT WAR
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>

          <div className="p-4 space-y-4">
            {/* Strength bars */}
            <div className="space-y-2.5">
              <StrengthBar label="Land Forces" value={militaryState.landStrength} icon="🪖" />
              {hasAir && <StrengthBar label="Air Force" value={militaryState.airStrength} icon="✈️" />}
              {hasNaval && <StrengthBar label="Naval" value={militaryState.navalStrength} icon="⚓" />}
            </div>

            {/* Morale */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Morale</span>
                <span className="text-[10px] font-mono text-blue-300">{Math.round(militaryState.morale)}</span>
              </div>
              <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${militaryState.morale}%` }} />
              </div>
            </div>

            {/* Mobilisation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">Mobilisation Level</span>
                <span className="text-[10px] font-mono text-amber-300">{militaryState.mobilisationLevel}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${militaryState.mobilisationLevel}%` }} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMobilise}
                  className="flex-1 py-1 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                >
                  + Mobilise
                </button>
                <button
                  onClick={handleDemobilise}
                  disabled={militaryState.mobilisationLevel === 0}
                  className="flex-1 py-1 rounded text-[10px] font-semibold bg-white/[0.04] text-gray-400 border border-white/10 hover:bg-white/[0.08] transition-colors disabled:opacity-30"
                >
                  − Stand Down
                </button>
              </div>
            </div>

            {/* Attrition indicator */}
            {atWar && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] text-red-300">
                  ⚠ Attrition active — forces losing {militaryState.attritionRate.toFixed(1)}% strength/year
                </p>
              </div>
            )}

            {/* Overall military stat */}
            {playerStats && (
              <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-white/[0.06] pt-3">
                <span>Military Power Score</span>
                <span className="font-mono text-white">{playerStats.military}</span>
              </div>
            )}

            {/* Counter-insurgency action */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Internal Security</p>
              <button
                onClick={runCounterInsurgency}
                className="w-full py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                title="Sweep restive regions: costs ~0.5% GDP, +4 stability"
              >
                🛡 Counter-Insurgency Sweep (+4 stability)
              </button>
            </div>

            {/* Doctrine selector */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Doctrine</p>
              <div className="space-y-1">
                {DOCTRINES.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setMilitaryState({ doctrine: d.id })}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
                      militaryState.doctrine === d.id
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                        : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="text-[10px] font-semibold">{d.label}</div>
                    <div className="text-[9px] opacity-60 mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
