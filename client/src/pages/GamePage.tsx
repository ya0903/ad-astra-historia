import { useState, useEffect } from 'react'
import { useGameStore, useConfigStore, useMapStore } from '../stores'
import { saveGame } from '../lib/api'
import { callAI } from '../lib/aiClient'
import { WorldMap, CountryLayer, CountryLabelOverlay, CitiesLayer, InfraLayer, RailLayer, RiversLayer, BiomesLayer, LandUseLayer, DamageLayer } from '../components/map'
import { flyToLocation } from '../lib/mapFly'
import OrgPanel from '../components/OrgPanel'
import AdvisorPanel from '../components/AdvisorPanel'
import DiplomacyPanel from '../components/DiplomacyPanel'
import CheatMenu from '../components/CheatMenu'
import TechTreePanel from '../components/TechTreePanel'
import LorePanel from '../components/LorePanel'
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

// ── JSON repair — fixes common LLM output issues ──────────────────────────────
function repairJson(raw: string): string {
  // Strip markdown code fences (```json … ```)
  let s = raw.replace(/^```(?:json)?\s*/gm, '').replace(/^```\s*$/gm, '').trim()

  // Find the start of the outermost { ... } object
  const start = s.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in AI response')

  // Walk forward to find the matching closing } — bracket matching instead of
  // lastIndexOf. lastIndexOf fails when the LLM appends commentary that itself
  // contains { } (e.g. "GDP is {estimated at $5B}"), which was causing the
  // "Unexpected non-whitespace character after JSON" error.
  let depth = 0, end = -1
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}') { if (--depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error('Unclosed JSON object in AI response')
  s = s.slice(start, end + 1)

  // Fix single-quoted PROPERTY NAMES only: {'key': → {"key":
  // Intentionally does NOT touch values — the value repair that was here
  // (/([:,\[]\s*)'([^'…]*?)'/g) would match `: 'he said'` patterns INSIDE
  // already double-quoted strings (e.g. "quote": "Iran said: 'we oppose'"),
  // inserting a rogue `"` mid-string and breaking the parse.
  s = s.replace(/'([^'\n\r]{0,80})'(\s*:)/g, '"$1"$2')

  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, '$1')

  // Python-style literals
  s = s.replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')

  return s
}

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
  { label: 'Transport', items: ['port', 'airport', 'rail_line', 'high_speed_rail'] },
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
  rail_line: 'Rail Line', high_speed_rail: 'High-Speed Rail',
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
  const [loreOpen, setLoreOpen] = useState(false)
  const [timelineIdx, setTimelineIdx] = useState<number | null>(null)

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
{"results":[{"actionId":"<id>","summary":"<1 sentence using specific names>","fullNarrative":"<2 sentences with specific places/names>","worldReaction":"<1 sentence>","domesticReaction":"<1 sentence — specific public/media reaction>","countryReactions":[{"country":"<neighbour/rival>","stance":"positive|negative|neutral","quote":"<brief quoted reaction>"}],"statDeltas":{"gdp":<USD delta>,"military":<integer, 0 unless military action>,"approval":<-5..5>,"softPower":<integer, 0 unless diplomacy/culture>,"techLevel":<integer, 0 unless tech/research>},"tags":["<tag>"],"focusIso":"<ISO_A3 of the most relevant country — always include>","buildProject":{"type":"<infra_type>","name":"<specific real-world name>","city":"<city name for point infra>","fromCity":"<departure city for rail only>","toCity":"<destination city for rail only>"},"nuclearStrike":["<ISO_A3>"],"bombardment":["<ISO_A3>"],"empireName":"<only if conquest/annexation>","annexedCountry":"<ISO_A3 if annexed>"}]}

buildProject: ONLY include when the action physically constructs a facility or route. Use exactly one of these types: university, research_centre, port, airport, solar_farm, wind_farm, hydro_dam, fossil_fuel_plant, nuclear_plant, military_base, nuclear_silo, defence_system, financial_institution, industrial_zone, data_centre, desalination_plant, telecom_node, stadium, arts_centre, film_studio, embassy, rail_line, high_speed_rail. The name must be a specific real-world name (e.g. "Islamabad Institute of Technology", "Gwadar Deep-Water Port", "Lahore–Karachi HSR"). For point infrastructure always include "city" (the nearest city, e.g. "Karachi"). For rail_line and high_speed_rail always include "fromCity" and "toCity" (the two terminal cities, e.g. "Lahore" and "Karachi"). Omit buildProject entirely for non-construction actions.
nuclearStrike: include ISO_A3 of any country hit by nuclear weapons (omit if none).
bombardment: include ISO_A3 of any country heavily bombed/invaded (omit if none).

2-3 countryReactions from realistic neighbours/rivals.`

      const raw = await callAI(config, system, [{ role: 'user', content: prompt }])
      const parsed = JSON.parse(repairJson(raw)) as { results: ActionResult[] }
      // Post-process: clamp deltas to prevent irrelevant stat changes
      const clampedResults = (parsed.results ?? []).map(r => sanitiseDeltas(r, pendingActions))
      applyResults(clampedResults, period)
      if (clampedResults.length > 0) setTimelineIdx(0)
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
    addPendingAction(action)
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

  const timelineResult = timelineIdx !== null ? lastResults[timelineIdx] : null
  const lore = gameState.lore ?? []

  return (
    <div className="h-screen w-screen flex bg-[#060d1a] text-white overflow-hidden relative">

      {/* ── Left Sidebar ── */}
      {sidebarOpen && (
        <div className="w-72 shrink-0 flex flex-col bg-[#080f1e]/95 border-r border-white/8 overflow-hidden z-20">

          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
            <div>
              <p className="text-xs font-bold text-white tracking-widest uppercase">
                {gameState.empireName ?? player?.name ?? gameState.playerCountryId}
              </p>
              {gameState.empireName && <p className="text-[10px] text-gray-500 mt-0.5">{player?.name}</p>}
            </div>
            <button onClick={() => setSidebarOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-xs">‹</button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-1 px-3 py-2 border-b border-white/5 shrink-0">
            {[
              { label: 'GDP', value: formatStat(stats?.gdp ?? 0) },
              { label: 'Military', value: String(stats?.military ?? 0) },
              { label: 'Approval', value: `${stats?.approval ?? 0}%` },
              { label: 'Soft Power', value: String(stats?.softPower ?? 0) },
              { label: 'Tech', value: String(stats?.techLevel ?? 0) },
              { label: 'Era', value: gameState.era.split(' ')[0] },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between bg-white/[0.04] rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
                <span className="text-xs text-white font-mono font-medium">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/8 shrink-0">
            {(['categories', 'free', 'suggest', 'tech', 'legend'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-950/30'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                {tab === 'categories' ? 'Act' : tab === 'free' ? 'Free' : tab === 'suggest' ? 'AI' : tab === 'tech' ? 'Tech' : 'Map'}
              </button>
            ))}
          </div>

          {/* ── Categories tab ── */}
          {activeTab === 'categories' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="px-3 pt-3 pb-2 border-b border-white/5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Sector Levels</p>
                  <div className="grid grid-cols-2 gap-1">
                    {sectors && Object.entries(sectors).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-2 py-1">
                        <span className="text-[10px] text-gray-500 capitalize">{key}</span>
                        <span className="text-xs text-white font-mono">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-3 py-2 space-y-0.5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Quick Actions</p>
                  {CATEGORIES.map(cat => (
                    <div key={cat.id}>
                      <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors text-left">
                        <span className="text-xs text-gray-300"><span className="mr-2 text-sm">{cat.icon}</span>{cat.label}</span>
                        <span className="text-gray-600 text-[10px]">{expandedCat === cat.id ? '▲' : '▼'}</span>
                      </button>
                      {expandedCat === cat.id && (
                        <div className="ml-3 mb-1 space-y-0.5">
                          {cat.actions.map(action => (
                            <button key={action} onClick={() => handleCategoryAction(action)}
                              className="w-full text-left text-xs px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-blue-900/30 text-gray-400 hover:text-white transition-colors">
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Free Action tab ── */}
          {activeTab === 'free' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-3 border-b border-white/8 shrink-0">
                <textarea
                  value={actionText}
                  onChange={e => setActionText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleExecute() } }}
                  placeholder="Describe your action… (Enter to queue)"
                  className="w-full h-20 bg-white/[0.04] border border-white/10 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-500/50 text-white placeholder-gray-600"
                />
                <button onClick={handleExecute} disabled={!actionText.trim()}
                  className="mt-2 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20">
                  Queue Action
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {jumpError && <p className="text-xs text-red-400 mb-2 px-1">{jumpError}</p>}

                {/* Pending actions */}
                {pendingActions.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 px-1">
                      Queued ({pendingActions.length})
                    </p>
                    <div className="space-y-1">
                      {pendingActions.map(action => (
                        <div key={action.id} className="rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2">
                          {editingId === action.id ? (
                            <div>
                              <input value={editText} onChange={e => setEditText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(action.id); if (e.key === 'Escape') setEditingId(null) }}
                                autoFocus
                                className="w-full bg-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none border border-blue-500/50 mb-1.5" />
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveEdit(action.id)} className="text-xs text-green-400 hover:text-green-300">Save</button>
                                <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-xs text-gray-300 flex-1 leading-relaxed">{action.text}</span>
                              <div className="flex gap-1.5 shrink-0 ml-1 mt-0.5">
                                <button onClick={() => handleStartEdit(action.id, action.text)} className="text-gray-600 hover:text-blue-400 transition-colors" title="Edit">✎</button>
                                <button onClick={() => removePendingAction(action.id)} className="text-gray-600 hover:text-red-400 transition-colors text-xs" title="Remove">✕</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Natural disaster alerts */}
                {recentDisasters.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 px-1">Disasters</p>
                    {recentDisasters.slice(0, 3).map(d => (
                      <div key={d.id} className="rounded-xl border border-orange-800/30 bg-orange-950/30 px-3 py-2 mb-1">
                        <p className="text-xs font-semibold text-orange-300">⚠ {d.name}</p>
                        <p className="text-[10px] text-orange-300/60 mt-0.5">{d.description} — GDP loss: ${(d.gdpLoss/1e9).toFixed(1)}B</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Build queue */}
                {buildQueue.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 px-1">Construction</p>
                    <div className="space-y-1">
                      {buildQueue.map(p => (
                        <div key={p.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-300">{p.name}</span>
                            <span className="text-gray-600 font-mono">{p.weeksRemaining}w</span>
                          </div>
                          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
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
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 px-1">Research</p>
                    <div className="space-y-1">
                      {researchQueue.map(p => (
                        <div key={p.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-300 capitalize">{p.techId.replace(/_/g, ' ')}</span>
                            <span className="text-gray-600 font-mono">{p.weeksRemaining}w</span>
                          </div>
                          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${Math.round((1 - p.weeksRemaining / p.totalWeeks) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingActions.length === 0 && buildQueue.length === 0 && recentDisasters.length === 0 && (
                  <p className="text-xs text-gray-700 text-center py-6">Queue actions above, then press Jump to execute.</p>
                )}
              </div>
            </div>
          )}

          {/* ── AI Suggest tab ── */}
          {activeTab === 'suggest' && (
            <div className="flex flex-col flex-1 p-3">
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">Describe a goal — AI will turn it into a precise action.</p>
              <textarea value={suggestText} onChange={e => setSuggestText(e.target.value)}
                placeholder="e.g. I want to dominate East Asian trade…"
                className="w-full h-28 bg-white/[0.04] border border-white/10 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-purple-500/50 text-white placeholder-gray-600" />
              {suggestError && <p className="text-xs text-red-400 mt-2">{suggestError}</p>}
              <button onClick={handleAiSuggest} disabled={!suggestText.trim() || suggestLoading || !config}
                className="mt-2 w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold transition-colors">
                {suggestLoading ? 'Thinking…' : 'Suggest →'}
              </button>
              {!config && <p className="text-xs text-amber-400/70 mt-3 text-center">No AI configured.</p>}
            </div>
          )}

          {/* ── Tech tab ── */}
          {activeTab === 'tech' && <TechTreePanel />}

          {/* ── Legend tab ── */}
          {activeTab === 'legend' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Cities</p>
                <div className="space-y-1.5">
                  {LEGEND_ITEMS.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color, boxShadow: `0 0 4px ${item.color}` }} />
                      <span className="text-xs text-gray-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {INFRA_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">{group.label}</p>
                  <div className="space-y-1.5">
                    {group.items.map(type => {
                      const colour = INFRA_COLOURS[type as keyof typeof INFRA_COLOURS]
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour, boxShadow: `0 0 5px ${colour}80` }} />
                          <span className="text-xs text-gray-400">{INFRA_LABELS[type] ?? type}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Rail Lines</p>
                <div className="space-y-1.5">
                  {Object.entries(RAIL_COLOURS).map(([type, colour]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-5 h-0.5 rounded shrink-0" style={{ backgroundColor: colour }} />
                      <span className="text-xs text-gray-400 capitalize">{type.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Terrain</p>
                <div className="space-y-1.5">
                  {[
                    { color: 'rgba(210,175,60,0.7)',   label: 'Desert / Arid' },
                    { color: 'rgba(30,110,50,0.7)',    label: 'Forest / Rainforest' },
                    { color: 'rgba(120,165,55,0.7)',   label: 'Grassland / Savanna' },
                    { color: 'rgba(30,140,130,0.7)',   label: 'Wetlands / Marsh' },
                    { color: 'rgba(160,180,200,0.7)',  label: 'Alpine / Highland' },
                    { color: 'rgba(200,230,255,0.7)',  label: 'Tundra / Ice' },
                    { color: '#38bdf8',                label: 'Rivers' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm shrink-0 border border-white/10" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sidebar open tab */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-14 bg-[#080f1e]/90 border border-white/10 border-l-0 rounded-r-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-blue-900/40 transition-colors">›</button>
      )}

      {/* ── Map area ── */}
      <div className="flex-1 relative overflow-hidden">
        <WorldMap>
          <CountryLayer />
          <BiomesLayer />
          <RiversLayer />
          <CountryLabelOverlay />
          <DamageLayer />
          <CitiesLayer />
          <InfraLayer />
          <RailLayer />
          <LandUseLayer />
        </WorldMap>
        <OrgPanel />

        {/* ── Top HUD ── */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pt-3 pointer-events-none z-10">
          {/* Date + era pill */}
          <div className="pointer-events-auto flex items-center gap-2 bg-[#080f1e]/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 shadow-xl">
            <span className="text-sm font-mono text-white font-semibold">{gameState.currentDate}</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="text-[10px] text-blue-300 uppercase tracking-wider">{gameState.era}</span>
          </div>

          {/* Right HUD: Lore + Save + New Game */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button onClick={() => setLoreOpen(o => !o)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-md text-xs font-semibold transition-all shadow-xl ${
                loreOpen
                  ? 'bg-amber-900/60 border-amber-700/60 text-amber-200'
                  : 'bg-[#080f1e]/80 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
              }`}>
              <span>📖</span>
              <span>Lore</span>
              {lore.length > 0 && <span className="bg-amber-600/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{lore.length}</span>}
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#080f1e]/80 backdrop-blur-md border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-all shadow-xl font-semibold">
              {saveStatus === 'saving' ? '⏳' : saveStatus === 'saved' ? '✓' : saveStatus === 'error' ? '!' : '💾'}
              <span>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}</span>
            </button>
            <button onClick={clearGame}
              className="px-3 py-2 rounded-xl bg-[#080f1e]/80 backdrop-blur-md border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all shadow-xl font-semibold">
              New Game
            </button>
          </div>
        </div>

        {/* ── Timeline event card (Pax Historia style) ── */}
        {timelineResult != null && (
          <div className="absolute top-16 left-4 z-20 w-80 bg-[#070d1c] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/8">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Timeline</p>
                <p className="text-[10px] text-gray-600 font-mono mt-0.5">from {gameState.currentDate}</p>
              </div>
              <button onClick={() => setTimelineIdx(null)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-xs">✕</button>
            </div>

            {/* Country tags */}
            {timelineResult.countryReactions && timelineResult.countryReactions.length > 0 && (
              <div className="flex flex-wrap gap-1 px-4 pt-2">
                {timelineResult.countryReactions.map(cr => (
                  <span key={cr.country} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    cr.stance === 'positive' ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300' :
                    cr.stance === 'negative' ? 'bg-red-950/60 border-red-800/40 text-red-300' :
                    'bg-white/5 border-white/10 text-gray-400'
                  }`}>{cr.country}</span>
                ))}
              </div>
            )}

            {/* Title */}
            <div className="px-4 py-3">
              <h3 className="text-sm font-bold text-white leading-snug uppercase tracking-wide">{timelineResult.summary}</h3>
            </div>

            {/* Narrative */}
            <div className="px-4 pb-3 max-h-48 overflow-y-auto">
              <p className="text-xs text-gray-300 leading-relaxed">{timelineResult.fullNarrative}</p>

              {timelineResult.domesticReaction && (
                <div className="mt-2 rounded-xl bg-amber-950/40 border border-amber-800/20 px-3 py-2">
                  <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-0.5">Public</p>
                  <p className="text-xs text-amber-200/80 leading-relaxed">{timelineResult.domesticReaction}</p>
                </div>
              )}

              {timelineResult.worldReaction && (
                <p className="text-xs text-blue-300/70 italic mt-2 leading-relaxed">{timelineResult.worldReaction}</p>
              )}
            </div>

            {/* Stat deltas */}
            {Object.entries(timelineResult.statDeltas).filter(([,v]) => v !== 0).length > 0 && (
              <div className="flex flex-wrap gap-1 px-4 pb-2">
                {Object.entries(timelineResult.statDeltas).filter(([,v]) => v !== 0).map(([key, val]) => (
                  <span key={key} className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${val > 0 ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300' : 'bg-red-950/60 border-red-800/40 text-red-300'}`}>
                    {key === 'gdp' ? (val > 0 ? '+' : '') + formatStat(val) : (val > 0 ? '+' : '') + val + ' ' + key}
                  </span>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-white/8">
              <button
                onClick={() => setTimelineIdx(i => i !== null && i > 0 ? i - 1 : i)}
                disabled={timelineIdx === 0}
                className="px-3 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors font-medium">
                ← Prev
              </button>
              <span className="text-[10px] text-gray-600 flex-1 text-center font-mono">
                {(timelineIdx ?? 0) + 1} / {lastResults.length}
              </span>
              <button
                onClick={() => setTimelineIdx(i => i !== null && i < lastResults.length - 1 ? i + 1 : i)}
                disabled={timelineIdx === lastResults.length - 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors font-semibold">
                Next Event →
              </button>
            </div>
          </div>
        )}

        {/* ── Bottom-right floating buttons ── */}
        <div className="absolute bottom-20 right-4 z-10 flex flex-col items-end gap-2">
          <AdvisorPanel gameContext={{ playerCountry: player?.name ?? gameState.playerCountryId, currentDate: gameState.currentDate, era: gameState.era, stats: stats as unknown as Record<string, number> ?? {}, topCountries, recentHistory, warDamageSummary }} />
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
          <button onClick={() => setCheatOpen(o => !o)}
            className={`w-10 h-10 rounded-full border shadow-xl flex items-center justify-center text-xs font-mono transition-all ${
              cheatOpen ? 'bg-green-800 border-green-600 text-green-200' : 'bg-[#0d1f3c] border-white/20 text-gray-400 hover:text-green-400 hover:border-green-700'
            }`} title="Cheat console">~</button>
        </div>

        {/* ── Jump Forward controls ── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {isJumping ? (
            <div className="flex items-center gap-3 bg-[#080f1e]/90 backdrop-blur-md border border-blue-700/40 rounded-2xl px-6 py-3 shadow-2xl">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-300 font-semibold">Processing…</span>
            </div>
          ) : (
            <>
              {(['week', 'month', 'year'] as const).map(period => (
                <button key={period} onClick={() => handleJump(period)}
                  className="px-4 py-2.5 rounded-xl bg-[#080f1e]/85 backdrop-blur-md border border-white/10 hover:border-blue-500/50 hover:bg-blue-950/50 text-sm font-semibold text-gray-300 hover:text-white transition-all shadow-xl">
                  +{period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
              <button onClick={() => handleJump('month')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500/50 text-sm font-bold text-white transition-all shadow-2xl shadow-blue-900/40">
                <span>▶</span>
                <div className="text-left">
                  <div className="text-xs font-bold leading-none">Jump Forward</div>
                  <div className="text-[9px] text-blue-200/70 leading-none mt-0.5">Simulate Future Events</div>
                </div>
              </button>
              {pendingActions.length > 0 && (
                <span className="text-xs text-blue-300 font-semibold bg-blue-900/40 rounded-xl px-3 py-2.5 border border-blue-800/30">
                  {pendingActions.length} queued
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Lore Panel (right side) ── */}
      {loreOpen && (
        <LorePanel
          entries={lore}
          currentDate={gameState.currentDate}
          onClose={() => setLoreOpen(false)}
        />
      )}

      {/* ── Cheat Console ── */}
      {cheatOpen && <CheatMenu onClose={() => setCheatOpen(false)} />}
    </div>
  )
}
