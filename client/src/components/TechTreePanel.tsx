import { useGameStore } from '../stores'
import { TECH_TREE, getAvailableTechs } from '@ad-astra/shared/techTree'
import type { TechNode } from '@ad-astra/shared/types'
import { INFRA_COLOURS } from '@ad-astra/shared/infraColours'

function formatWeeks(w: number): string {
  if (w >= 520) return `${(w / 52).toFixed(0)} years`
  if (w >= 52) return `${(w / 52).toFixed(1)} years`
  if (w >= 4) return `${Math.round(w / 4)} months`
  return `${w} weeks`
}

export default function TechTreePanel() {
  const gameState = useGameStore(s => s.state)
  const startResearch = useGameStore(s => s.startResearch)
  const instaResearch = useGameStore(s => s.instaResearch)

  if (!gameState) return null

  const era = gameState.era
  const unlockedTechs = gameState.unlockedTechs ?? []
  const researchQueue = gameState.researchQueue ?? []
  const buildQueue = gameState.buildQueue ?? []
  const researchingIds = researchQueue.map(r => r.techId)
  const available = getAvailableTechs(era, unlockedTechs)
  const locked = TECH_TREE.filter(t =>
    t.unlocksEra.includes(era) &&
    !unlockedTechs.includes(t.id) &&
    !available.find(a => a.id === t.id)
  )

  const handleResearch = (tech: TechNode) => {
    if (researchingIds.includes(tech.id)) return
    startResearch(tech.id, tech.researchWeeks)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">

        {/* Under construction */}
        {buildQueue.length > 0 && (
          <div>
            <p className="text-xs text-amber-400 uppercase tracking-wider mb-2">Under Construction</p>
            <div className="space-y-2">
              {buildQueue.map(p => {
                const colour = INFRA_COLOURS[p.type as keyof typeof INFRA_COLOURS] ?? '#94a3b8'
                const pct = Math.round((1 - p.weeksRemaining / p.totalWeeks) * 100)
                return (
                  <div key={p.id} className="rounded bg-amber-900/20 border border-amber-800/30 px-2 py-2">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block"
                          style={{ background: colour }} />
                        <span className="text-xs text-amber-200 truncate">{p.name}</span>
                      </div>
                      <span className="text-xs text-amber-500 font-mono flex-shrink-0">
                        {formatWeeks(p.weeksRemaining)} left
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: colour, opacity: 0.75 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Unlocked */}
        {unlockedTechs.length > 0 && (
          <div>
            <p className="text-xs text-green-500 uppercase tracking-wider mb-2">Unlocked</p>
            <div className="space-y-1">
              {TECH_TREE.filter(t => unlockedTechs.includes(t.id)).map(t => (
                <div key={t.id} className="rounded bg-green-900/20 border border-green-800/30 px-2 py-1.5 flex items-center gap-2">
                  <span className="text-green-400 text-xs">✓</span>
                  <span className="text-xs text-green-300">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In progress */}
        {researchQueue.length > 0 && (
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-wider mb-2">Researching</p>
            <div className="space-y-2">
              {researchQueue.map(p => {
                const tech = TECH_TREE.find(t => t.id === p.techId)
                return (
                  <div key={p.id} className="rounded bg-blue-900/20 border border-blue-800/30 px-2 py-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-200">{tech?.name ?? p.techId}</span>
                      <span className="text-blue-400">{formatWeeks(p.weeksRemaining)} left</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.round((1 - p.weeksRemaining / p.totalWeeks) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available to research */}
        {available.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Available</p>
            <div className="space-y-2">
              {available.map(t => {
                const isResearching = researchingIds.includes(t.id)
                return (
                  <div key={t.id} className="rounded bg-white/5 border border-white/10 px-2 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white">{t.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.description}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatWeeks(t.researchWeeks)} · {t.cost} RP</p>
                      </div>
                      <button
                        onClick={() => handleResearch(t)}
                        disabled={isResearching}
                        className="shrink-0 px-2 py-1 rounded text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isResearching ? 'Queued' : 'Research'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Locked (prerequisites not met) */}
        {locked.length > 0 && (
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Locked</p>
            <div className="space-y-1">
              {locked.map(t => (
                <div key={t.id} className="rounded bg-white/5 border border-white/5 px-2 py-1.5 opacity-50">
                  <p className="text-xs text-gray-500">{t.name}</p>
                  <p className="text-xs text-gray-700">Requires: {t.prerequisites.map(p => TECH_TREE.find(x => x.id === p)?.name ?? p).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {available.length === 0 && researchQueue.length === 0 && unlockedTechs.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">No techs available for {era} era.</p>
        )}
      </div>
    </div>
  )
}
