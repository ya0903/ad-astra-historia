import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../stores'
import { getEraGroup, getEraGroupTechs } from '@ad-astra/shared/techTree'
import type { TechNode, TechCategory, TechId } from '@ad-astra/shared/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_W = 164
const NODE_H = 84
const COL_W  = 224
const ROW_H  = 114
const PAD_X  = 48
const PAD_Y  = 48

const CATEGORY_META: Record<TechCategory, { label: string; icon: string; activeClass: string; dotClass: string }> = {
  infrastructure: { label: 'Infrastructure', icon: '🏗️', activeClass: 'bg-orange-600/30 text-orange-300 border-orange-500/50', dotClass: 'bg-orange-500' },
  military:       { label: 'Military',       icon: '⚔️',  activeClass: 'bg-red-600/30 text-red-300 border-red-500/50',         dotClass: 'bg-red-500' },
  economy:        { label: 'Economy',        icon: '💰',  activeClass: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50', dotClass: 'bg-emerald-500' },
  government:     { label: 'Government',     icon: '🏛️', activeClass: 'bg-blue-600/30 text-blue-300 border-blue-500/50',       dotClass: 'bg-blue-400' },
  society:        { label: 'Society',        icon: '🏘️', activeClass: 'bg-purple-600/30 text-purple-300 border-purple-500/50', dotClass: 'bg-purple-500' },
  science:        { label: 'Science',        icon: '🔬',  activeClass: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50',       dotClass: 'bg-cyan-400' },
}

const TECH_ICONS: Record<string, string> = {
  nuclear: '☢️', fusion: '☢️', fission: '☢️',
  space: '🚀', satellite: '🛰️', moon: '🌕', mars: '🔴',
  semiconductor: '💻', computing: '🖥️', ai: '🤖', quantum: '⚛️',
  manufacturing: '⚙️', industry: '🏭',
  military: '⚔️', naval: '⚓', navy: '⚓', warfare: '⚔️',
  cavalry: '🐴', siege: '🏰', cannon: '💣', gunpowder: '💥',
  agriculture: '🌾', irrigation: '💧', crop: '🌾',
  medicine: '🏥', medical: '🏥', biotech: '🧬', genetic: '🧬', nano: '🔬',
  energy: '⚡', renewable: '🌱', grid: '⚡',
  trade: '💰', merchant: '🏪', coinage: '🪙', finance: '🏦', bank: '🏦',
  philosophy: '📜', mathematics: '📐', astronomy: '🔭',
  printing: '📖', architecture: '🏛️',
  road: '🛤️', rail: '🚆', highway: '🛤️',
  aqueduct: '🌊', water: '💧', sanitation: '💧', desalination: '💧',
  bronze: '🪙', iron: '⚒️', steel: '⚒️', forging: '⚒️',
  stealth: '👁️', hypersonic: '🚀', drone: '🚁', cyber: '💻', missile: '🎯',
  photolithography: '💡', telecom: '📡', internet: '🌐', '5g': '📶',
  longbow: '🏹', crossbow: '🏹', armour: '🛡️', plate: '🛡️',
  fortification: '🏰', janissary: '⚔️',
  navigation: '🧭', cartography: '🗺️', compass: '🧭', caravel: '⛵', ocean: '🌊', exploration: '🗺️',
  trebuchet: '🏰', professional: '🎖️', hoplite: '⚔️',
  census: '📋', governance: '⚖️', law: '⚖️', diplomatic: '🤝', civic: '🏛️',
  education: '🎓', university: '🎓', healthcare: '🏥', social: '👥', media: '📺', culture: '🎭',
  security: '🔐', stock: '📈', wealth: '💎',
  default: '🔬',
}

function getTechIcon(tech: TechNode): string {
  const s = (tech.id + ' ' + tech.name).toLowerCase()
  for (const [key, icon] of Object.entries(TECH_ICONS)) {
    if (key === 'default') continue
    if (s.includes(key)) return icon
  }
  return TECH_ICONS.default
}

function formatWeeks(w: number): string {
  if (w >= 520) return `${(w / 52).toFixed(0)}yr`
  if (w >= 52) return `${(w / 52).toFixed(1)}yr`
  if (w >= 4) return `${Math.round(w / 4)}mo`
  return `${w}wk`
}

// ── Layout algorithm ──────────────────────────────────────────────────────────

function computeLayout(nodes: TechNode[]): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()

  const nodeIds = new Set(nodes.map(n => n.id))
  const depths  = new Map<string, number>()

  // BFS: assign longest-path depth
  const roots = nodes.filter(n => n.prerequisites.filter(p => nodeIds.has(p)).length === 0)
  roots.forEach(n => depths.set(n.id, 0))
  const queue = [...roots.map(n => n.id)]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const depth = depths.get(id) ?? 0
    nodes
      .filter(n => n.prerequisites.includes(id as TechId) && nodeIds.has(n.id))
      .forEach(child => {
        depths.set(child.id, Math.max(depths.get(child.id) ?? 0, depth + 1))
        queue.push(child.id)
      })
  }

  nodes.forEach(n => { if (!depths.has(n.id)) depths.set(n.id, 0) })

  // Group into columns
  const columns = new Map<number, string[]>()
  for (const [id, depth] of depths) {
    if (!columns.has(depth)) columns.set(depth, [])
    columns.get(depth)!.push(id)
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const positions = new Map<string, { x: number; y: number }>()

  for (const [col, ids] of columns) {
    const sorted = [...ids].sort((a, b) => {
      const na = nodeMap.get(a as TechId); const nb = nodeMap.get(b as TechId)
      if (!na || !nb) return 0
      // Sort by category first, then name for stable layout
      const ca = na.category ?? ''; const cb = nb.category ?? ''
      if (ca !== cb) return ca.localeCompare(cb)
      return na.name.localeCompare(nb.name)
    })
    sorted.forEach((id, row) => {
      positions.set(id, { x: PAD_X + col * COL_W, y: PAD_Y + row * ROW_H })
    })
  }

  return positions
}

// ── Node card ─────────────────────────────────────────────────────────────────

type NodeState = 'unlocked' | 'researching' | 'available' | 'locked'

interface NodeCardProps {
  tech: TechNode
  nodeState: NodeState
  progress: number
  position: { x: number; y: number }
  allTechs: TechNode[]
  onResearch: (techId: string, weeks: number) => void
}

function NodeCard({ tech, nodeState, progress, position, allTechs, onResearch }: NodeCardProps) {
  const icon     = getTechIcon(tech)
  const catMeta  = CATEGORY_META[tech.category]

  const borderClass =
    nodeState === 'unlocked'   ? 'border-green-500/60' :
    nodeState === 'researching' ? 'border-blue-500/80' :
    nodeState === 'available'   ? 'border-white/20 hover:border-blue-400/60' :
                                  'border-white/5'

  const bgClass =
    nodeState === 'unlocked'   ? 'bg-green-950/30' :
    nodeState === 'researching' ? 'bg-blue-950/40' :
    nodeState === 'available'   ? 'bg-white/5' :
                                  'bg-[#0a1628]'

  const glowStyle: React.CSSProperties =
    nodeState === 'researching' ? { boxShadow: '0 0 12px 2px rgba(59,130,246,0.35)' } :
    nodeState === 'unlocked'    ? { boxShadow: '0 0 8px 1px rgba(34,197,94,0.2)' } : {}

  const prereqNames = tech.prerequisites
    .map(pid => allTechs.find(t => t.id === pid)?.name ?? pid)
    .join(', ')

  return (
    <div
      style={{ position: 'absolute', left: position.x, top: position.y, width: NODE_W, height: NODE_H, ...glowStyle }}
      className={`
        rounded-lg border ${borderClass} ${bgClass}
        ${nodeState === 'locked' ? 'opacity-50' : ''}
        flex flex-col justify-between p-2 select-none
        transition-all duration-200 group overflow-hidden
      `}
    >
      {/* Category dot + title row */}
      <div className="flex items-start gap-1.5 min-w-0">
        <span className="text-base leading-none flex-shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold leading-tight truncate ${
            nodeState === 'unlocked'   ? 'text-green-300' :
            nodeState === 'researching' ? 'text-blue-200' :
            nodeState === 'locked'      ? 'text-gray-500' : 'text-white'
          }`}>
            {tech.name}
          </p>
          <p className="text-[9px] text-gray-500 leading-tight mt-0.5 line-clamp-2">
            {tech.description}
          </p>
        </div>
      </div>

      {/* Category pill + action row */}
      <div className="flex items-center justify-between mt-1 gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${catMeta.dotClass}`} />
          <span className="text-[9px] text-gray-600 font-mono truncate">
            {formatWeeks(tech.researchWeeks)} · {tech.cost} RP
          </span>
        </div>

        {nodeState === 'unlocked' && (
          <span className="text-[10px] text-green-400 font-semibold flex-shrink-0">✓</span>
        )}
        {nodeState === 'researching' && (
          <span className="text-[10px] text-blue-400 font-semibold flex-shrink-0 animate-pulse">…</span>
        )}
        {nodeState === 'available' && (
          <button
            onClick={() => onResearch(tech.id, tech.researchWeeks)}
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-600/80 hover:bg-blue-500 text-white transition-colors duration-150"
          >
            Research
          </button>
        )}
        {nodeState === 'locked' && (
          <span className="text-[10px] text-gray-600 flex-shrink-0">🔒</span>
        )}
      </div>

      {/* Prereq tooltip */}
      {nodeState === 'locked' && prereqNames && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#0d1f3c] border border-white/10 rounded px-2 py-1 text-[9px] text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
          Requires: {prereqNames}
        </div>
      )}

      {/* Research progress bar */}
      {nodeState === 'researching' && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5 rounded-b-lg overflow-hidden">
          <div className="h-full bg-blue-400 rounded-b-lg transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

// ── SVG connections ───────────────────────────────────────────────────────────

interface ConnectionsProps {
  nodes: TechNode[]
  positions: Map<string, { x: number; y: number }>
  unlockedTechs: string[]
  researchingIds: string[]
}

function Connections({ nodes, positions, unlockedTechs, researchingIds }: ConnectionsProps) {
  const paths: React.ReactNode[] = []

  for (const node of nodes) {
    const to = positions.get(node.id)
    if (!to) continue
    for (const prereqId of node.prerequisites) {
      const from = positions.get(prereqId)
      if (!from) continue

      const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2
      const x2 = to.x,           y2 = to.y + NODE_H / 2
      const cp = Math.max(40, Math.abs(x2 - x1) * 0.45)
      const d  = `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`

      const prereqUnlocked  = unlockedTechs.includes(prereqId)
      const nodeUnlocked    = unlockedTechs.includes(node.id)
      const nodeResearching = researchingIds.includes(node.id)

      let stroke = '#1e293b', strokeDash = '6 4', strokeOpacity = 0.5, strokeWidth = 1

      if (nodeUnlocked && prereqUnlocked) {
        stroke = '#166534'; strokeDash = 'none'; strokeOpacity = 0.7; strokeWidth = 1.5
      } else if (prereqUnlocked && (nodeResearching || researchingIds.includes(prereqId))) {
        stroke = '#3b82f6'; strokeDash = 'none'; strokeOpacity = 0.7; strokeWidth = 1.5
      } else if (prereqUnlocked) {
        stroke = '#94a3b8'; strokeDash = 'none'; strokeOpacity = 0.45; strokeWidth = 1
      }

      paths.push(
        <path
          key={`${prereqId}->${node.id}`}
          d={d} fill="none" stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash === 'none' ? undefined : strokeDash}
          strokeOpacity={strokeOpacity}
          strokeLinecap="round"
        />
      )
    }
  }

  return <>{paths}</>
}

// ── Category filter tabs ──────────────────────────────────────────────────────

interface CategoryTabsProps {
  allTechs: TechNode[]
  active: TechCategory | 'all'
  onChange: (c: TechCategory | 'all') => void
}

const ALL_CATEGORIES: TechCategory[] = ['infrastructure', 'military', 'economy', 'government', 'society', 'science']

function CategoryTabs({ allTechs, active, onChange }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
          active === 'all'
            ? 'bg-white/15 text-white border-white/30'
            : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-200'
        }`}
      >
        All
      </button>
      {ALL_CATEGORIES.map(cat => {
        const meta  = CATEGORY_META[cat]
        const count = allTechs.filter(t => t.category === cat).length
        if (count === 0) return null
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
              active === cat
                ? meta.activeClass
                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-200'
            }`}
          >
            {meta.icon} {meta.label}
            <span className="ml-1 opacity-50">({count})</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface TechTreeFullscreenProps {
  onClose: () => void
}

export default function TechTreeFullscreen({ onClose }: TechTreeFullscreenProps) {
  const gameState    = useGameStore(s => s.state)
  const startResearch = useGameStore(s => s.startResearch)

  const [activeCategory, setActiveCategory] = useState<TechCategory | 'all'>('all')

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!gameState) return null

  const currentEra      = gameState.era
  const eraGroup        = getEraGroup(currentEra)
  const eraGroupTechs   = getEraGroupTechs(currentEra)

  const unlockedTechs   = gameState.unlockedTechs ?? []
  const researchQueue   = gameState.researchQueue ?? []
  const researchingIds  = researchQueue.map(r => r.techId)

  // Filter by active category
  const visibleTechs: TechNode[] = useMemo(() => {
    if (activeCategory === 'all') return eraGroupTechs
    return eraGroupTechs.filter(t => t.category === activeCategory)
  }, [eraGroupTechs, activeCategory])

  const positions  = useMemo(() => computeLayout(visibleTechs), [visibleTechs])
  const canvasSize = useMemo(() => {
    let maxX = 0, maxY = 0
    for (const { x, y } of positions.values()) {
      maxX = Math.max(maxX, x + NODE_W + PAD_X)
      maxY = Math.max(maxY, y + NODE_H + PAD_Y)
    }
    return { width: Math.max(maxX, 800), height: Math.max(maxY, 600) }
  }, [positions])

  function getNodeState(tech: TechNode): NodeState {
    if (unlockedTechs.includes(tech.id)) return 'unlocked'
    if (researchingIds.includes(tech.id)) return 'researching'
    return tech.prerequisites.every(p => unlockedTechs.includes(p)) ? 'available' : 'locked'
  }

  function getResearchProgress(techId: string): number {
    const p = researchQueue.find(r => r.techId === techId)
    return p ? Math.round((1 - p.weeksRemaining / p.totalWeeks) * 100) : 0
  }

  const handleResearch = useCallback((techId: string, weeks: number) => {
    startResearch(techId as TechId, weeks)
  }, [startResearch])

  const eraGroupLabel = eraGroup === 'ancient' ? 'Ancient' : 'Modern'
  const eraGroupColour = eraGroup === 'ancient'
    ? 'bg-amber-600/30 text-amber-300 border-amber-500/30'
    : 'bg-blue-600/30 text-blue-300 border-blue-500/30'

  return (
    <div className="fixed inset-0 z-50 bg-[#060d1a]/95 backdrop-blur-sm flex flex-col" style={{ fontFamily: 'inherit' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-white/8 bg-[#07101f]/80">
        <div className="flex flex-col gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-wide">Technology Tree</h2>
            {/* Era group badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${eraGroupColour}`}>
              {eraGroupLabel} Era
            </span>
            <span className="text-[11px] text-gray-600">
              {unlockedTechs.filter(id => eraGroupTechs.some(t => t.id === id)).length} / {eraGroupTechs.length} unlocked
              {researchingIds.length > 0 && ` · ${researchingIds.length} in progress`}
            </span>
          </div>

          {/* Category filter tabs */}
          <CategoryTabs allTechs={eraGroupTechs} active={activeCategory} onChange={setActiveCategory} />
        </div>

        <button
          onClick={onClose}
          aria-label="Close technology tree"
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/20 transition-all duration-150 text-lg font-light mt-0.5"
        >
          ×
        </button>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-5 px-6 py-2 border-b border-white/5 bg-[#060d1a]/60">
        {[
          { label: 'Unlocked',    dot: 'bg-green-500',  text: 'text-green-400' },
          { label: 'Researching', dot: 'bg-blue-500',   text: 'text-blue-400' },
          { label: 'Available',   dot: 'bg-white/40',   text: 'text-gray-300' },
          { label: 'Locked',      dot: 'bg-white/10',   text: 'text-gray-600' },
        ].map(({ label, dot, text }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span className={`text-[10px] font-medium ${text}`}>{label}</span>
          </div>
        ))}
        <span className="text-[10px] text-gray-600 ml-auto">Scroll to navigate · ESC to close</span>
      </div>

      {/* ── Scrollable canvas ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div style={{ position: 'relative', width: canvasSize.width, height: canvasSize.height, minWidth: '100%', minHeight: '100%' }}>
          {/* SVG connections */}
          <svg style={{ position: 'absolute', inset: 0, width: canvasSize.width, height: canvasSize.height, pointerEvents: 'none', overflow: 'visible' }}>
            <Connections nodes={visibleTechs} positions={positions} unlockedTechs={unlockedTechs} researchingIds={researchingIds} />
          </svg>

          {/* Node cards */}
          {visibleTechs.map(tech => {
            const pos = positions.get(tech.id)
            if (!pos) return null
            return (
              <NodeCard
                key={tech.id}
                tech={tech}
                nodeState={getNodeState(tech)}
                progress={getResearchProgress(tech.id)}
                position={pos}
                allTechs={eraGroupTechs}
                onResearch={handleResearch}
              />
            )
          })}

          {visibleTechs.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-4xl">🔬</p>
                <p className="text-gray-500 text-sm">No technologies in this category.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
