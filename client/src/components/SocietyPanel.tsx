import { useGameStore } from '../stores'

function StatRow({ label, value, format = 'number', colour }: {
  label: string
  value: number
  format?: 'number' | 'percent' | 'population' | 'index'
  colour?: string | undefined
}) {
  const display = format === 'population'
    ? value >= 1e9 ? `${(value / 1e9).toFixed(2)}B`
    : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M`
    : `${(value / 1e3).toFixed(0)}K`
    : format === 'percent' ? `${value.toFixed(1)}%`
    : format === 'index' ? `${Math.round(value)} / 100`
    : String(Math.round(value))

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className="text-[10px] font-mono font-semibold" style={{ color: colour ?? '#e2e8f0' }}>
        {display}
      </span>
    </div>
  )
}

function IndexBar({ label, value, icon }: { label: string; value: number; icon: string }) {
  const colour = value > 65 ? '#22c55e' : value > 35 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{icon} {label}</span>
        <span className="text-[10px] font-mono" style={{ color: colour }}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: colour }} />
      </div>
    </div>
  )
}

interface SocietyPanelProps { isOpen: boolean; onOpen: () => void; onClose: () => void }

export default function SocietyPanel({ isOpen, onOpen, onClose }: SocietyPanelProps) {
  const society = useGameStore(s => s.state?.society)
  const eraPhase = useGameStore(s => s.state?.eraPhase ?? 'modern')

  if (!society) return null

  const inequalityColour = society.inequalityIndex < 30 ? '#22c55e' : society.inequalityIndex < 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative">
      <button
        onClick={() => isOpen ? onClose() : onOpen()}
        className={`w-9 h-9 rounded-full border flex items-center justify-center text-base transition-colors shadow-lg ${
          isOpen ? 'bg-emerald-700/60 border-emerald-500/50' : 'bg-[#0d1829]/90 border-white/10 hover:bg-white/[0.08]'
        }`}
        title="Society"
      >
        👥
      </button>

      {isOpen && (
        <div className="absolute bottom-11 right-0 w-64 bg-[#080f1e]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Society</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>

          <div className="p-4 space-y-3">
            {/* Population */}
            <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">Population</p>
              <p className="text-xl font-bold text-white font-mono mt-0.5">
                {society.population >= 1e9
                  ? `${(society.population / 1e9).toFixed(2)}B`
                  : society.population >= 1e6
                  ? `${(society.population / 1e6).toFixed(1)}M`
                  : `${(society.population / 1e3).toFixed(0)}K`}
              </p>
              <p className="text-[9px] text-green-400 mt-0.5">
                +{society.populationGrowthRate.toFixed(1)}% / year
              </p>
            </div>

            {/* Index bars */}
            <div className="space-y-2.5">
              <IndexBar label="Education" value={society.educationIndex} icon="📚" />
              <IndexBar label="Happiness" value={society.happinessIndex} icon="😊" />
            </div>

            {/* Stats */}
            <div>
              <StatRow
                label="Inequality (Gini)"
                value={society.inequalityIndex}
                format="index"
                colour={inequalityColour}
              />
              <StatRow
                label="Urbanisation"
                value={society.urbanisationRate}
                format="percent"
                colour="#94a3b8"
              />
            </div>

            {/* Era-specific insight */}
            <div className="text-[9px] text-gray-600 border-t border-white/[0.06] pt-2">
              {eraPhase === 'ancient' && '🏺 Ancient era: majority rural subsistence farming.'}
              {eraPhase === 'industrial' && '🏭 Industrial era: urbanisation accelerating, labour unrest rising.'}
              {eraPhase === 'modern' && '🌐 Modern era: service economy, global connectivity.'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
