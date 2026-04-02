import { useState } from 'react'
import { useGameStore } from '../stores'
import { saveGame } from '../lib/api'
import { WorldMap, CountryLayer, CitiesLayer, InfraLayer, RailLayer, LandUseLayer } from '../components/map'
import OrgPanel from '../components/OrgPanel'
import type { ActionResult } from '@ad-astra/shared/types'

// ── Category definitions ────────────────────────────────────────────────────

interface Category {
  id: string
  label: string
  icon: string
  actions: string[]
}

const CATEGORIES: Category[] = [
  {
    id: 'economy',
    label: 'Economy & Finance',
    icon: '💰',
    actions: ['Raise income tax', 'Cut corporate tax', 'Issue government bonds', 'Nationalise key industry', 'Attract foreign investment', 'Launch stimulus package'],
  },
  {
    id: 'military',
    label: 'Military & Defence',
    icon: '⚔️',
    actions: ['Increase defence budget', 'Build military base', 'Conscription drive', 'Purchase weapons systems', 'Deploy peacekeeping force', 'Conduct military exercise'],
  },
  {
    id: 'diplomacy',
    label: 'Diplomacy',
    icon: '🤝',
    actions: ['Propose trade agreement', 'Form military alliance', 'Request UN mediation', 'Impose sanctions', 'Open embassy', 'Offer humanitarian aid'],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: '🏗️',
    actions: ['Build airport', 'Construct port', 'Lay high-speed rail', 'Build power plant', 'Construct data centre', 'Build university'],
  },
  {
    id: 'technology',
    label: 'Technology & Research',
    icon: '🔬',
    actions: ['Fund R&D programme', 'Build research centre', 'Recruit foreign talent', 'Launch tech summit', 'Invest in AI', 'Develop semiconductor industry'],
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: '🌿',
    actions: ['Plant national forest', 'Create national park', 'Build desalination plant', 'Launch carbon tax', 'Desert reforestation project', 'Invest in renewables'],
  },
  {
    id: 'culture',
    label: 'Culture & Soft Power',
    icon: '🎭',
    actions: ['Bid for Olympics', 'Build national stadium', 'Fund film industry', 'Host world summit', 'Launch tourism campaign', 'Promote education abroad'],
  },
  {
    id: 'space',
    label: 'Space Programme',
    icon: '🚀',
    actions: ['Launch satellite programme', 'Build launch facility', 'Moon mission proposal', 'Mars colonisation plan', 'Asteroid mining initiative', 'International space partnership'],
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatStat(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return String(Math.round(n))
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GamePage() {
  const gameState = useGameStore(s => s.state)!
  const clearGame = useGameStore(s => s.clearGame)
  const [actionText, setActionText] = useState('')
  const [activeTab, setActiveTab] = useState<'categories' | 'free' | 'suggest'>('free')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const player = gameState.countries[gameState.playerCountryId]
  const stats = player?.stats
  const sectors = player?.sectors

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      await saveGame('autosave', gameState)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleExecute = () => {
    if (!actionText.trim()) return
    console.log('Action:', actionText)
    setActionText('')
  }

  const handleCategoryAction = (action: string) => {
    setActionText(action)
    setActiveTab('free')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a1628] text-white overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#0d1f3c] border-b border-white/10 shrink-0">
        <span className="text-sm font-mono text-blue-300">{gameState.currentDate}</span>
        <span className="px-2 py-0.5 rounded bg-blue-900/50 text-xs text-blue-200">{gameState.era}</span>
        <span className="font-semibold">{player?.name ?? gameState.playerCountryId}</span>
        <div className="flex gap-3 text-xs text-gray-400 ml-2">
          <span>GDP: <span className="text-white">{formatStat(stats?.gdp ?? 0)}</span></span>
          <span>Military: <span className="text-white">{stats?.military ?? 0}</span></span>
          <span>Approval: <span className="text-white">{stats?.approval ?? 0}%</span></span>
          <span>Soft Power: <span className="text-white">{stats?.softPower ?? 0}</span></span>
          <span>Tech: <span className="text-white">{stats?.techLevel ?? 0}</span></span>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={handleSave} className="px-3 py-1 rounded text-xs bg-blue-700 hover:bg-blue-600 transition-colors">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Error!' : 'Save'}
          </button>
          <button onClick={clearGame} className="px-3 py-1 rounded text-xs bg-white/10 hover:bg-white/20 transition-colors">
            New Game
          </button>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="w-80 shrink-0 flex flex-col bg-[#0d1f3c]/80 border-r border-white/10 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            {(['categories', 'free', 'suggest'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs transition-colors ${activeTab === tab ? 'bg-blue-800/50 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {tab === 'categories' ? 'Categories' : tab === 'free' ? 'Free Action' : 'AI Suggest'}
              </button>
            ))}
          </div>

          {/* ── Categories tab ── */}
          {activeTab === 'categories' && (
            <div className="flex-1 overflow-y-auto">
              {/* Sector investment levels */}
              <div className="px-3 pt-3 pb-2 border-b border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sector Investment Levels</p>
                <div className="grid grid-cols-2 gap-1">
                  {sectors && Object.entries(sectors).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between bg-white/5 rounded px-2 py-1">
                      <span className="text-xs text-gray-400 capitalize">{key}</span>
                      <span className="text-xs text-white font-mono">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action categories */}
              <div className="px-3 py-2 space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Quick Actions</p>
                {CATEGORIES.map(cat => (
                  <div key={cat.id}>
                    <button
                      onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                      className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="text-sm">
                        <span className="mr-2">{cat.icon}</span>
                        {cat.label}
                      </span>
                      <span className="text-gray-500 text-xs">{expandedCat === cat.id ? '▲' : '▼'}</span>
                    </button>
                    {expandedCat === cat.id && (
                      <div className="ml-2 mb-1 space-y-1">
                        {cat.actions.map(action => (
                          <button
                            key={action}
                            onClick={() => handleCategoryAction(action)}
                            className="w-full text-left text-xs px-3 py-1.5 rounded bg-white/5 hover:bg-blue-800/40 text-gray-300 hover:text-white transition-colors"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Free Action / AI Suggest tab ── */}
          {activeTab !== 'categories' && (
            <div className="p-3 border-b border-white/10 shrink-0">
              <textarea
                value={actionText}
                onChange={e => setActionText(e.target.value)}
                placeholder={activeTab === 'suggest' ? 'Describe your goal and AI will suggest actions…' : 'Describe your action…'}
                className="w-full h-24 bg-white/5 border border-white/10 rounded p-2 text-sm resize-none focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
              />
              <button
                onClick={handleExecute}
                disabled={!actionText.trim()}
                className="mt-2 w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Execute
              </button>
            </div>
          )}

          {/* ── Execute bar when coming from categories ── */}
          {activeTab === 'categories' && actionText && (
            <div className="p-3 border-t border-white/10 shrink-0">
              <div className="mb-2 px-2 py-1.5 rounded bg-blue-900/30 border border-blue-800/50 text-xs text-blue-200 truncate">
                {actionText}
              </div>
              <button
                onClick={handleExecute}
                className="w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-sm font-medium transition-colors"
              >
                Execute
              </button>
            </div>
          )}

          {/* ── Results panel (always visible at bottom) ── */}
          {activeTab !== 'categories' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Results</p>
              {gameState.lastResults.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">No results yet. Execute an action to begin.</p>
              )}
              {gameState.lastResults.map((result: ActionResult) => (
                <div
                  key={result.actionId}
                  onClick={() => setExpandedResult(expandedResult === result.actionId ? null : result.actionId)}
                  className="cursor-pointer rounded bg-white/5 hover:bg-white/10 border border-white/10 p-3 transition-colors"
                >
                  <p className="text-sm">{result.summary}</p>
                  {expandedResult === result.actionId && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                      <p className="text-xs text-gray-300 leading-relaxed">{result.fullNarrative}</p>
                      {Object.entries(result.statDeltas).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(result.statDeltas).map(([key, val]) => (
                            <span
                              key={key}
                              className={`text-xs px-2 py-0.5 rounded-full ${val > 0 ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}
                            >
                              {key}: {val > 0 ? '+' : ''}{val}
                            </span>
                          ))}
                        </div>
                      )}
                      {result.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative">
          <WorldMap>
            <CountryLayer />
            <CitiesLayer />
            <InfraLayer />
            <RailLayer />
            <LandUseLayer />
          </WorldMap>
          <OrgPanel />
        </div>
      </div>

      {/* ── Time Bar ── */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 bg-[#0d1f3c] border-t border-white/10 shrink-0">
        {(['week', 'month', 'year', 'event'] as const).map(period => (
          <button
            key={period}
            onClick={() => console.log(`Jumping ${period}`)}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            {period === 'event' ? 'Next Event' : `Jump ${period.charAt(0).toUpperCase() + period.slice(1)}`}
          </button>
        ))}
      </div>
    </div>
  )
}
