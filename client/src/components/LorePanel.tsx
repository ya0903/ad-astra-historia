import { useState } from 'react'
import type { LoreEntry } from '@ad-astra/shared/types'

function formatStat(key: string, val: number): string {
  if (key === 'gdp') return (val > 0 ? '+' : '') + (Math.abs(val) >= 1e9 ? `$${(val / 1e9).toFixed(1)}B` : `$${(val / 1e6).toFixed(0)}M`)
  return (val > 0 ? '+' : '') + val + ' ' + key
}

interface Props {
  entries: LoreEntry[]
  currentDate: string
  onClose: () => void
}

export default function LorePanel({ entries, currentDate, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = entries
    .filter(e =>
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      e.involvedCountries.some(c => c.toLowerCase().includes(search.toLowerCase()))
    )
    .slice()
    .reverse() // newest first

  // Group by date
  const grouped: { date: string; entries: LoreEntry[] }[] = []
  for (const entry of filtered) {
    const last = grouped[grouped.length - 1]
    if (last && last.date === entry.date) last.entries.push(entry)
    else grouped.push({ date: entry.date, entries: [entry] })
  }

  return (
    <div className="w-80 flex flex-col bg-[#080f1e]/97 border-l border-white/10 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">Lore</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">{entries.length} event{entries.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-sm">✕</button>
      </div>

      {/* Current date banner */}
      <div className="px-4 py-2 bg-blue-950/40 border-b border-blue-900/30 shrink-0">
        <p className="text-xs text-blue-300 font-mono">{currentDate}</p>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events, tags, countries…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60"
        />
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-2xl">📖</div>
            <p className="text-sm text-gray-400 font-medium">No lore yet</p>
            <p className="text-xs text-gray-600 mt-1">Events will appear here as your story unfolds.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">No events match your search.</p>
        ) : (
          <div className="py-2">
            {grouped.map(group => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-[#080f1e]/97 z-10">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] text-gray-500 font-mono shrink-0">{group.date}</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                {group.entries.map(entry => (
                  <div key={entry.id} className="mx-3 mb-2 rounded-xl border border-white/8 overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                    {/* Entry header */}
                    <button
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="w-full text-left p-3"
                    >
                      <p className="text-xs font-medium text-white leading-snug">{entry.title}</p>

                      {/* Stat pills */}
                      {Object.entries(entry.statDeltas).filter(([, v]) => v !== 0).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(entry.statDeltas).filter(([, v]) => v !== 0).map(([k, v]) => (
                            <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${v > 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/80 text-red-400 border border-red-800/40'}`}>
                              {formatStat(k, v)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Country tags */}
                      {entry.involvedCountries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {entry.involvedCountries.slice(0, 4).map(c => (
                            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/30">{c}</span>
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Expanded narrative */}
                    {expandedId === entry.id && (
                      <div className="px-3 pb-3 border-t border-white/5 pt-2">
                        <p className="text-xs text-gray-300 leading-relaxed">{entry.narrative}</p>
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.tags.map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
