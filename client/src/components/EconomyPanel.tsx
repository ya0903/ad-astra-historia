import { useGameStore } from '../stores'
import { getCountryResources, resourceMonthlyIncome, type ResourceType } from '@ad-astra/shared/countryResources'

function Bar({ value, max = 100, colour = '#3b82f6', label }: { value: number; max?: number; colour?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[10px] text-gray-400 w-16 shrink-0">{label}</span>}
      <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colour }} />
      </div>
      <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">{Math.round(value)}</span>
    </div>
  )
}

function formatMoney(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`
  return `${sign}$${Math.round(abs)}`
}

interface EconomyPanelProps { isOpen: boolean; onOpen: () => void; onClose: () => void }

export default function EconomyPanel({ isOpen, onOpen, onClose }: EconomyPanelProps) {
  const economy = useGameStore(s => s.state?.economy)
  const setEconomy = useGameStore(s => s.setEconomy)
  const gdp = useGameStore(s => s.state?.countries[s.state?.playerCountryId ?? '']?.stats.gdp ?? 0)
  const eraPhase = useGameStore(s => s.state?.eraPhase ?? 'modern')
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const nationalisedResources = useGameStore(s => s.state?.nationalisedResources ?? [])

  if (!economy) return null

  // Resources: show ALL of the country's natural reserves, mark which are nationalised
  const countryResources = getCountryResources(playerCountryId)
  const RESOURCE_ICONS: Record<string, string> = {
    oil: '🛢️', natural_gas: '🔥', coal: '⛏️',
    copper: '🟠', iron: '⚙️', gold: '🪙', silver: '💿', lithium: '🔋', rare_earth: '⚛️', uranium: '☢️',
    diamonds: '💎', cobalt: '🔵', nickel: '🔩', aluminium: '⚪', zinc: '⬜', tin: '🔲',
    timber: '🪵', fisheries: '🐟', farmland: '🌾', coffee: '☕', cocoa: '🍫', rubber: '🧤',
    phosphate: '🧪', potash: '🧂',
  }

  const debtRatio = gdp > 0 ? economy.debt / gdp : 0
  const debtColour = debtRatio < 0.3 ? '#22c55e' : debtRatio < 0.6 ? '#f59e0b' : '#ef4444'
  const inflationColour = economy.inflation < 5 ? '#22c55e' : economy.inflation < 12 ? '#f59e0b' : '#ef4444'

  const SECTOR_COLOURS: Record<string, string> = {
    agriculture: '#86efac',
    industry: '#fbbf24',
    services: '#60a5fa',
    military: '#f87171',
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => isOpen ? onClose() : onOpen()}
        className={`w-9 h-9 rounded-full border flex items-center justify-center text-base transition-colors shadow-lg ${
          isOpen ? 'bg-blue-700/60 border-blue-500/50' : 'bg-[#0d1829]/90 border-white/10 hover:bg-white/[0.08]'
        }`}
        title="Economy"
      >
        💹
      </button>

      {isOpen && (
        <div className="absolute bottom-11 right-0 w-72 bg-[#080f1e]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Economy</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>

          <div className="p-4 space-y-4">
            {/* GDP */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">GDP</p>
              <p className="text-lg font-bold text-white font-mono">{formatMoney(gdp)}</p>
            </div>

            {/* Debt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Debt</p>
                <span className="text-[10px] font-mono" style={{ color: debtColour }}>
                  {formatMoney(economy.debt)}
                  {gdp > 0 && <span className="text-gray-500"> ({(debtRatio * 100).toFixed(0)}% GDP)</span>}
                </span>
              </div>
              <Bar value={Math.min(100, debtRatio * 100)} colour={debtColour} />
            </div>

            {/* Inflation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Inflation</p>
                <span className="text-[10px] font-mono" style={{ color: inflationColour }}>
                  {economy.inflation.toFixed(1)}%
                </span>
              </div>
              <Bar value={economy.inflation} max={25} colour={inflationColour} />
            </div>

            {/* Trade balance */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Trade Balance</p>
              <span className={`text-[10px] font-mono font-semibold ${economy.tradeBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {economy.tradeBalance >= 0 ? '+' : ''}{formatMoney(economy.tradeBalance)}/yr
              </span>
            </div>

            {/* Tax rate slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tax Rate</p>
                <span className="text-[10px] font-mono text-blue-300">{economy.taxRate}%</span>
              </div>
              <input
                type="range" min={5} max={65} step={1}
                value={economy.taxRate}
                onChange={e => setEconomy({ taxRate: Number(e.target.value) })}
                className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-gray-600">5%</span>
                <span className="text-[9px] text-gray-600">65%</span>
              </div>
            </div>

            {/* Industrialisation */}
            {eraPhase !== 'modern' && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Industrialisation</p>
                <Bar
                  value={economy.industrialisationLevel}
                  colour={economy.industrialisationLevel > 60 ? '#f59e0b' : '#6b7280'}
                />
              </div>
            )}

            {/* Sector shares */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Sector Shares</p>
              <div className="space-y-1.5">
                {(Object.entries(economy.sectorShares) as [string, number][]).map(([sector, pct]) => (
                  <Bar
                    key={sector}
                    value={pct}
                    colour={SECTOR_COLOURS[sector] ?? '#94a3b8'}
                    label={sector.charAt(0).toUpperCase() + sector.slice(1)}
                  />
                ))}
              </div>
            </div>

            {/* Natural resources */}
            {countryResources.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Natural Resources</p>
                <div className="space-y-1">
                  {countryResources.map(dep => {
                    const nat = nationalisedResources.find(n => n.type === dep.type)
                    const income = nat ? resourceMonthlyIncome(dep.type, dep.abundance, nat.extractionLevel, nat.exportsAllowed) : 0
                    const incomeStr = income >= 1e9 ? `$${(income / 1e9).toFixed(1)}B/mo` : income > 0 ? `$${(income / 1e6).toFixed(0)}M/mo` : '—'
                    return (
                      <div key={dep.type} className={`flex items-center justify-between rounded px-2 py-1 text-[11px] ${
                        nat ? 'bg-emerald-900/30 border border-emerald-700/30' : 'bg-white/[0.03] border border-white/5'
                      }`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>{RESOURCE_ICONS[dep.type] ?? '📦'}</span>
                          <span className={`capitalize truncate ${nat ? 'text-emerald-300' : 'text-gray-500'}`}>
                            {dep.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[9px] text-gray-600">{'★'.repeat(dep.abundance)}</span>
                        </div>
                        {nat ? (
                          <span className="text-[9px] font-mono text-emerald-400 shrink-0 ml-1">
                            L{nat.extractionLevel} · {incomeStr}
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-600 shrink-0 ml-1">private</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
