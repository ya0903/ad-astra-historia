import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore, useConfigStore, useMapStore, useAuthStore, useRailDrawStore } from '../stores'
import { logout } from '../lib/api'
import { saveGame } from '../lib/api'
import { callAI } from '../lib/aiClient'
import { WorldMap, CountryLayer, CountryLabelOverlay, CitiesLayer, InfraLayer, RailLayer, RailDrawOverlay, RiversLayer, LakesLayer, BiomesLayer, LandUseLayer, DamageLayer, ProvincesLayer, AncientProvincesLayer, LandmarksLayer, PlanetMap } from '../components/map'
import RailDrawPanel from '../components/RailDrawPanel'
import { flyToLocation } from '../lib/mapFly'
import OrgPanel from '../components/OrgPanel'
import AdvisorPanel from '../components/AdvisorPanel'
import DiplomacyPanel from '../components/DiplomacyPanel'
import CheatMenu from '../components/CheatMenu'
import TechTreeFullscreen from '../components/TechTreeFullscreen'
import LorePanel from '../components/LorePanel'
import PauseMenu from '../components/PauseMenu'
import NewsPanel from '../components/NewsPanel'
import EconomyPanel from '../components/EconomyPanel'
import MilitaryPanel from '../components/MilitaryPanel'
import PoliticsPanel from '../components/PoliticsPanel'
import SocietyPanel from '../components/SocietyPanel'
import EspionagePanel from '../components/EspionagePanel'
import PlanetSwitcher from '../components/PlanetSwitcher'
import { INFRA_COLOURS, RAIL_COLOURS } from '@ad-astra/shared/infraColours'
import type { ActionResult, WorldEvent } from '@ad-astra/shared/types'
import { getCountryResources } from '@ad-astra/shared/countryResources'

// ── Categories ───────────────────────────────────────────────────────────────

interface Category { id: string; label: string; icon: string; actions: string[] }

const CATEGORIES_MODERN: Category[] = [
  { id: 'economy', label: 'Economy & Finance', icon: '💰', actions: ['Raise income tax', 'Cut corporate tax', 'Issue government bonds', 'Nationalise key industry', 'Attract foreign investment', 'Launch stimulus package'] },
  { id: 'military', label: 'Military & Defence', icon: '⚔️', actions: ['Increase defence budget', 'Build military base', 'Conscription drive', 'Purchase weapons systems', 'Deploy peacekeeping force', 'Conduct military exercise'] },
  { id: 'diplomacy', label: 'Diplomacy', icon: '🤝', actions: ['Propose trade agreement', 'Form military alliance', 'Request UN mediation', 'Impose sanctions', 'Open embassy', 'Offer humanitarian aid'] },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️', actions: ['Build airport', 'Construct port', 'Lay high-speed rail', 'Build power plant', 'Construct data centre', 'Build university'] },
  { id: 'technology', label: 'Technology & Research', icon: '🔬', actions: ['Fund R&D programme', 'Build research centre', 'Recruit foreign talent', 'Launch tech summit', 'Invest in AI', 'Develop semiconductor industry'] },
  { id: 'environment', label: 'Environment', icon: '🌿', actions: ['Plant national forest', 'Create national park', 'Build desalination plant', 'Launch carbon tax', 'Desert reforestation project', 'Invest in renewables'] },
  { id: 'culture', label: 'Culture & Soft Power', icon: '🎭', actions: ['Bid for Olympics', 'Build national stadium', 'Fund film industry', 'Host world summit', 'Launch tourism campaign', 'Promote education abroad'] },
  { id: 'space', label: 'Space Programme', icon: '🚀', actions: ['Launch satellite programme', 'Build launch facility', 'Moon mission proposal', 'Mars colonisation plan', 'Asteroid mining initiative', 'International space partnership'] },
  { id: 'espionage', label: 'Intelligence & Espionage', icon: '🕵️', actions: ['Establish intelligence agency', 'Increase espionage budget', 'Stage coup in target country', 'Steal advanced technology', 'Fund rebel groups abroad', 'Recruit double agent in rival government', 'Launch disinformation campaign', 'Sabotage enemy nuclear programme', 'Infiltrate terrorist network', 'Covert arms supply to proxy'] },
]

const CATEGORIES_ANCIENT: Category[] = [
  { id: 'military', label: 'Military & War', icon: '⚔️', actions: ['Raise a new legion', 'Train cavalry regiment', 'Recruit light horsemen', 'Forge iron weapons', 'Conscript citizen-soldiers', 'Conduct military exercises', 'Build siege weapons', 'Construct fortified camp', 'Train naval fleet'] },
  { id: 'conquest', label: 'Conquest & Expansion', icon: '🏰', actions: ['Declare war on a neighbour', 'Launch invasion campaign', 'Besiege enemy city', 'Raid border territories', 'Send punitive expedition', 'Subjugate a tribe'] },
  { id: 'diplomacy', label: 'Diplomacy & Alliances', icon: '🤝', actions: ['Forge military alliance', 'Propose peace treaty', 'Send diplomatic envoy', 'Arrange royal marriage', 'Take noble hostages', 'Pay tribute to greater power', 'Grant autonomy to vassal', 'Demand tribute from subject'] },
  { id: 'economy', label: 'Economy & Trade', icon: '💰', actions: ['Issue new coinage', 'Open trade route', 'Tax agricultural surplus', 'Establish market town', 'Grant merchant guild charter', 'Seize enemy treasury', 'Loot conquered city', 'Collect tribute'] },
  { id: 'infrastructure', label: 'Engineering & Building', icon: '🏛️', actions: ['Build aqueduct', 'Construct road network', 'Build harbour', 'Fortify city walls', 'Build granary', 'Construct watchtower line', 'Build qanat irrigation', 'Construct amphitheatre'] },
  { id: 'religion', label: 'Religion & Culture', icon: '🏺', actions: ['Build great temple', 'Host Olympic games', 'Commission great statue', 'Sponsor philosophical school', 'Declare state religion', 'Persecute rival cult', 'Issue religious tolerance edict', 'Construct great library'] },
  { id: 'administration', label: 'Governance & Law', icon: '📜', actions: ['Codify laws', 'Appoint provincial governor', 'Grant citizenship to allies', 'Establish colony', 'Issue land reforms', 'Impose direct taxation', 'Grant amnesty to rebels', 'Purge corrupt officials'] },
  { id: 'knowledge', label: 'Knowledge & Scholarship', icon: '📚', actions: ['Patronise philosophers', 'Fund astronomical observatory', 'Establish medical school', 'Commission maps of the known world', 'Recruit foreign scholars', 'Translate foreign texts'] },
  { id: 'naval', label: 'Naval & Exploration', icon: '⚓', actions: ['Build war galley fleet', 'Train naval archers', 'Establish coastal trading post', 'Send exploratory fleet westward', 'Chart unknown ocean waters', 'Establish colony across the sea', 'Commission ocean-going caravel', 'Recruit experienced navigators', 'Establish naval supply depot', 'Launch transatlantic expedition', 'Claim new territory in the Americas', 'Establish Pacific spice route'] },
]

const CATEGORIES_INDUSTRIAL: Category[] = [
  { id: 'economy', label: 'Industry & Finance', icon: '🏭', actions: ['Build factory', 'Issue railway bonds', 'Nationalise coal mines', 'Attract foreign capital', 'Charter joint-stock company', 'Abolish corn laws', 'Establish stock exchange'] },
  { id: 'military', label: 'Military & Expansion', icon: '⚔️', actions: ['Raise conscript army', 'Modernise artillery', 'Build ironclad warship', 'Fund rifle infantry', 'Deploy colonial garrison', 'Commission armoured train', 'Purchase field guns'] },
  { id: 'diplomacy', label: 'Diplomacy', icon: '🤝', actions: ['Sign trade treaty', 'Form entente', 'Negotiate colonial boundary', 'Open embassy in major power', 'Attend international congress', 'Invoke Monroe Doctrine'] },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️', actions: ['Build railway line', 'Construct coal mine', 'Build steel foundry', 'Lay telegraph line', 'Construct deepwater port', 'Build industrial zone'] },
  { id: 'technology', label: 'Technology', icon: '🔬', actions: ['Fund steam engine research', 'Patent new invention', 'Recruit industrial chemist', 'Build mechanical workshop', 'Establish technical school', 'Invest in electrical research'] },
  { id: 'society', label: 'Society & Reform', icon: '👥', actions: ['Introduce factory acts', 'Expand public schools', 'Issue reform bill', 'Fund public health measures', 'Legalise trade unions', 'Enact poor law reform', 'Abolish child labour'] },
  { id: 'culture', label: 'Culture & Colonies', icon: '🌍', actions: ['Establish overseas colony', 'Send surveying expedition', 'Grant company charter', 'Build colonial railway', 'Open mission schools', 'Host world exhibition'] },
]

const ANCIENT_ERAS_SET = new Set(['greek', 'roman', 'ottoman', 'abbasid', 'tang', 'aztec', 'songhai', 'sengoku'])

// Format era dates: BCE for pre-CE years, show year + era suffix
function formatGameDate(dateStr: string): string {
  if (!dateStr) return dateStr
  // Game dates: optional leading "-" for BCE, then YYYY-MM-DD.
  const match = dateStr.match(/^(-?)(\d{1,4})-(\d{2})-(\d{2})$/)
  if (!match) return dateStr
  const sign = match[1] === '-' ? -1 : 1
  const year = sign * parseInt(match[2], 10)
  const month = parseInt(match[3], 10)
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (year < 0) return `${monthNames[month - 1]} ${Math.abs(year)} BCE`
  if (year < 1500) return `${monthNames[month - 1]} ${year} CE`
  // Modern dates show full DD Month YYYY
  const day = parseInt(match[4], 10)
  return `${day} ${monthNames[month - 1]} ${year}`
}

// ── Legend items ─────────────────────────────────────────────────────────────

// ── Layer toggle groups ───────────────────────────────────────────────────────
const LAYER_GROUPS: { key: string; label: string; layers: string[] }[] = [
  { key: 'cities',  label: 'Cities',         layers: ['city-dots', 'city-labels'] },
  { key: 'infra',   label: 'Infrastructure', layers: ['infra-glow', 'infra-dots', 'infra-construction-ring', 'infra-construction-dot'] },
  { key: 'rail',    label: 'Rail Lines',     layers: ['rail-line-domestic_hsr', 'rail-line-cross_continent', 'rail-line-undersea_tunnel'] },
  { key: 'biomes',  label: 'Terrain',        layers: ['biomes-fill', 'biomes-edge-blur'] },
  { key: 'rivers',  label: 'Rivers',         layers: ['rivers-line'] },
  { key: 'borders', label: 'Borders',        layers: ['country-borders', 'player-border', 'player-border-glow'] },
  { key: 'damage',  label: 'War Damage',     layers: ['damage-bombed', 'damage-nuked', 'damage-nuked-border'] },
]

const LEGEND_ITEMS = [
  { color: '#f8fafc', label: 'World capitals & megacities', desc: 'Pop > 5M or national capital', dot: true },
  { color: '#e2e8f0', label: 'Major regional cities', desc: 'Pop 500K – 5M', dot: true },
  { color: '#94a3b8', label: 'Smaller cities', desc: 'Pop < 500K', dot: true },
  { color: '#22c55e', label: 'Strategic passages', desc: 'Suez, Hormuz, Malacca, Bosporus…', dot: true },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatStat(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${Math.round(abs)}`
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

  // Fix "key![ → "key": [ (model occasionally drops the colon)
  s = s.replace(/"(\w+)!\[/g, '"$1": [')

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
  const { username, clearAuth } = useAuthStore()
  const handleLogout = async () => { await logout().catch(() => {}); clearAuth(); clearGame() }
  const isPaused = useGameStore(s => s.isPaused)
  const togglePause = useGameStore(s => s.togglePause)
  const setPaused = useGameStore(s => s.setPaused)
  const setJumping = useGameStore(s => s.setJumping)
  const applyResults = useGameStore(s => s.applyResults)
  const advanceDate = useGameStore(s => s.advanceDate)
  const addPendingAction = useGameStore(s => s.addPendingAction)
  const removePendingAction = useGameStore(s => s.removePendingAction)
  const updatePendingAction = useGameStore(s => s.updatePendingAction)
  const config = useConfigStore(s => s.config)
  const mapInstance = useMapStore(s => s.map)
  const breakingNewsCount = useGameStore(s => (s.state?.newsItems ?? []).filter(n => n.importance === 'breaking').length)
  const activePlanet = useGameStore(s => s.state?.activePlanet ?? 'earth')
  const setActivePlanet = useGameStore(s => s.setActivePlanet)
  const unlockedTechs = useGameStore(s => s.state?.unlockedTechs ?? [])
  const colonies = useGameStore(s => s.state?.colonies ?? [])
  const eraPhase = useGameStore(s => s.state?.eraPhase ?? 'modern')
  const deepEconomy = useGameStore(s => s.state?.economy)
  const deepMilitary = useGameStore(s => s.state?.militaryState)
  const deepPolitics = useGameStore(s => s.state?.politics)
  const deepSociety = useGameStore(s => s.state?.society)

  const toggleLayerGroup = (key: string) => {
    const group = LAYER_GROUPS.find(g => g.key === key)
    if (!group || !mapInstance) return
    const isHidden = hiddenGroups.has(key)
    const visibility = isHidden ? 'visible' : 'none'
    for (const layerId of group.layers) {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.setLayoutProperty(layerId, 'visibility', visibility)
      }
    }
    setHiddenGroups(prev => {
      const next = new Set(prev)
      if (isHidden) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const [actionText, setActionText] = useState('')
  const [activeTab, setActiveTab] = useState<'categories' | 'free'>('free')
  const [legendOpen, setLegendOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set())
  const [techTreeOpen, setTechTreeOpen] = useState(false)
  const [activeRightPanel, setActiveRightPanel] = useState<'org' | 'advisor' | 'diplomacy' | 'news' | 'tech' | null>(null)
  const openRightPanel = (p: 'org' | 'advisor' | 'diplomacy' | 'news' | 'tech') =>
    setActiveRightPanel(prev => prev === p ? null : p)
  const [activeDeepPanel, setActiveDeepPanel] = useState<'economy' | 'military' | 'politics' | 'society' | 'espionage' | null>(null)
  const openDeepPanel = (p: 'economy' | 'military' | 'politics' | 'society' | 'espionage') =>
    setActiveDeepPanel(prev => prev === p ? null : p)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string>('')
  const [cheatOpen, setCheatOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const [suggestActionsLoading, setSuggestActionsLoading] = useState(false)
  const [suggestActionsError, setSuggestActionsError] = useState('')
  const [jumpError, setJumpError] = useState('')
  const [loreOpen, setLoreOpen] = useState(false)
  const [dismissedWorldEvent, setDismissedWorldEvent] = useState<string | null>(null)
  const [timelineIdx, setTimelineIdx] = useState<number | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(288) // 288px = w-72
  const [customJump, setCustomJump] = useState('')
  const [showCustomJump, setShowCustomJump] = useState(false)
  const sidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // Keyboard shortcuts: Escape pauses, backslash toggles cheat menu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') togglePause()
      if (e.key === '\\') setCheatOpen(o => !o)
      if (e.key === 'r' || e.key === 'R') {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          setTechTreeOpen(o => !o)
          setActiveRightPanel(p => p === 'tech' ? null : 'tech')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePause])

  // Sidebar resize drag
  const onSidebarDragStart = useCallback((e: React.MouseEvent) => {
    sidebarDragRef.current = { startX: e.clientX, startWidth: sidebarWidth }
    e.preventDefault()
  }, [sidebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!sidebarDragRef.current) return
      const delta = e.clientX - sidebarDragRef.current.startX
      setSidebarWidth(Math.max(220, Math.min(520, sidebarDragRef.current.startWidth + delta)))
    }
    const onUp = () => { sidebarDragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
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
    try {
      const slot = gameState.saveSlot || 'autosave'
      await saveGame(slot, gameState)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[Save] failed:', msg)
      setSaveError(msg)
      setSaveStatus('error')
      setTimeout(() => { setSaveStatus('idle'); setSaveError('') }, 5000)
    }
  }

  const handleExecute = () => {
    const text = actionText.trim()
    if (!text) return
    // Rail-line intent detection: offer draw-myself option instead of queuing as AI action
    const railUnlocked = unlockedTechs.includes('railroad' as any) || unlockedTechs.includes('steam_engine' as any) || unlockedTechs.includes('high_speed_rail' as any)
    if (railUnlocked && /\b(rail|railway|railroad|train\s*line|hsr|high[- ]speed)\b/i.test(text)) {
      const draw = window.confirm(`It looks like you want to build a rail line. Draw it yourself on the map?\n\nOK = Draw it myself\nCancel = Let the AI decide`)
      if (draw) {
        const isHsr = /\b(hsr|high[- ]speed|bullet)\b/i.test(text)
        useRailDrawStore.getState().startDrawing(isHsr ? 'domestic_hsr' : 'cross_continent')
        setActionText('')
        return
      }
    }
    addPendingAction(text)
    setActionText('')
  }

  const handleJump = async (period: 'week' | 'month' | 'year') => {
    if (isPaused) return
    setJumpError('')
    if (pendingActions.length === 0 || !config) {
      advanceDate(period)
      return
    }
    setJumping(true)
    try {
      const playerCountry = player?.name ?? gameState.playerCountryId
      const gdp = stats?.gdp ?? 0
      const isAncientEra = ANCIENT_ERAS_SET.has(gameState.era)
      const statsStr = isAncientEra
        ? `Treasury ~$${(gdp/1e9).toFixed(1)}B eq | Military ${stats?.military??0} | Approval ${stats?.approval??0}% | Stability ${stats?.stability??70} | Influence ${stats?.softPower??0} | Knowledge ${stats?.techLevel??0}`
        : `GDP $${(gdp/1e9).toFixed(1)}B | Military ${stats?.military??0} | Approval ${stats?.approval??0}% | Stability ${stats?.stability??70} | SoftPower ${stats?.softPower??0} | Tech ${stats?.techLevel??0}`

      // Deep system context appended to prompt when relevant
      const deepContextParts: string[] = []
      if (deepEconomy) {
        deepContextParts.push(`Economy: debt $${(deepEconomy.debt/1e9).toFixed(0)}B, inflation ${deepEconomy.inflation.toFixed(1)}%, industrialisation ${deepEconomy.industrialisationLevel.toFixed(0)}/100, tax rate ${deepEconomy.taxRate.toFixed(0)}%, trade balance $${(deepEconomy.tradeBalance/1e9).toFixed(1)}B`)
      }
      if (deepMilitary) {
        deepContextParts.push(`Military: land ${deepMilitary.landStrength}/100, navy ${deepMilitary.navalStrength}/100, air ${deepMilitary.airStrength}/100, morale ${deepMilitary.morale}/100, mobilisation ${deepMilitary.mobilisationLevel}%, doctrine ${deepMilitary.doctrine}`)
      }
      if (deepPolitics) {
        deepContextParts.push(`Politics: ${deepPolitics.governmentType}, unrest ${deepPolitics.unrestLevel.toFixed(0)}/100, corruption ${deepPolitics.corruption.toFixed(0)}/100`)
      }
      if (deepSociety) {
        const pop = deepSociety.population >= 1e9 ? `${(deepSociety.population/1e9).toFixed(2)}B` : deepSociety.population >= 1e6 ? `${(deepSociety.population/1e6).toFixed(1)}M` : `${(deepSociety.population/1e3).toFixed(0)}K`
        deepContextParts.push(`Society: pop ${pop} (+${deepSociety.populationGrowthRate.toFixed(1)}%/yr), education ${deepSociety.educationIndex.toFixed(0)}/100, happiness ${deepSociety.happinessIndex.toFixed(0)}/100, urbanisation ${deepSociety.urbanisationRate.toFixed(0)}%`)
      }
      if (colonies.length > 0) {
        deepContextParts.push(`Colonies: ${colonies.map(c => `${c.name} (${c.planet}, L${c.level})`).join(', ')}`)
      }
      // Natural resources available in this country
      const availableResources = getCountryResources(gameState.playerCountryId)
      if (availableResources.length > 0) {
        const nationalised = gameState.nationalisedResources ?? []
        const lines = availableResources.map(d => {
          const owned = nationalised.find(n => n.type === d.type)
          return `${d.type}(abundance ${d.abundance}/5${owned ? `, NATIONALISED L${owned.extractionLevel}, exports=${owned.exportsAllowed}` : ', not nationalised'})`
        }).join(', ')
        deepContextParts.push(`Natural resources: ${lines}`)
      }
      const deepContext = deepContextParts.length > 0 ? `\n${deepContextParts.join('\n')}` : ''
      const actionList = pendingActions.map((a, i) => `${i+1}.[${a.id}] ${a.text}`).join('\n')

      const isAncient = ANCIENT_ERAS_SET.has(gameState.era)
      const ERA_DESCRIPTIONS: Record<string, string> = {
        greek:   '431 BCE Aegean Greek world — phalanxes, triremes, silver talents, city-states, oracles, Olympic games',
        roman:   '117 CE Roman Imperial world — legions, cohorts, denarii, provinces, senators, aqueducts, gladiators',
        ottoman: '1520 CE early Ottoman world — janissaries, sipahi cavalry, akçe coinage, pashas, viziers, minarets',
        abbasid: '800 CE Abbasid Golden Age — caliphs, dirhams, emirs, wazirs, scholars, caravans, madrasas',
        tang:    '700 CE Tang Dynasty China — armies of the Son of Heaven, bronze coins, silk road merchants, scholars',
        aztec:   '1500 CE Aztec Triple Alliance — flower wars, cacao currency, eagle warriors, priests, tribute lists',
        songhai: '1490 CE Songhai Empire — trans-Saharan gold and salt trade, cavalry askia, Timbuktu scholars',
        sengoku: '1560 CE Sengoku Japan — samurai, ashigaru, daimyo, koku rice stipends, castle sieges, Buddhist monks',
      }
      const eraContext = isAncient
        ? `You are simulating ${playerCountry} in the ${ERA_DESCRIPTIONS[gameState.era] ?? gameState.era}. Use historically authentic language for that era. GDP represents the state treasury/economy in modern equivalent USD. Military and techLevel use the same scale.`
        : `You are simulating the ${gameState.era} era geopolitical world.`

      const system = `You are a historical strategy simulation engine. ${eraContext} JSON only — no markdown, no explanation.
This is a game — treat ALL actions as real in-game events, not hypothetical. Never use the word "hypothetical". Execute every action as if it actually happened in this alternate timeline.

CRITICAL RULE: Always use specific real-world names. Never use generic labels.
${isAncient
  ? `- Military: name the specific unit type (e.g. "the Third Macedonian Phalanx", "Nubian archers", "Syrian cataphracts")
- Buildings: use historically accurate names (e.g. "Temple of Athena Polias", "Via Appia extension", "the Grand Bazaar of Constantinople")
- Institutions: name them specifically (e.g. "the Academy of Plato", "the Roman Senate", "the Divan of the Sublime Porte")
Use your knowledge of ${playerCountry}'s actual ancient geography, cities, trade goods, and political structures.`
  : `- Resources: name the actual deposit/field (e.g. "Thar Coal fields" not "coal", "Sui Northern gas fields" not "natural gas", "Reko Diq copper mine" not "copper mine")
- Institutions: give them a real name (e.g. "Islamabad Institute of Technology" not "university", "Port Qasim Authority" not "port authority")
- Infrastructure: use the actual city/location (e.g. "Gwadar deep-water port" not "port", "Lahore–Karachi motorway" not "highway")
- Companies: use plausible real names (e.g. "Pakistan Steel Mills" not "steel company")
Use your knowledge of ${playerCountry}'s actual geography, cities, resources, and institutions.`}

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
      const yesmanBlock = gameState.yesman
        ? `\nYESMAN MODE ACTIVE: All other countries are extremely cooperative. Every reasonable proposal succeeds. Treaties, knowledge transfers, peaceful annexations, territory transfers, alliance offers, and trade deals all return outcome="success". If the player asks for territory back (e.g. "demand Kashmir from India"), set annexedRegion to that region's name and focusIso to the parent country's ISO_A3 — the transfer goes through peacefully. Do NOT return "failure" outcomes while yesman mode is active.\n`
        : ''

      const prompt = `${playerCountry} | ${gameState.currentDate} | ${statsStr}${deepContext}
${historyBlock}${damageBlock}${yesmanBlock}
Actions:
${actionList}

Return JSON — one result per action:
{"results":[{"actionId":"<id>","outcome":"success|partial|failure","failureReason":"<why it failed or was resisted — required if outcome is partial or failure>","summary":"<1 sentence using specific names>","fullNarrative":"<2 sentences with specific places/names>","worldReaction":"<1 sentence>","domesticReaction":"<1 sentence — specific public/media reaction>","countryReactions":[{"country":"<neighbour/rival>","stance":"positive|negative|neutral","quote":"<brief quoted reaction>"}],"statDeltas":{"gdp":<USD delta>,"military":<integer, 0 unless military action>,"approval":<-5..5>,"softPower":<integer, 0 unless diplomacy/culture>,"techLevel":<integer, 0 unless tech/research>},"tags":["<tag>"],"focusIso":"<ISO_A3 of the most relevant country — always include>","buildProjects":[{"type":"<infra_type>","name":"<specific real-world name>","city":"<city for point infra>","cities":["<stop1>","<stop2>"]}],"nuclearStrike":["<ISO_A3>"],"bombardment":["<ISO_A3>"],"empireName":"<only if conquest/annexation>","annexedCountry":"<ISO_A3 only if entire sovereign nation is brought under control>","annexedRegion":"<province/state name if only a sub-national region is taken, e.g. Kashmir, Crimea, Tigray>","nationaliseResource":{"type":"<oil|natural_gas|copper|lithium|etc.>","extractionLevel":<1-10>,"exportsAllowed":<true|false>},"foundColony":{"planet":"moon|mars","name":"<specific base name>","lat":<number>,"lng":<number>}}]}

outcome: Assess geopolitical realism honestly — NOT every action succeeds.
- "success": action proceeds as intended. Full positive stat deltas.
- "partial": action partially succeeds or faces significant obstacles. Halve positive deltas; may add minor negatives.
- "failure": action is rejected, fails, or backfires. statDeltas should be 0 or negative (costs, backlash). No buildProjects. Require failureReason.
Examples: Requesting Kashmir from India → failure (India rejects). Proposing trade deal with an ally → success. Imposing sanctions on a great power → partial (they retaliate). Invading a stronger neighbour → failure or partial depending on military balance.

buildProjects: Array of ALL physical constructions triggered by this action — include one entry per distinct facility or route built. If an action builds a desalination plant in Turbat AND a nuclear plant in Karachi AND solar farms in the Cholistan Desert, buildProjects must have 3 entries. Use exactly one of these types per entry: university, research_centre, port, airport, solar_farm, wind_farm, hydro_dam, fossil_fuel_plant, nuclear_plant, military_base, nuclear_silo, defence_system, financial_institution, industrial_zone, data_centre, desalination_plant, telecom_node, stadium, arts_centre, film_studio, embassy, rail_line, high_speed_rail. Name must be specific (e.g. "Gwadar Deep-Water Port"). For point infrastructure always include "city". For rail include "cities": ["City1","City2",...] with all stops in order. CRITICAL: all cities in buildProjects must be real cities inside the country performing the construction (or inside focusIso if the action targets a foreign country). Never place infrastructure in a third country's cities. Rail lines must stay within one country's borders unless the action is explicitly a bilateral cross-border project.

LEVELS & UPGRADES: Each building type has levels (1 = basic, higher = larger/modernised). Cities have up to 10 levels, ports/airports 6, nuclear plants 6, embassies 3, etc. By default, a new build starts at level 1. If the action implies a large ambitious project (e.g. "build a massive mega-port", "launch an all-out industrial initiative"), include "targetLevel": 2-4 at most — each level costs exponentially more (going to level 3 costs ~3x more than level 1, level 5 costs ~10x more). NEVER go above level 4 on a first build.

DEDUPLICATION: Before adding a buildProject, CHECK the existing infrastructure list. If the country already has a building of the same type in the same city (e.g. Pakistan already has "Gwadar Port"), do NOT create a second one — instead, omit the buildProject or describe it as an upgrade in the narrative. The engine will auto-detect and upgrade the existing building. NEVER create duplicate embassies, duplicate ports, or duplicate anything of the same type in the same city. If the player keeps asking for "Gwadar port expansion", you can include the buildProject — the engine will upgrade the existing one, not build a duplicate.

EXCEPTION FOR EMBASSIES: when the type is "embassy", the city must be in the FOREIGN HOST country (e.g. an embassy of Pakistan in Washington has city "Washington"); also include "hostCountry": "<ISO_A3 of the host country>" so the embassy is correctly placed. Only one embassy per country per city.

GDP DELTAS: statDeltas.gdp represents the IMMEDIATE financial impact — usually NEGATIVE or ZERO for construction actions (you're spending money, not earning it). Do NOT give large positive gdp deltas for building things — the engine adds a recurring monthly income stream from completed infrastructure automatically. If a country signs a trade deal or receives foreign investment, positive gdp is appropriate (small: $500M-$5B).

NATIONALISATION: When the player explicitly nationalises a natural resource (e.g. "nationalise the oil industry", "take state control of copper mines", "ban private lithium extraction"), set "nationaliseResource":{"type":"oil","extractionLevel":3,"exportsAllowed":true}. The type MUST be one of the resources listed in the player's "Natural resources:" context line — if the player's country has no significant deposit of that resource, the action should fail or only give a tiny benefit. extractionLevel 1-3 = small operation, 4-6 = major state industry, 7-10 = full national monopoly (costs more upfront in gdp deltas but generates huge recurring monthly income). exportsAllowed=true doubles the recurring income but may anger rivals. Once nationalised, the resource generates monthly GDP automatically — do NOT add fake gdp deltas for nationalisation. If the player asks to RAISE the extraction level of an already-nationalised resource, set extractionLevel to the NEW desired level and the engine will upgrade it.

RAIL STATION UPGRADES: When the player asks to upgrade or expand a specific rail station (e.g. "upgrade Karachi Central to a megastation", "expand Lahore Junction to a major interchange"), set "upgradeRailStation":{"stationName":"Karachi Central","targetLevel":3}. Levels 1-5: 1=small halt, 2=local, 3=regional hub, 4=interchange, 5=megastation. Each level costs more (~$50M, $200M, $800M, $2B, $6B) and contributes more monthly income. Use NEGATIVE statDeltas.gdp for the upgrade cost. The stationName must match an existing station the player owns — do not invent station names.

Omit buildProjects entirely for non-construction actions or failures.
nuclearStrike: include ISO_A3 of any country hit by nuclear weapons (omit if none).
bombardment: include ISO_A3 of any country heavily bombed/invaded (omit if none).
foundColony: include ONLY when the action explicitly establishes a Moon or Mars base/colony. Set planet to "moon" or "mars", give a specific named base (e.g. "Armstrong Base Gamma"), and choose realistic lat/lng on that body. Omit entirely for Earth actions.

2-3 countryReactions from realistic neighbours/rivals.`

      // Random world event — chance scales with jump period
      const worldEventChance = period === 'year' ? 0.40 : period === 'month' ? 0.10 : 0.03
      const rollWorldEvent = Math.random() < worldEventChance

      const raw = await callAI(config, system, [{ role: 'user', content: prompt + (rollWorldEvent
        ? `\n\nAlso include a top-level "worldEvent" field (outside "results") with a random independent geopolitical event that occurs this ${period} — something the player did NOT cause. Could be a independence movement succeeding, a coup, a civil war ending, a new nation forming, a surprise election result, etc. Choose something plausible for the ${gameState.era} era. Format: {"headline":"...","narrative":"2 sentences","affectedCountry":"<ISO_A3>","newNation":"<optional>","annexedRegion":"<optional province name>"}`
        : '') }], true)

      let parsed: { results: ActionResult[]; worldEvent?: WorldEvent }
      try {
        parsed = JSON.parse(repairJson(raw)) as { results: ActionResult[]; worldEvent?: WorldEvent }
      } catch (parseErr) {
        console.error('AI response parse failed:', parseErr, '\nRaw:', raw)
        throw new Error(`AI response couldn't be parsed. Try again or use fewer actions at once.`)
      }

      const clampedResults = (parsed.results ?? []).map(r => sanitiseDeltas(r, pendingActions))
      if (clampedResults.length === 0) {
        console.warn('AI returned empty results. Raw:', raw)
        throw new Error('AI returned no results. Try again or use fewer actions at once.')
      }

      applyResults(clampedResults, period, parsed.worldEvent)
      advanceDate(period)
      if (clampedResults.length > 0) setTimelineIdx(0)
      const focusTarget = parsed.results?.find(r => r.focusIso)?.focusIso
      if (focusTarget && mapInstance) {
        setTimeout(() => flyToLocation(mapInstance, focusTarget), 400)
      }
    } catch (e) {
      // Do NOT advance date or clear actions on failure — user can retry
      console.error('handleJump error:', e)
      setJumpError(e instanceof Error ? e.message : 'AI error — actions kept, try again')
      setJumping(false)
    }
  }

  const handleCustomJump = () => {
    const val = customJump.trim()
    if (!val) return
    const match = val.match(/^(\d+)\s*(w|week|weeks|m|month|months|y|year|years)?$/i)
    if (!match) return
    const n = parseInt(match[1])
    const unit = (match[2] ?? 'w').toLowerCase()
    const period: 'week' | 'month' | 'year' =
      unit.startsWith('y') ? 'year' : unit.startsWith('m') ? 'month' : 'week'
    // Jump N times by that period
    const jumps = Math.max(1, Math.min(n, 52))
    ;(async () => {
      for (let i = 0; i < jumps; i++) await handleJump(period)
    })()
    setCustomJump('')
    setShowCustomJump(false)
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

  const handleAiSuggest = async (inputText?: string) => {
    const text = (inputText ?? actionText).trim()
    if (!text || !config) return
    setSuggestLoading(true); setSuggestError('')
    try {
      const system = `You are a geopolitical strategy advisor for ${player?.name ?? gameState.playerCountryId} on ${gameState.currentDate}. Refine the idea into one specific actionable policy decision using real place names, resource names, and institutions from ${player?.name ?? gameState.playerCountryId} (e.g. "Nationalise the Thar Coal fields" not "nationalise key industry", "Construct Gwadar free-trade zone" not "build port"). Under 20 words. RESPOND IN ENGLISH ONLY. Output only the refined action text, nothing else.`
      const suggestion = await callAI(config, system, [{ role: 'user', content: text }])
      setActionText(suggestion.trim())
    } catch (e) { setSuggestError(e instanceof Error ? e.message : 'AI error') }
    finally { setSuggestLoading(false) }
  }

  const handleAiSuggestActions = async () => {
    if (!config || !gameState) return
    setSuggestActionsLoading(true)
    setSuggestActionsError('')
    try {
      const playerName = player?.name ?? gameState.playerCountryId
      const newsContext = (gameState.newsItems ?? []).slice(0, 8).map(n => `- ${n.headline}`).join('\n')
      const statsLine = `GDP $${((stats?.gdp ?? 0) / 1e9).toFixed(0)}B · Military ${stats?.military ?? 0} · Approval ${stats?.approval ?? 0} · Stability ${stats?.stability ?? 70} · Tech ${stats?.techLevel ?? 0}`
      const system = `You are a strategic advisor for ${playerName} in ${gameState.era} (${gameState.currentDate}). Suggest 4 specific, actionable moves the player could take this turn based on the current world state. Each action should be 1 short sentence (under 15 words). Mix categories: economy, military, diplomacy, infrastructure, tech, culture. Ground suggestions in the actual world events listed below — react to what's happening. Be specific (use real country names, real cities, real proposals).`
      const userPrompt = `Current state: ${statsLine}\nRecent world events:\n${newsContext || '(no recent events)'}\n\nReturn ONLY a JSON array of 4 strings, no commentary. Example: ["Sign trade agreement with India", "Build deep-water port at Gwadar", "Open embassy in Tokyo", "Increase R&D spending on quantum computing"]`
      const reply = await callAI(config, system, [{ role: 'user', content: userPrompt }])
      const match = reply.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No JSON array found in AI response')
      const actions: string[] = JSON.parse(match[0])
      if (!Array.isArray(actions)) throw new Error('AI response was not an array')
      for (const action of actions) {
        if (typeof action === 'string' && action.trim()) {
          addPendingAction(action.trim())
        }
      }
    } catch (e) {
      setSuggestActionsError(e instanceof Error ? e.message : 'AI error')
    } finally {
      setSuggestActionsLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const timelineResult = timelineIdx !== null ? lastResults[timelineIdx] : null
  const lore = gameState.lore ?? []
  const latestWorldEvent = (gameState.worldEvents ?? []).slice(-1)[0] ?? null

  return (
    <div className="h-screen w-screen flex bg-[#060d1a] text-white overflow-hidden relative">

      {isPaused && (
        <PauseMenu
          onResume={togglePause}
          onSave={handleSave}
          onSignOut={handleLogout}
        />
      )}

      {/* ── Left Sidebar ── */}
      {sidebarOpen && (
        <div className="shrink-0 flex flex-col bg-[#080f1e]/95 border-r border-white/8 overflow-hidden z-20 relative" style={{ width: sidebarWidth }}>
          {/* Drag-to-resize handle */}
          <div
            onMouseDown={onSidebarDragStart}
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-30 hover:bg-blue-500/40 transition-colors"
          />

          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
            <div>
              <p className="text-xs font-bold text-white tracking-widest uppercase">
                {gameState.empireName ?? player?.name ?? gameState.playerCountryId}
              </p>
              {gameState.empireName
                ? <p className="text-[10px] text-gray-500 mt-0.5">{player?.name}</p>
                : <p className="text-[10px] text-gray-600 mt-0.5">{username}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleLogout} title="Sign out"
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-900/30 text-gray-600 hover:text-red-400 transition-colors text-[10px]">⏻</button>
              <button onClick={() => setSidebarOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-xs">‹</button>
            </div>
          </div>

          {/* Stats bar */}
          {(() => {
            const stability = stats?.stability ?? 70
            const stabilityColor = stability >= 60 ? 'text-green-400' : stability >= 35 ? 'text-yellow-400' : 'text-red-400'
            return (
              <div className="grid grid-cols-2 gap-1 px-3 py-2 border-b border-white/5 shrink-0">
                {[
                  { label: 'GDP', value: formatStat(stats?.gdp ?? 0), color: 'text-white' },
                  { label: 'Military', value: String(stats?.military ?? 0), color: 'text-white' },
                  { label: 'Approval', value: `${stats?.approval ?? 0}%`, color: 'text-white' },
                  { label: 'Soft Power', value: String(stats?.softPower ?? 0), color: 'text-white' },
                  { label: 'Tech', value: String(stats?.techLevel ?? 0), color: 'text-white' },
                  { label: 'Stability', value: `${stability}`, color: stabilityColor },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between bg-white/[0.04] rounded-lg px-2 py-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
                    <span className={`text-xs font-mono font-medium ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Tabs */}
          <div className="flex border-b border-white/8 shrink-0">
            {(['categories', 'free'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-950/30'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                {tab === 'categories' ? 'Act' : 'Free'}
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
                    {sectors && (() => {
                      const SECTOR_ICONS: Record<string, string> = {
                        defence: '⚔️', technology: '🔬', manufacturing: '🏭',
                        space: '🚀', pharmaceuticals: '💊', agriculture: '🌾',
                        finance: '💹', infrastructure: '🏗️',
                      }
                      const SECTOR_LABELS: Record<string, string> = {
                        defence: 'Defence', technology: 'Tech', manufacturing: 'Mfg',
                        space: 'Space', pharmaceuticals: 'Pharma', agriculture: 'Agri',
                        finance: 'Finance', infrastructure: 'Infra',
                      }
                      return Object.entries(sectors).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-2 py-1">
                          <span className="text-[10px] text-gray-500">
                            <span className="mr-1">{SECTOR_ICONS[key] ?? '📦'}</span>
                            {SECTOR_LABELS[key] ?? key}
                          </span>
                          <span className="text-xs text-white font-mono">{val}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
                <div className="px-3 py-2 space-y-0.5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Quick Actions</p>
                  {(ANCIENT_ERAS_SET.has(gameState.era) && gameState.eraPhase === 'ancient'
                    ? CATEGORIES_ANCIENT
                    : gameState.eraPhase === 'industrial'
                      ? CATEGORIES_INDUSTRIAL
                      : CATEGORIES_MODERN
                  ).map(cat => (
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
                <div className="relative">
                  <textarea
                    value={actionText}
                    onChange={e => setActionText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleExecute() } }}
                    placeholder="Describe your action… (Enter to queue)"
                    className="w-full h-24 bg-white/[0.04] border border-white/10 rounded-xl p-3 pr-9 text-sm resize-none focus:outline-none focus:border-blue-500/50 text-white placeholder-gray-600"
                  />
                  <div className="absolute top-2 right-2 group">
                    <button
                      onClick={() => { setSuggestError(''); handleAiSuggest(actionText) }}
                      disabled={!actionText.trim() || suggestLoading || !config}
                      className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors text-sm ${
                        suggestLoading ? 'bg-purple-600/60 text-purple-200 animate-pulse' : 'bg-white/[0.06] text-gray-500 hover:text-purple-300 hover:bg-purple-900/30 disabled:opacity-30'
                      }`}>
                      ✦
                    </button>
                    <div className="pointer-events-none absolute top-full right-0 mt-1.5 w-52 px-3 py-2 rounded-lg bg-[#0c1424] border border-purple-500/30 shadow-xl text-[10px] text-gray-300 leading-snug opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      <span className="text-purple-300 font-semibold">✦ AI Refine</span><br/>
                      Rewrites your typed text into a specific, well-formed action.
                    </div>
                  </div>
                </div>
                {suggestError && <p className="text-xs text-red-400 mt-1">{suggestError}</p>}
                {suggestActionsError && <p className="text-xs text-red-400 mt-1">{suggestActionsError}</p>}
                <div className="flex gap-2 mt-2">
                  <button onClick={handleExecute} disabled={!actionText.trim()}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20">
                    Queue Action
                  </button>
                  <div className="relative group">
                    <button
                      onClick={handleAiSuggestActions}
                      disabled={suggestActionsLoading || !config}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg ${
                        suggestActionsLoading
                          ? 'bg-purple-600/60 text-purple-200 animate-pulse'
                          : 'bg-purple-700/60 hover:bg-purple-600/70 text-purple-100 disabled:opacity-30'
                      }`}>
                      ✨
                    </button>
                    <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 w-56 px-3 py-2 rounded-lg bg-[#0c1424] border border-purple-500/30 shadow-xl text-[10px] text-gray-300 leading-snug opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      <span className="text-purple-300 font-semibold">✨ AI Suggest Actions</span><br/>
                      Reads the world state and generates 4 contextual action proposals. Delete the ones you don't want before jumping forward.
                    </div>
                  </div>
                </div>
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

                {/* Disaster & political event alerts */}
                {recentDisasters.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 px-1">Events</p>
                    {recentDisasters.slice(0, 4).map(d => {
                      const isPolitical = d.type === 'unrest' || d.type === 'rebellion'
                      return (
                        <div key={d.id} className={`rounded-xl border px-3 py-2 mb-1 ${
                          isPolitical
                            ? 'border-red-800/40 bg-red-950/30'
                            : 'border-orange-800/30 bg-orange-950/30'
                        }`}>
                          <p className={`text-xs font-semibold ${isPolitical ? 'text-red-300' : 'text-orange-300'}`}>
                            {isPolitical ? '⚔' : '⚠'} {d.name}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${isPolitical ? 'text-red-300/60' : 'text-orange-300/60'}`}>
                            {d.description}{d.gdpLoss > 0 ? ` — loss: $${(d.gdpLoss/1e9).toFixed(1)}B` : ''}
                          </p>
                        </div>
                      )
                    })}
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

        </div>
      )}

      {/* Sidebar open tab */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-14 bg-[#080f1e]/90 border border-white/10 border-l-0 rounded-r-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-blue-900/40 transition-colors">›</button>
      )}

      {/* ── Map area ── */}
      <div className="flex-1 relative overflow-hidden select-none">
        {activePlanet !== 'earth' ? (
          <PlanetMap
            key={activePlanet}
            planet={activePlanet as 'moon' | 'mars'}
            colonies={colonies.filter(c => c.planet === activePlanet)}
          />
        ) : (
          <WorldMap era={gameState.era}>
            <CountryLayer />
            {ANCIENT_ERAS_SET.has(gameState.era)
              ? <AncientProvincesLayer />
              : <ProvincesLayer />
            }
            <BiomesLayer />
            <RiversLayer />
            <LakesLayer />
            <CountryLabelOverlay />
            <DamageLayer />
            <CitiesLayer />
            <InfraLayer />
            <RailLayer />
            <RailDrawOverlay />
            <LandUseLayer />
            <LandmarksLayer />
          </WorldMap>
        )}

        {/* ── Rail draw panel + trigger (only after rail tech unlocked) ── */}
        <RailDrawPanel />
        {(unlockedTechs.includes('railroad' as any) || unlockedTechs.includes('steam_engine' as any) || unlockedTechs.includes('high_speed_rail' as any)) && (
          <button
            onClick={() => useRailDrawStore.getState().startDrawing('domestic_hsr')}
            title="Draw Rail Line"
            className="absolute bottom-4 left-16 z-20 h-9 px-3 flex items-center gap-1 rounded-xl backdrop-blur-md border border-purple-500/40 bg-[#0a1628]/80 text-purple-200 text-xs font-semibold hover:bg-purple-900/40 hover:border-purple-400 transition-colors shadow-xl"
          >
            🚆 Draw Rail
          </button>
        )}

        {/* ── Legend toggle button (bottom-left) ── */}
        <button
          onClick={() => setLegendOpen(o => !o)}
          title="Toggle Legend"
          className={`absolute bottom-4 left-4 z-20 w-9 h-9 flex items-center justify-center rounded-xl backdrop-blur-md border text-sm shadow-xl transition-all ${
            legendOpen
              ? 'bg-blue-900/60 border-blue-500/50 text-blue-200'
              : 'bg-[#080f1e]/80 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
          }`}>
          🗺
        </button>

        {/* ── Floating Legend panel ── */}
        {legendOpen && (
          <div className="absolute bottom-16 left-4 z-20 w-64 bg-[#080f1e]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            <div className="sticky top-0 flex items-center justify-between px-3 py-2 border-b border-white/8 bg-[#080f1e]/95">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Map Legend</span>
              <button onClick={() => setLegendOpen(false)} className="text-gray-500 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors">✕</button>
            </div>
            {/* Layer toggles */}
            <div className="px-3 pt-2 pb-1 border-b border-white/5">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Layer Toggles</p>
              <div className="flex flex-wrap gap-1.5 mb-1">
                {LAYER_GROUPS.map(g => {
                  const off = hiddenGroups.has(g.key)
                  return (
                    <button
                      key={g.key}
                      onClick={() => toggleLayerGroup(g.key)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                        off
                          ? 'bg-white/5 border-white/10 text-gray-600 line-through'
                          : 'bg-blue-900/30 border-blue-500/30 text-blue-300'
                      }`}
                    >
                      {g.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="px-3 py-2 space-y-4 text-xs overflow-y-auto" style={{ maxHeight: 'calc(100vh - 170px)' }}>
              {/* Cities */}
              <div className={hiddenGroups.has('cities') ? 'opacity-40' : ''}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Cities</p>
                {LEGEND_ITEMS.map(item => (
                  <div key={item.label} className="flex items-center gap-2 mb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-400 text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
              {/* Infrastructure groups */}
              <div className={hiddenGroups.has('infra') ? 'opacity-40' : ''}>
                {INFRA_GROUPS.map(group => (
                  <div key={group.label} className="mb-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map(type => {
                        const colour = INFRA_COLOURS[type as keyof typeof INFRA_COLOURS]
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour, boxShadow: `0 0 4px ${colour}80` }} />
                            <span className="text-gray-400">{INFRA_LABELS[type] ?? type}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {/* Rail Lines */}
              <div className={hiddenGroups.has('rail') ? 'opacity-40' : ''}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Rail Lines</p>
                <div className="space-y-1">
                  {Object.entries(RAIL_COLOURS).map(([type, colour]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-5 h-0.5 rounded shrink-0" style={{ backgroundColor: colour }} />
                      <span className="text-gray-400 capitalize">{type.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Terrain */}
              <div className={hiddenGroups.has('biomes') || hiddenGroups.has('rivers') ? 'opacity-40' : ''}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Terrain</p>
                <div className="space-y-1">
                  {[
                    { color: 'rgba(195,155,55,0.7)',  label: 'Desert' },
                    { color: 'rgba(105,152,48,0.7)',  label: 'Plains / Lowland' },
                    { color: 'rgba(28,128,118,0.7)',  label: 'Wetlands / Delta' },
                    { color: 'rgba(65,120,58,0.7)',   label: 'Valley / Basin' },
                    { color: 'rgba(155,195,225,0.7)', label: 'Tundra' },
                    { color: '#2563eb',               label: 'Rivers' },
                    { color: '#0c2240',               label: 'Lakes' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm shrink-0 border border-white/10" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── News panel ── */}
        {activeRightPanel === 'news' && newsOpen && <NewsPanel onClose={() => { setNewsOpen(false); setActiveRightPanel(null) }} />}

        {/* ── Full-screen Tech Tree overlay ── */}
        {techTreeOpen && <TechTreeFullscreen onClose={() => { setTechTreeOpen(false); setActiveRightPanel(null) }} />}

        {/* ── Top HUD ── */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pt-3 pointer-events-none z-10">
          {/* Date + era pill + paused indicator + planet switcher */}
          <div className="flex items-center gap-2">
            <div className="pointer-events-auto flex items-center gap-2 bg-[#080f1e]/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 shadow-xl">
              <span className="text-sm font-mono text-white font-semibold">{formatGameDate(gameState.currentDate)}</span>
              <span className="h-3 w-px bg-white/20" />
              <span className="text-[10px] text-blue-300 uppercase tracking-wider">
                {gameState.era}
                {eraPhase === 'industrial' && <span className="text-orange-300"> · Industrial</span>}
              </span>
            </div>
            {/* Planet switcher — visible once Moon or Mars is unlocked */}
            {(unlockedTechs.includes('moon_landing') || unlockedTechs.includes('mars_mission')) && (
              <div className="pointer-events-auto">
                <PlanetSwitcher
                  active={activePlanet}
                  onSelect={setActivePlanet}
                  moonUnlocked={unlockedTechs.includes('moon_landing')}
                  marsUnlocked={unlockedTechs.includes('mars_mission')}
                />
              </div>
            )}
          </div>

          {/* Right HUD: Pause + Lore + Save + New Game */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button onClick={togglePause}
              title={isPaused ? 'Resume (Esc)' : 'Pause (Esc)'}
              className={`w-9 h-9 flex items-center justify-center rounded-xl backdrop-blur-md border text-sm shadow-xl transition-all ${
                isPaused
                  ? 'bg-amber-900/60 border-amber-600/50 text-amber-300 hover:bg-amber-800/60'
                  : 'bg-[#080f1e]/80 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}>
              {isPaused ? '▶' : '⏸'}
            </button>
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
            <div className="relative group">
              <button onClick={handleSave}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all shadow-xl ${
                  saveStatus === 'error'
                    ? 'bg-red-950/60 border-red-700/50 text-red-300'
                    : saveStatus === 'saved'
                      ? 'bg-green-950/60 border-green-700/50 text-green-300'
                      : 'bg-[#080f1e]/80 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                }`}>
                {saveStatus === 'saving' ? '⏳' : saveStatus === 'saved' ? '✓' : saveStatus === 'error' ? '⚠' : '💾'}
                <span>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}</span>
              </button>
              {saveStatus === 'error' && saveError && (
                <div className="absolute bottom-full left-0 mb-2 z-50 bg-red-950 border border-red-700/60 rounded-lg px-3 py-2 text-[11px] text-red-200 whitespace-nowrap shadow-xl max-w-xs">
                  {saveError}
                </div>
              )}
            </div>
            <button
              onClick={() => { if (window.confirm('Start a new game? Unsaved progress will be lost.')) clearGame() }}
              className="px-3 py-2 rounded-xl bg-[#080f1e]/80 backdrop-blur-md border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all shadow-xl font-semibold">
              New Game
            </button>
          </div>
        </div>

        {/* ── Timeline event card (Pax Historia style) ── */}
        {timelineResult != null && (
          <div className={`absolute top-16 left-4 z-20 w-80 bg-[#070d1c] rounded-2xl shadow-2xl overflow-hidden border ${
            timelineResult.outcome === 'failure' ? 'border-red-700/50' :
            timelineResult.outcome === 'partial' ? 'border-amber-700/50' :
            'border-white/15'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Timeline</p>
                  <p className="text-[10px] text-gray-600 font-mono mt-0.5">from {formatGameDate(gameState.currentDate)}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  timelineResult.outcome === 'failure' ? 'bg-red-950/70 border-red-700/50 text-red-300' :
                  timelineResult.outcome === 'partial' ? 'bg-amber-950/70 border-amber-700/50 text-amber-300' :
                  'bg-emerald-950/70 border-emerald-700/50 text-emerald-300'
                }`}>
                  {timelineResult.outcome ?? 'success'}
                </span>
              </div>
              <button onClick={() => setTimelineIdx(null)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-xs">✕</button>
            </div>

            {/* Failure/partial reason banner */}
            {timelineResult.failureReason && (
              <div className={`px-4 py-2 border-b ${
                timelineResult.outcome === 'failure' ? 'bg-red-950/40 border-red-900/30' : 'bg-amber-950/40 border-amber-900/30'
              }`}>
                <p className={`text-xs leading-relaxed ${timelineResult.outcome === 'failure' ? 'text-red-300' : 'text-amber-300'}`}>
                  {timelineResult.failureReason}
                </p>
              </div>
            )}

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
                    {key === 'gdp'
                      ? `${val > 0 ? '+' : ''}${formatStat(val)} GDP`
                      : `${val > 0 ? '+' : ''}${val} ${key}`}
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

        {/* ── World event toast ── */}
        {latestWorldEvent && latestWorldEvent.headline !== dismissedWorldEvent && (
          <div className="absolute top-16 right-4 z-20 w-72 bg-[#070d1c] border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/8 bg-amber-950/30">
              <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">World Event</p>
              <button onClick={() => setDismissedWorldEvent(latestWorldEvent.headline)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-xs">✕</button>
            </div>
            <div className="px-4 py-3">
              <h3 className="text-sm font-bold text-amber-200 leading-snug">{latestWorldEvent.headline}</h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1.5">{latestWorldEvent.narrative}</p>
            </div>
          </div>
        )}

        {/* ── Deep system panels (second column, only on Earth view) ── */}
        {activePlanet === 'earth' && (
          <div className="absolute bottom-20 right-16 z-10 flex flex-col items-end gap-2">
            <EconomyPanel
              isOpen={activeDeepPanel === 'economy'}
              onOpen={() => openDeepPanel('economy')}
              onClose={() => setActiveDeepPanel(null)}
            />
            <MilitaryPanel
              isOpen={activeDeepPanel === 'military'}
              onOpen={() => openDeepPanel('military')}
              onClose={() => setActiveDeepPanel(null)}
            />
            <PoliticsPanel
              isOpen={activeDeepPanel === 'politics'}
              onOpen={() => openDeepPanel('politics')}
              onClose={() => setActiveDeepPanel(null)}
            />
            <SocietyPanel
              isOpen={activeDeepPanel === 'society'}
              onOpen={() => openDeepPanel('society')}
              onClose={() => setActiveDeepPanel(null)}
            />
            <EspionagePanel
              isOpen={activeDeepPanel === 'espionage'}
              onOpen={() => openDeepPanel('espionage')}
              onClose={() => setActiveDeepPanel(null)}
            />
          </div>
        )}

        {/* ── Bottom-right floating buttons (Tech Tree · Orgs · Advisor · Diplomacy · News · Cheat) ── */}
        <div className="absolute bottom-20 right-4 z-10 flex flex-col items-end gap-2">
          {/* Tech Tree */}
          <button
            onClick={() => { openRightPanel('tech'); setTechTreeOpen(o => !o) }}
            title="Technology Tree (R)"
            className={`w-10 h-10 rounded-full border shadow-xl flex items-center justify-center text-base transition-all ${
              activeRightPanel === 'tech'
                ? 'bg-blue-700/70 border-blue-500/60 text-blue-100'
                : 'bg-[#0d1f3c] border-white/20 text-gray-400 hover:text-blue-300 hover:border-blue-500/40'
            }`}>
            🔬
          </button>
          <OrgPanel
            isOpen={activeRightPanel === 'org'}
            onOpen={() => openRightPanel('org')}
            onClose={() => setActiveRightPanel(null)}
          />
          <AdvisorPanel
            gameContext={{ playerCountry: player?.name ?? gameState.playerCountryId, currentDate: gameState.currentDate, era: gameState.era, stats: stats as unknown as Record<string, number> ?? {}, topCountries, recentHistory, warDamageSummary }}
            isOpen={activeRightPanel === 'advisor'}
            onOpen={() => openRightPanel('advisor')}
            onClose={() => setActiveRightPanel(null)}
          />
          <DiplomacyPanel
            gameContext={{
              playerCountry: player?.name ?? gameState.playerCountryId,
              currentDate: gameState.currentDate,
              era: gameState.era,
              yesman: gameState.yesman ?? false,
              countryNames: Object.values(gameState.countries).map(c => c.name).filter(n => n !== (player?.name ?? '')),
              stats: stats as unknown as Record<string, number> ?? {},
              recentHistory,
              warDamageSummary,
            }}
            isOpen={activeRightPanel === 'diplomacy'}
            onOpen={() => openRightPanel('diplomacy')}
            onClose={() => setActiveRightPanel(null)}
          />
          {/* News button */}
          <button
            onClick={() => { openRightPanel('news'); setNewsOpen(o => !o) }}
            title="World News"
            className={`relative w-10 h-10 rounded-full border shadow-xl flex items-center justify-center text-base transition-all ${
              activeRightPanel === 'news'
                ? 'bg-blue-700/70 border-blue-500/60 text-blue-100'
                : 'bg-[#0d1f3c] border-white/20 text-gray-400 hover:text-white hover:border-white/30'
            }`}>
            📰
            {breakingNewsCount > 0 && activeRightPanel !== 'news' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                {breakingNewsCount > 9 ? '9+' : breakingNewsCount}
              </span>
            )}
          </button>
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
                <button key={period} onClick={() => handleJump(period)} disabled={isPaused}
                  className="px-4 py-2.5 rounded-xl bg-[#080f1e]/85 backdrop-blur-md border border-white/10 hover:border-blue-500/50 hover:bg-blue-950/50 text-sm font-semibold text-gray-300 hover:text-white transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed">
                  +{period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
              <button onClick={() => handleJump('month')} disabled={isPaused}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500/50 text-sm font-bold text-white transition-all shadow-2xl shadow-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed">
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
              {/* Custom jump */}
              {showCustomJump ? (
                <div className="flex items-center gap-1.5 bg-[#080f1e]/85 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 shadow-xl">
                  <input
                    autoFocus
                    value={customJump}
                    onChange={e => setCustomJump(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCustomJump(); if (e.key === 'Escape') setShowCustomJump(false) }}
                    placeholder="e.g. 5y or 12m"
                    className="w-28 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none font-mono"
                  />
                  <button onClick={handleCustomJump} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">Go</button>
                  <button onClick={() => setShowCustomJump(false)} className="text-xs text-gray-600 hover:text-gray-400">✕</button>
                </div>
              ) : (
                <button onClick={() => setShowCustomJump(true)}
                  className="px-3 py-2.5 rounded-xl bg-[#080f1e]/85 backdrop-blur-md border border-white/10 hover:border-white/20 text-xs text-gray-500 hover:text-gray-300 transition-all shadow-xl"
                  title="Jump custom period (e.g. 5y, 12m, 50w)">
                  ⏩
                </button>
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
