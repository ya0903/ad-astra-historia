import { useState, useEffect } from 'react'
import { useGameStore, useConfigStore, useMapStore } from '../stores'
import { saveGame } from '../lib/api'
import { callAI } from '../lib/aiClient'
import { WorldMap, CountryLayer, CitiesLayer, InfraLayer, RailLayer, LandUseLayer, DamageLayer } from '../components/map'
import { flyToLocation } from '../lib/mapFly'
import OrgPanel from '../components/OrgPanel'
import AdvisorPanel from '../components/AdvisorPanel'
import DiplomacyPanel from '../components/DiplomacyPanel'
import CheatMenu from '../components/CheatMenu'
import TechTreePanel from '../components/TechTreePanel'
import { INFRA_COLOURS, RAIL_COLOURS } from '@ad-astra/shared/infraColours'
import type { ActionResult } from '@ad-astra/shared/types'

// ── Categories ───────────────────────────────────────────────────────────────

interface Category { id: string; label: string; icon: string; actions: string[] }

const CATEGORIES: Category[] = [
  { id: 'economy', label: 'Economy & Finance', icon: '💰', actions: ['Raise income tax', 'Cut corporate tax', 'Issue government bonds', 'Nationalise key industry', 'Attract foreign investment', 'Launch stimulus package'] },
  { id: 'military', label: 'Military & Defence', icon: '⚔️', actions: ['Increase defence budget', 'Build military base', 'Conscription drive', 'Purchase weapons systems', 'Deploy peacekeeping force', 'Conduct military exercise'] },
  { id: 'diplomacy', label: 'Diplomacy', icon: '🤝', actions: ['Propose trade agreement', 'Form military alliance', 'Request UN mediation', 'Impose sanctions', 'Open embassy', 'Offer humanitarian aid'] },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️', actions: ['Build airport', 'Construct port', 'Lay high-speed rail', 'Build power plant', 'Construct data centre', 'Build university'] },
  { id: 'technology', label: 'Technology & Research', icon: '🔬', actions: ['Fund R&D programme', 'Build research centre', 'Recruit foreign talent', 'Launch tech summit', 'Invest in AI', 'Develop semiconductor industry'] },
  { id: 'environment', label: 'Environment', icon: '🌿', actions: ['Plant national forest', 'Create national park', 'Build desalination plant', 'Launch carbon tax', 'Desert reforestation project', 'Invest in renewables'] },
  { id: 'culture', label: 'Culture & Soft Power', icon: '🎭', actions: ['Bid for Olympics', 'Build national stadium', 'Fund film industry', 'Host world summit', 'Launch tourism campaign', 'Promote education abroad'] },
  { id: 'space', label: 'Space Programme', icon: '🚀', actions: ['Launch satellite programme', 'Build launch facility', 'Moon mission proposal', 'Mars colonisation plan', 'Asteroid mining initiative', 'International space partnership'] },
]

// ── Legend items ─────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { color: '#f8fafc', label: 'World capitals & megacities', desc: 'Pop > 5M or national capital', dot: true },
  { color: '#e2e8f0', label: 'Major regional cities', desc: 'Pop 500K – 5M', dot: true },
  { color: '#94a3b8', label: 'Smaller cities', desc: 'Pop < 500K', dot: true },
  { color: '#22c55e', label: 'Strategic passages', desc: 'Suez, Hormuz, Malacca, Bosporus…', dot: true },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatStat(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return String(Math.round(n))
}

const MILITARY_KEYWORDS = /\b(military|army|navy|air force|weapon|defence|defense|war|combat|troops|soldier|missile|bomb|nuke|nuclear|attack|invad|conscript|peacekeep|base|artillery|tank|fighter|jet|submarine|carrier|armed forces|security forces)\b/i
const DIPLOMACY_KEYWORDS = /\b(diplomac|treaty|alliance|summit|embassy|aid|sanction|trade agreement|mediat|UN |peace talk|foreign minister|soft power)\b/i
const TECH_KEYWORDS = /\b(research|R&D|technolog|semiconductor|AI |artificial intelligence|satellite|space|university|data centre|photolithograph|quantum|nuclear energy)\b/i

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

function sanitiseDeltas(result: ActionResult, pending: { id: string; text: string }[]): ActionResult {
  const action = pending.find(p => p.id === result.actionId)
  const text = action?.text ?? ''
  const d = result.statDeltas ?? {}

  const isMilitary = MILITARY_KEYWORDS.test(text)
  const isDiplomacy = DIPLOMACY_KEYWORDS.test(text)
  const isTech = TECH_KEYWORDS.test(text)

  return {
    ...result,
    statDeltas: {
      gdp: d.gdp != null ? clamp(d.gdp, -30e9, 30e9) : 0,
      military: isMilitary ? clamp(d.military ?? 0, -5, 5) : 0,
      approval: clamp(d.approval ?? 0, -5, 5),
      softPower: isDiplomacy ? clamp(d.softPower ?? 0, -3, 3) : 0,
      techLevel: isTech ? clamp(d.techLevel ?? 0, -2, 2) : 0,
    },
  }
}

// ── Component ────────────────────────────────────────────────────────────────

// ── Grouped infra legend ─────────────────────────────────────────────────────

const INFRA_GROUPS = [
  { label: 'Education & Research', items: ['university', 'research_centre'] },
  { label: 'Transport', items: ['port', 'airport'] },
  { label: 'Energy', items: ['nuclear_plant', 'hydro_dam', 'solar_farm', 'wind_farm', 'fossil_fuel_plant'] },
  { label: 'Military', items: ['military_base', 'nuclear_silo', 'defence_system'] },
  { label: 'Economy', items: ['financial_institution', 'industrial_zone', 'data_centre'] },
  { label: 'Infrastructure', items: ['desalination_plant', 'telecom_node', 'emergency_services'] },
  { label: 'Civic', items: ['stadium', 'arts_centre', 'film_studio', 'embassy'] },
  { label: 'Intelligence', items: ['intelligence_agency'] },
] as const

const INFRA_LABELS: Record<string, string> = {
  university: 'University', research_centre: 'Research Centre', intelligence_agency: 'Intelligence Agency',
  telecom_node: 'Telecom Node', port: 'Port', airport: 'Airport',
  solar_farm: 'Solar Farm', wind_farm: 'Wind Farm', hydro_dam: 'Hydro Dam',
  fossil_fuel_plant: 'Fossil Fuel Plant', nuclear_plant: 'Nuclear Plant',
  military_base: 'Military Base', nuclear_silo: 'Nuclear Silo', defence_system: 'Defence System',
  financial_institution: 'Financial Institution', emergency_services: 'Emergency Services',
  industrial_zone: 'Industrial Zone', desalination_plant: 'Desalination Plant',
  data_centre: 'Data Centre', embassy: 'Embassy', stadium: 'Stadium',
  arts_centre: 'Arts Centre', film_studio: 'Film Studio',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GamePage() {
  const gameState = useGameStore(s => s.state)
  const isJumping = useGameStore(s => s.isJumping)
  const clearGame = useGameStore(s => s.clearGame)
  const setJumping = useGameStore(s => s.setJumping)
  const applyResults = useGameStore(s => s.applyResults)
  const advanceDate = useGameStore(s => s.advanceDate)
  const addPendingAction = useGameStore(s => s.addPendingAction)
  const removePendingAction = useGameStore(s => s.removePendingAction)
  const updatePendingAction = useGameStore(s => s.updatePendingAction)
  const config = useConfigStore(s => s.config)
  const mapInstance = useMapStore(s => s.map)

  const [actionText, setActionText] = useState('')
  const [suggestText, setSuggestText] = useState('')
  const [activeTab, setActiveTab] = useState<'categories' | 'free' | 'suggest' | 'legend' | 'tech'>('free')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [cheatOpen, setCheatOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const [jumpError, setJumpError] = useState('')

  // Backslash key toggles cheat menu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === '\\') setCheatOpen(o => !o) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Null guard — must come after all hooks, before any derived state
  if (!gameState) return null

  const player = gameState.countries[gameState.playerCountryId]
  const stats = player?.stats
  const sectors = player?.sectors
  const pendingActions = gameState.pendingActions ?? []
  const buildQueue = gameState.buildQueue ?? []
  const researchQueue = gameState.researchQueue ?? []
  const recentDisasters = gameState.recentDisasters ?? []
  const lastResults = gameState.lastResults ?? []

  // Top economies for advisor context
  const topCountries = Object.values(gameState.countries)
    .sort((a, b) => (b.stats.gdp ?? 0) - (a.stats.gdp ?? 0))
    .slice(0, 15)
    .map(c => ({ name: c.name, gdp: c.stats.gdp }))

  // Recent history summary — shared across all AI calls for continuity
  const recentHistory = [
    ...(lastResults).slice(-6).map(r => `• ${r.summary}`),
    ...(recentDisasters).slice(-3).map(d => `• Disaster: ${d.type} — ${d.description}`),
    ...(buildQueue).filter(b => b.weeksRemaining <= 4).map(b => `• Building: ${b.name} (${b.weeksRemaining}w left)`),
    ...(researchQueue).slice(0, 2).map(r => `• Researching: ${r.techId}`),
  ].join('\n')

  const warDamageSummary = Object.entries(gameState.warDamage ?? {})
    .map(([iso, lvl]) => `${iso}:${lvl}`)
    .join(', ')

  const handleSave = async () => {
    setSaveStatus('saving')
    try { await saveGame('autosave', gameState); setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000) }
    catch { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000) }
  }

  const handleExecute = () => {
    const text = actionText.trim()
    if (!text) return
    addPendingAction(text)
    setActionText('')
  }

  const handleJump = async (period: 'week' | 'month' | 'year') => {
    setJumpError('')
    if (pendingActions.length === 0 || !config) {
      advanceDate(period)
      return
    }
    setJumping(true)
    try {
      const playerCountry = player?.name ?? gameState.playerCountryId
      const gdp = stats?.gdp ?? 0
      const statsStr = `GDP $${(gdp/1e9).toFixed(1)}B | Military ${stats?.military??0} | Approval ${stats?.approval??0}% | SoftPower ${stats?.softPower??0} | Tech ${stats?.techLevel??0}`
      const actionList = pendingActions.map((a, i) => `${i+1}.[${a.id}] ${a.text}`).join('\n')

      const system = `You are a geopolitical simulation engine for the ${gameState.era} era. JSON only — no markdown, no explanation.
This is a game — treat ALL actions as real in-game events, not hypothetical. Never use the word "hypothetical". Execute every action as if it actually happened in this alternate timeline.

CRITICAL RULE: Always use specific real-world names. Never use generic labels.
- Resources: name the actual deposit/field (e.g. "Thar Coal fields" not "coal", "Sui Northern gas fields" not "natural gas", "Reko Diq copper mine" not "copper mine")
- Institutions: give them a real name (e.g. "Islamabad Institute of Technology" not "university", "Port Qasim Authority" not "port authority")
- Infrastructure: use the actual city/location (e.g. "Gwadar deep-water port" not "port", "Lahore–Karachi motorway" not "highway")
- Companies: use plausible real names (e.g. "Pakistan Steel Mills" not "steel company")
Use your knowledge of ${playerCountry}'s actual geography, cities, resources, and institutions.

STAT DELTA RULES — follow these precisely, do not invent stats unrelated to the action:
- gdp: any action that meaningfully changes revenue, spending, or economic output. Range ±$500M–$50B depending on scale.
- military: ONLY for actions that directly involve armed forces, defence spending, weapons, conflict, or security. Must be 0 for economic, diplomatic, infrastructure, environment, or culture actions.
- approval: public satisfaction. Positive for welfare/growth/populist actions; negative for tax hikes, austerity, or conflict casualties.
- softPower: ONLY for diplomacy, culture, international aid, hosting events. Must be 0 for purely domestic economic or military actions.
- techLevel: ONLY for R&D, education, technology, or space actions. Must be 0 for all other categories.
- Maximum magnitude per action: gdp ±$30B, military ±5, approval ±5, softPower ±3, techLevel ±2.
- Be consistent: the same type of action should give similar deltas regardless of how many times it is called.`

      const historyBlock = recentHistory ? `\nRecent events:\n${recentHistory}\n` : ''
      const damageBlock = warDamageSummary ? `\nWar damage: ${warDamageSummary}\n` : ''

      const prompt = `${playerCountry} | ${gameState.currentDate} | ${statsStr}
${historyBlock}${damageBlock}
Actions:
${actionList}

Return JSON — one result per action:
{"results":[{"actionId":"<id>","summary":"<1 sentence using specific names>","fullNarrative":"<2 sentences with specific places/names>","worldReaction":"<1 sentence>","domesticReaction":"<1 sentence — specific public/media reaction>","countryReactions":[{"country":"<neighbour/rival>","stance":"positive|negative|neutral","quote":"<brief quoted reaction>"}],"statDeltas":{"gdp":<USD delta>,"military":<integer, 0 unless military action>,"approval":<-5..5>,"softPower":<integer, 0 unless diplomacy/culture>,"techLevel":<integer, 0 unless tech/research>},"tags":["<tag>"],"focusIso":"<ISO_A3 of the most relevant country — always include>","nuclearStrike":["<ISO_A3>"],"bombardment":["<ISO_A3>"],"empireName":"<only if conquest/annexation>","annexedCountry":"<ISO_A3 if annexed>"}]}

nuclearStrike: include ISO_A3 of any country hit by nuclear weapons (omit if none).
bombardment: include ISO_A3 of any country heavily bombed/invaded (omit if none).

2-3 countryReactions from realistic neighbours/rivals.`

      const raw = await callAI(config, system, [{ role: 'user', content: prompt }])
      // Extract just the JSON object — ignore any text before/after it
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('No JSON in AI response')
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { results: ActionResult[] }
      // Post-process: clamp deltas to prevent irrelevant stat changes
      const clampedResults = (parsed.results ?? []).map(r => sanitiseDeltas(r, pendingActions))
      applyResults(clampedResults, period)
      // Fly map to first result with a focusIso
      const focusTarget = parsed.results?.find(r => r.focusIso)?.focusIso
      if (focusTarget && mapInstance) {
        setTimeout(() => flyToLocation(mapInstance, focusTarget), 400)
      }
    } catch (e) {
      setJumpError(e instanceof Error ? e.message : 'AI error')
      advanceDate(period)
      setJumping(false)
    }
  }

  const handleCategoryAction = (action: string) => {
    setActionText(action)
    setActiveTab('free')
  }

  const handleStartEdit = (id: string, text: string) => { setEditingId(id); setEditText(text) }
  const handleSaveEdit = (id: string) => {
    if (editText.trim()) updatePendingAction(id, editText.trim())
    setEditingId(null); setEditText('')
  }

  const handleAiSuggest = async () => {
    const text = suggestText.trim()
    if (!text || !config) return
    setSuggestLoading(true); setSuggestError('')
    try {
      const system = `You are a geopolitical strategy advisor for ${player?.name ?? gameState.playerCountryId} on ${gameState.currentDate}. Refine the idea into one specific actionable policy decision using real place names, resource names, and institutions from ${player?.name ?? gameState.playerCountryId} (e.g. "Nationalise the Thar Coal fields" not "nationalise key industry", "Construct Gwadar free-trade zone" not "build port"). Under 20 words. Return only the action text.`
      const suggestion = await callAI(config, system, [{ role: 'user', content: text }])
      setActionText(suggestion.trim())
      setSuggestText(''); setActiveTab('free')
    } catch (e) { setSuggestError(e instanceof Error ? e.message : 'AI error') }
    finally { setSuggestLoading(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a1628] text-white overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#0d1f3c] border-b border-white/10 shrink-0">
        <span className="text-sm font-mono text-blue-300">{gameState.currentDate}</span>
        <span className="px-2 py-0.5 rounded bg-blue-900/50 text-xs text-blue-200">{gameState.era}</span>
        <span className="font-semibold">
          {gameState.empireName ?? player?.name ?? gameState.playerCountryId}
        </span>
        {gameState.empireName && (
          <span className="text-xs text-gray-500">{player?.name}</span>
        )}
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
          <button
            onClick={() => setCheatOpen(o => !o)}
            className={`px-3 py-1 rounded text-xs transition-colors font-mono ${cheatOpen ? 'bg-green-800/60 text-green-300' : 'bg-white/5 text-gray-500 hover:text-green-400 hover:bg-green-900/30'}`}
          >~</button>
          <button onClick={clearGame} className="px-3 py-1 rounded text-xs bg-white/10 hover:bg-white/20 transition-colors">New Game</button>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div className="w-80 shrink-0 flex flex-col bg-[#0d1f3c]/80 border-r border-white/10 overflow-hidden">

            {/* Tabs + collapse button */}
            <div className="flex border-b border-white/10 shrink-0">
              {(['categories', 'free', 'suggest', 'tech', 'legend'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs transition-colors ${activeTab === tab ? 'bg-blue-800/50 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {tab === 'categories' ? 'Actions' : tab === 'free' ? 'Free' : tab === 'suggest' ? 'AI' : tab === 'tech' ? 'Tech' : 'Legend'}
                </button>
              ))}
              <button onClick={() => setSidebarOpen(false)} className="px-2 text-gray-500 hover:text-white transition-colors" title="Collapse sidebar">‹</button>
            </div>

            {/* ── Categories tab ── */}
            {activeTab === 'categories' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <div className="px-3 pt-3 pb-2 border-b border-white/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sector Levels</p>
                    <div className="grid grid-cols-2 gap-1">
                      {sectors && Object.entries(sectors).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between bg-white/5 rounded px-2 py-1">
                          <span className="text-xs text-gray-400 capitalize">{key}</span>
                          <span className="text-xs text-white font-mono">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Quick Actions</p>
                    {CATEGORIES.map(cat => (
                      <div key={cat.id}>
                        <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                          className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-white/5 transition-colors text-left">
                          <span className="text-sm"><span className="mr-2">{cat.icon}</span>{cat.label}</span>
                          <span className="text-gray-500 text-xs">{expandedCat === cat.id ? '▲' : '▼'}</span>
                        </button>
                        {expandedCat === cat.id && (
                          <div className="ml-2 mb-1 space-y-1">
                            {cat.actions.map(action => (
                              <button key={action} onClick={() => handleCategoryAction(action)}
                                className="w-full text-left text-xs px-3 py-1.5 rounded bg-white/5 hover:bg-blue-800/40 text-gray-300 hover:text-white transition-colors">
                                {action}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {actionText && (
                  <div className="p-3 border-t border-white/10 shrink-0">
                    <div className="mb-2 px-2 py-1.5 rounded bg-blue-900/30 border border-blue-800/50 text-xs text-blue-200 truncate">{actionText}</div>
                    <button onClick={handleExecute} className="w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-sm font-medium transition-colors">Queue Action</button>
                  </div>
                )}
              </div>
            )}

            {/* ── Free Action tab ── */}
            {activeTab === 'free' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-3 border-b border-white/10 shrink-0">
                  <textarea
                    value={actionText}
                    onChange={e => setActionText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleExecute() } }}
                    placeholder="Describe your action… (Enter to queue)"
                    className="w-full h-20 bg-white/5 border border-white/10 rounded p-2 text-sm resize-none focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                  />
                  <button onClick={handleExecute} disabled={!actionText.trim()}
                    className="mt-2 w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors">
                    Queue Action
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {pendingActions.length > 0 && (
                    <div className="p-3 border-b border-white/10">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Queued <span className="text-blue-400 normal-case">({pendingActions.length}) — executes on Jump</span>
                      </p>
                      <div className="space-y-1.5">
                        {pendingActions.map(action => (
                          <div key={action.id} className="rounded bg-white/5 border border-white/10 px-2 py-1.5">
                            {editingId === action.id ? (
                              <div>
                                <input value={editText} onChange={e => setEditText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(action.id); if (e.key === 'Escape') setEditingId(null) }}
                                  autoFocus
                                  className="w-full bg-white/10 rounded px-2 py-0.5 text-xs text-white focus:outline-none border border-blue-500 mb-1" />
                                <div className="flex gap-1">
                                  <button onClick={() => handleSaveEdit(action.id)} className="text-xs text-green-400 hover:text-green-300">Save</button>
                                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-xs text-gray-200 flex-1 leading-relaxed">{action.text}</span>
                                <div className="flex gap-1 shrink-0 ml-1">
                                  <button onClick={() => handleStartEdit(action.id, action.text)} className="text-xs text-gray-500 hover:text-blue-400" title="Edit">✎</button>
                                  <button onClick={() => removePendingAction(action.id)} className="text-xs text-gray-500 hover:text-red-400" title="Remove">✕</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 space-y-2">
                    {lastResults.length > 0 && (
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Results</p>
                    )}
                    {jumpError && <p className="text-xs text-red-400 mb-2">{jumpError}</p>}
                    {/* Natural disaster alerts */}
                    {recentDisasters.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {recentDisasters.slice(0, 3).map(d => (
                          <div key={d.id} className="rounded border border-orange-800/40 bg-orange-900/20 px-3 py-2">
                            <p className="text-xs font-semibold text-orange-300">⚠ {d.name}</p>
                            <p className="text-xs text-orange-200/70 mt-0.5">{d.description} GDP loss: ${(d.gdpLoss/1e9).toFixed(1)}B</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Build queue */}
                    {buildQueue.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Under Construction</p>
                        <div className="space-y-1">
                          {buildQueue.map(p => (
                            <div key={p.id} className="rounded bg-white/5 px-2 py-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">{p.name}</span>
                                <span className="text-gray-500">{p.weeksRemaining}w left</span>
                              </div>
                              <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${Math.round((1 - p.weeksRemaining / p.totalWeeks) * 100)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Research queue */}
                    {researchQueue.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Research</p>
                        <div className="space-y-1">
                          {researchQueue.map(p => (
                            <div key={p.id} className="rounded bg-white/5 px-2 py-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300 capitalize">{p.techId.replace(/_/g, ' ')}</span>
                                <span className="text-gray-500">{p.weeksRemaining}w left</span>
                              </div>
                              <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full transition-all"
                                  style={{ width: `${Math.round((1 - p.weeksRemaining / p.totalWeeks) * 100)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {lastResults.length === 0 && pendingActions.length === 0 && buildQueue.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-4">Queue actions above, then press Jump to execute them.</p>
                    )}
                    {lastResults.map((result: ActionResult) => (
                      <div key={result.actionId}
                        className="rounded border border-white/10 overflow-hidden">
                        {/* Header — always visible */}
                        <button
                          onClick={() => setExpandedResult(expandedResult === result.actionId ? null : result.actionId)}
                          className="w-full text-left p-3 hover:bg-white/5 transition-colors">
                          <p className="text-sm font-medium leading-snug">{result.summary}</p>
                          {/* Stat pills always visible */}
                          {Object.entries(result.statDeltas).filter(([,v]) => v !== 0).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(result.statDeltas).filter(([,v]) => v !== 0).map(([key, val]) => (
                                <span key={key} className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${val > 0 ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}`}>
                                  {key === 'gdp' ? (val > 0 ? '+' : '') + formatStat(val) : (val > 0 ? '+' : '') + val + ' ' + key}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">{expandedResult === result.actionId ? '▲ hide detail' : '▼ show detail'}</p>
                        </button>

                        {/* Expanded detail */}
                        {expandedResult === result.actionId && (
                          <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3 bg-black/20">
                            <p className="text-xs text-gray-200 leading-relaxed">{result.fullNarrative}</p>

                            {/* Domestic reaction */}
                            {result.domesticReaction && (
                              <div className="rounded bg-amber-900/20 border border-amber-800/30 px-2 py-1.5">
                                <p className="text-xs text-amber-200/70 uppercase tracking-wider mb-0.5">Public reaction</p>
                                <p className="text-xs text-amber-100 leading-relaxed">{result.domesticReaction}</p>
                              </div>
                            )}

                            {/* World reaction */}
                            {result.worldReaction && (
                              <p className="text-xs text-blue-300/80 italic leading-relaxed">{result.worldReaction}</p>
                            )}

                            {/* Country reactions */}
                            {result.countryReactions && result.countryReactions.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">International responses</p>
                                {result.countryReactions.map((cr, i) => (
                                  <div key={i} className={`rounded px-2 py-1.5 flex gap-2 items-start ${
                                    cr.stance === 'positive' ? 'bg-green-900/20 border border-green-800/30' :
                                    cr.stance === 'negative' ? 'bg-red-900/20 border border-red-800/30' :
                                    'bg-white/5 border border-white/10'
                                  }`}>
                                    <span className="text-xs shrink-0 mt-0.5">
                                      {cr.stance === 'positive' ? '🟢' : cr.stance === 'negative' ? '🔴' : '🟡'}
                                    </span>
                                    <div>
                                      <span className="text-xs font-medium text-white">{cr.country}: </span>
                                      <span className="text-xs text-gray-300 italic">"{cr.quote}"</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tags */}
                            {result.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {result.tags.map(tag => (
                                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── AI Suggest tab ── */}
            {activeTab === 'suggest' && (
              <div className="flex flex-col flex-1 p-3">
                <p className="text-xs text-gray-400 mb-2">Describe a goal — AI will refine it into a precise action and send it to Free Action.</p>
                <textarea value={suggestText} onChange={e => setSuggestText(e.target.value)}
                  placeholder="e.g. I want to become dominant in East Asia…"
                  className="w-full h-28 bg-white/5 border border-white/10 rounded p-2 text-sm resize-none focus:outline-none focus:border-blue-500 text-white placeholder-gray-500" />
                {suggestError && <p className="text-xs text-red-400 mt-1">{suggestError}</p>}
                <button onClick={handleAiSuggest} disabled={!suggestText.trim() || suggestLoading || !config}
                  className="mt-2 w-full py-1.5 rounded bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors">
                  {suggestLoading ? 'Thinking…' : 'AI Suggest →'}
                </button>
                {!config && <p className="text-xs text-amber-400 mt-3 text-center">No AI configured — set up your API key on the setup screen.</p>}
              </div>
            )}

            {/* ── Tech tab ── */}
            {activeTab === 'tech' && <TechTreePanel />}

            {/* ── Legend tab ── */}
            {activeTab === 'legend' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-4">

                {/* City dots */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Cities</p>
                  <div className="space-y-1.5">
                    {LEGEND_ITEMS.map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0 border border-[#0a1628]"
                          style={{ backgroundColor: item.color, boxShadow: `0 0 4px ${item.color}` }} />
                        <div>
                          <span className="text-xs text-white">{item.label}</span>
                          <span className="text-xs text-gray-500 ml-1">— {item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Infrastructure by group */}
                {INFRA_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{group.label}</p>
                    <div className="space-y-1.5">
                      {group.items.map(type => {
                        const colour = INFRA_COLOURS[type as keyof typeof INFRA_COLOURS]
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                              style={{ backgroundColor: colour, boxShadow: `0 0 6px ${colour}80` }} />
                            <span className="text-xs text-white">{INFRA_LABELS[type] ?? type}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Rail lines */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Rail Lines</p>
                  <div className="space-y-1.5">
                    {Object.entries(RAIL_COLOURS).map(([type, colour]) => (
                      <div key={type} className="flex items-center gap-2">
                        <div className="w-6 h-1 rounded shrink-0" style={{ backgroundColor: colour }} />
                        <span className="text-xs text-white capitalize">{type.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Country colours */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Countries</p>
                  <p className="text-xs text-gray-400">Each country has a unique colour. Yours appears lighter.</p>
                </div>

                {/* Zoom guide */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Zoom Guide</p>
                  <div className="space-y-0.5 text-xs text-gray-400">
                    <p>1–5 · Country names</p>
                    <p>4+ · Major cities</p>
                    <p>5+ · City labels</p>
                    <p>4+ · Infrastructure dots (zoom in to see)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Collapse toggle (when sidebar hidden) ── */}
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-16 bg-[#0d1f3c]/90 border border-white/10 rounded-r flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-900/50 transition-colors"
            title="Open sidebar">›</button>
        )}

        {/* ── Map ── */}
        <div className="flex-1 relative">
          <WorldMap>
            <CountryLayer />
            <DamageLayer />
            <CitiesLayer />
            <InfraLayer />
            <RailLayer />
            <LandUseLayer />
          </WorldMap>
          <OrgPanel />
          {/* Floating panels — stacked bottom-right */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
            <DiplomacyPanel gameContext={{
              playerCountry: player?.name ?? gameState.playerCountryId,
              currentDate: gameState.currentDate,
              era: gameState.era,
              yesman: gameState.yesman ?? false,
              countryNames: Object.values(gameState.countries).map(c => c.name).filter(n => n !== (player?.name ?? '')),
              stats: stats as unknown as Record<string, number> ?? {},
              recentHistory,
              warDamageSummary,
            }} />
            <AdvisorPanel gameContext={{ playerCountry: player?.name ?? gameState.playerCountryId, currentDate: gameState.currentDate, era: gameState.era, stats: stats as unknown as Record<string, number> ?? {}, topCountries, recentHistory, warDamageSummary }} />
          </div>
        </div>
      </div>

      {/* ── Cheat Console ── */}
      {cheatOpen && <CheatMenu onClose={() => setCheatOpen(false)} />}

      {/* ── Time Bar ── */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 bg-[#0d1f3c] border-t border-white/10 shrink-0">
        {(['week', 'month', 'year'] as const).map(period => (
          <button key={period} onClick={() => handleJump(period)} disabled={isJumping}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">
            {isJumping ? '…' : `Jump ${period.charAt(0).toUpperCase() + period.slice(1)}`}
          </button>
        ))}
        <button onClick={() => handleJump('week')} disabled={isJumping}
          className="px-4 py-1.5 rounded bg-white/10 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">
          {isJumping ? 'Processing…' : 'Next Event'}
        </button>
        {pendingActions.length > 0 && !isJumping && (
          <span className="text-xs text-blue-300 ml-2">{pendingActions.length} action{pendingActions.length > 1 ? 's' : ''} queued</span>
        )}
        {isJumping && <span className="text-xs text-amber-300 ml-2 animate-pulse">AI processing actions…</span>}
      </div>
    </div>
  )
}
