import { useState } from 'react'
import { useGameStore } from '../stores'
import { saveGame } from '../lib/api'
import { WorldMap, CountryLayer, InfraLayer, RailLayer, LandUseLayer } from '../components/map'
import type { ActionResult } from '@ad-astra/shared/types'

export default function GamePage() {
  const gameState = useGameStore(s => s.state)!
  const clearGame = useGameStore(s => s.clearGame)
  const [actionText, setActionText] = useState('')
  const [activeTab, setActiveTab] = useState<'categories' | 'free' | 'suggest'>('free')
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const player = gameState.countries[gameState.playerCountryId]

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
    // Placeholder: in real version this calls AI proxy
    console.log('Action:', actionText)
    setActionText('')
  }

  const formatStat = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    return String(Math.round(n))
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a1628] text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#0d1f3c] border-b border-white/10 shrink-0">
        <span className="text-sm font-mono text-blue-300">{gameState.currentDate}</span>
        <span className="px-2 py-0.5 rounded bg-blue-900/50 text-xs text-blue-200">{gameState.era}</span>
        <span className="font-semibold">{player?.name ?? gameState.playerCountryId}</span>
        <div className="flex gap-3 text-xs text-gray-400 ml-2">
          <span>GDP: <span className="text-white">{formatStat(player?.stats.gdp ?? 0)}</span></span>
          <span>Military: <span className="text-white">{player?.stats.military ?? 0}</span></span>
          <span>Approval: <span className="text-white">{player?.stats.approval ?? 0}%</span></span>
          <span>Soft Power: <span className="text-white">{player?.stats.softPower ?? 0}</span></span>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded text-xs bg-blue-700 hover:bg-blue-600 transition-colors"
          >
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Error!' : 'Save'}
          </button>
          <button
            onClick={clearGame}
            className="px-3 py-1 rounded text-xs bg-white/10 hover:bg-white/20 transition-colors"
          >
            New Game
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 shrink-0 flex flex-col bg-[#0d1f3c]/80 border-r border-white/10 overflow-hidden">
          {/* Action tabs */}
          <div className="flex border-b border-white/10">
            {(['categories', 'free', 'suggest'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs capitalize transition-colors ${activeTab === tab ? 'bg-blue-800/50 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {tab === 'categories' ? 'Categories' : tab === 'free' ? 'Free Action' : 'AI Suggest'}
              </button>
            ))}
          </div>
          <div className="p-3 border-b border-white/10">
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

          {/* Results panel */}
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
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <WorldMap>
            <CountryLayer />
            <InfraLayer />
            <RailLayer />
            <LandUseLayer />
          </WorldMap>
        </div>
      </div>

      {/* Time Bar */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 bg-[#0d1f3c] border-t border-white/10 shrink-0">
        {(['week', 'month', 'year', 'event'] as const).map(period => (
          <button
            key={period}
            onClick={() => console.log(`Jumping ${period}`)}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-blue-700 text-sm font-medium transition-colors capitalize"
          >
            {period === 'event' ? 'Next Event' : `Jump ${period.charAt(0).toUpperCase() + period.slice(1)}`}
          </button>
        ))}
      </div>
    </div>
  )
}
