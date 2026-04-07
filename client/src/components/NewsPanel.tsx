import { useState } from 'react'
import { useGameStore } from '../stores'
import type { NewsItem, NewsCategory, NewsImportance } from '@ad-astra/shared/types'

interface NewsPanelProps {
  onClose: () => void
}

// ── Category icons & colours ─────────────────────────────────────────────────
const CATEGORY_META: Record<NewsCategory, { icon: string; label: string; colour: string }> = {
  economy:   { icon: '📈', label: 'Economy',   colour: 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20' },
  military:  { icon: '⚔️',  label: 'Military',  colour: 'text-red-400 border-red-500/30 bg-red-900/20' },
  diplomacy: { icon: '🤝', label: 'Diplomacy', colour: 'text-blue-400 border-blue-500/30 bg-blue-900/20' },
  science:   { icon: '🔬', label: 'Science',   colour: 'text-purple-400 border-purple-500/30 bg-purple-900/20' },
  disaster:  { icon: '⚠️',  label: 'Disaster',  colour: 'text-amber-400 border-amber-500/30 bg-amber-900/20' },
  politics:  { icon: '🏛️', label: 'Politics',  colour: 'text-orange-400 border-orange-500/30 bg-orange-900/20' },
  world:     { icon: '🌍', label: 'World',     colour: 'text-sky-400 border-sky-500/30 bg-sky-900/20' },
  culture:        { icon: '🎭', label: 'Culture',        colour: 'text-pink-400 border-pink-500/30 bg-pink-900/20' },
  infrastructure: { icon: '🏗️', label: 'Infrastructure', colour: 'text-cyan-400 border-cyan-500/30 bg-cyan-900/20' },
  government:     { icon: '⚖️', label: 'Government',     colour: 'text-indigo-400 border-indigo-500/30 bg-indigo-900/20' },
}

const IMPORTANCE_DOT: Record<NewsImportance, string> = {
  breaking: 'bg-red-500',
  major:    'bg-amber-400',
  minor:    'bg-gray-500',
}

const CATEGORIES: NewsCategory[] = ['economy', 'military', 'diplomacy', 'science', 'disaster', 'politics', 'world']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function NewsCard({ item, expanded, onToggle }: { item: NewsItem; expanded: boolean; onToggle: () => void }) {
  const meta = CATEGORY_META[item.category]
  return (
    <button
      onClick={onToggle}
      className="w-full text-left"
    >
      <div className={`rounded-lg border px-3 py-2.5 transition-colors ${meta.colour} ${expanded ? 'opacity-100' : 'opacity-85 hover:opacity-100'}`}>
        <div className="flex items-start gap-2.5">
          {/* Importance indicator */}
          <div className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${IMPORTANCE_DOT[item.importance]}`} />

          <div className="flex-1 min-w-0">
            {/* Category tag + date */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
                {meta.icon} {meta.label}
              </span>
              <span className="text-[10px] text-gray-500 ml-auto shrink-0">{formatDate(item.date)}</span>
            </div>
            {/* Headline */}
            <p className="text-sm font-medium text-white leading-snug">{item.headline}</p>
            {/* Body (expanded) */}
            {expanded && item.body && (
              <p className="mt-1.5 text-xs text-gray-300 leading-relaxed">{item.body}</p>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function NewsPanel({ onClose }: NewsPanelProps) {
  const newsItems = useGameStore(s => s.state?.newsItems ?? [])
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = activeCategory === 'all'
    ? newsItems
    : newsItems.filter(n => n.category === activeCategory)

  // Sort: breaking first, then major, then minor; within each group by date desc
  const importanceOrder: Record<NewsImportance, number> = { breaking: 0, major: 1, minor: 2 }
  const sorted = [...filtered].sort((a, b) => {
    const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance]
    if (impDiff !== 0) return impDiff
    return b.date.localeCompare(a.date)
  })

  const breakingCount = newsItems.filter(n => n.importance === 'breaking').length

  return (
    <div className="absolute bottom-20 right-16 z-30 w-80 flex flex-col rounded-2xl bg-[#07101f]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 140px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">World News</span>
          {breakingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold">
              {breakingCount} BREAKING
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-sm leading-none"
        >
          ✕
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            activeCategory === 'all'
              ? 'bg-white/15 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => {
          const meta = CATEGORY_META[cat]
          const count = newsItems.filter(n => n.category === cat).length
          if (count === 0) return null
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {meta.icon}
            </button>
          )
        })}
      </div>

      {/* News list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-sm">
            {newsItems.length === 0
              ? 'No news yet. Advance time to see world events.'
              : 'No news in this category.'}
          </div>
        ) : (
          sorted.map(item => (
            <NewsCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {sorted.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 shrink-0">
          <p className="text-[10px] text-gray-600 text-center">
            {sorted.length} headline{sorted.length !== 1 ? 's' : ''} · click to expand
          </p>
        </div>
      )}
    </div>
  )
}
