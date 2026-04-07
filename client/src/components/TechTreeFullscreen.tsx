import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { useGameStore } from '../stores'
import { getEraGroup, getEraGroupTechs } from '@ad-astra/shared/techTree'
import type { TechNode, TechCategory, TechId } from '@ad-astra/shared/types'

// ── Constants (preserved) ────────────────────────────────────────────────────

const CATEGORY_META: Record<TechCategory, { label: string; icon: string; activeClass: string; dotClass: string; color: string; borderColor: string }> = {
  infrastructure: { label: 'Infrastructure', icon: '🏗️', activeClass: 'bg-orange-600/30 text-orange-300 border-orange-500/50', dotClass: 'bg-orange-500', color: '#f97316', borderColor: 'border-orange-500/60' },
  military:       { label: 'Military',       icon: '⚔️',  activeClass: 'bg-red-600/30 text-red-300 border-red-500/50',         dotClass: 'bg-red-500',    color: '#ef4444', borderColor: 'border-red-500/60' },
  science:        { label: 'Science',        icon: '🔬',  activeClass: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50',       dotClass: 'bg-cyan-400',   color: '#22d3ee', borderColor: 'border-cyan-400/60' },
  economy:        { label: 'Economy',        icon: '💰',  activeClass: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50', dotClass: 'bg-emerald-500', color: '#10b981', borderColor: 'border-emerald-500/60' },
  government:     { label: 'Government',     icon: '🏛️', activeClass: 'bg-blue-600/30 text-blue-300 border-blue-500/50',       dotClass: 'bg-blue-400',   color: '#60a5fa', borderColor: 'border-blue-400/60' },
  society:        { label: 'Society',        icon: '🏘️', activeClass: 'bg-purple-600/30 text-purple-300 border-purple-500/50', dotClass: 'bg-purple-500', color: '#a855f7', borderColor: 'border-purple-500/60' },
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

// ── Layout algorithm ─────────────────────────────────────────────────────────

const COLUMN_ORDER: TechCategory[] = ['infrastructure', 'military', 'science', 'economy', 'government', 'society']

type NodeState = 'unlocked' | 'researching' | 'available' | 'locked'

function computeCategoryDepths(nodes: TechNode[]): Map<string, number> {
  const nodeIds = new Set(nodes.map(n => n.id))
  const depths = new Map<string, number>()

  // Roots: nodes whose in-category prerequisites are all satisfied or outside this category
  const roots = nodes.filter(n =>
    n.prerequisites.filter(p => nodeIds.has(p)).length === 0
  )
  roots.forEach(n => depths.set(n.id, 0))

  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) {
      if (depths.has(node.id)) continue
      const parentDepths = node.prerequisites
        .filter(p => nodeIds.has(p))
        .map(p => depths.get(p))
      if (parentDepths.length > 0 && parentDepths.every(d => d !== undefined)) {
        depths.set(node.id, Math.max(...(parentDepths as number[])) + 1)
        changed = true
      }
    }
  }
  nodes.forEach(n => { if (!depths.has(n.id)) depths.set(n.id, 0) })
  return depths
}

// ── Node positions within column ─────────────────────────────────────────────

const NODE_SIZE = 56
const NODE_SLOT_W = 100
const NODE_SLOT_H = 110
const COLUMN_HEADER_H = 48

interface NodePosition {
  x: number  // center x within column
  y: number  // center y within column (below header)
}

function computeColumnLayout(
  nodes: TechNode[],
  depths: Map<string, number>,
): { positions: Map<string, NodePosition>; totalHeight: number } {
  const positions = new Map<string, NodePosition>()

  // Group by depth
  const byDepth = new Map<number, TechNode[]>()
  for (const n of nodes) {
    const d = depths.get(n.id) ?? 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(n)
  }

  const maxDepth = Math.max(0, ...byDepth.keys())
  let maxY = 0

  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth.get(d) ?? []
    row.sort((a, b) => a.name.localeCompare(b.name))
    const rowWidth = row.length * NODE_SLOT_W
    const startX = -rowWidth / 2 + NODE_SLOT_W / 2
    for (let i = 0; i < row.length; i++) {
      const y = COLUMN_HEADER_H + d * NODE_SLOT_H + NODE_SLOT_H / 2
      positions.set(row[i].id, { x: startX + i * NODE_SLOT_W, y })
      maxY = Math.max(maxY, y + NODE_SLOT_H / 2)
    }
  }

  return { positions, totalHeight: maxY + 16 }
}

// ── Main component ───────────────────────────────────────────────────────────

interface TechTreeFullscreenProps {
  onClose: () => void
}

export default function TechTreeFullscreen({ onClose }: TechTreeFullscreenProps) {
  const gameState = useGameStore(s => s.state)
  const startResearch = useGameStore(s => s.startResearch)

  const [hovered, setHovered] = useState<TechId | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [activeCategory, setActiveCategory] = useState<TechCategory>('infrastructure')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Track mouse for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX + 12, y: e.clientY + 12 })
  }, [])

  if (!gameState) return null

  const currentEra = gameState.era
  const eraPhase = gameState.eraPhase
  const eraGroupTechs = getEraGroupTechs(currentEra, eraPhase)
  const allTechs = eraGroupTechs

  const unlockedTechs = gameState.unlockedTechs ?? []
  const researchQueue = gameState.researchQueue ?? []
  const researchingIds = researchQueue.map(r => r.techId)

  const playerCountry = gameState.countries[gameState.playerCountryId]

  // RP calculation
  const universityCount = (gameState.infrastructureMap ?? []).filter(i => i.type === 'university').length
  const unlockedCount = (gameState.unlockedTechs ?? []).length
  const educationIndex = gameState.society?.educationIndex ?? 55
  const stability = playerCountry?.stats.stability ?? 70
  const base = 5
  const weeklyRP = Math.floor(
    (base + universityCount * 3 + unlockedCount * 0.5) *
    (0.5 + educationIndex / 100) *
    ((stability as number) < 40 ? 0.5 : 1.0)
  )
  const currentRP = playerCountry?.stats.researchPoints ?? 0

  function getNodeState(tech: TechNode): NodeState {
    if (unlockedTechs.includes(tech.id)) return 'unlocked'
    if (researchingIds.includes(tech.id)) return 'researching'
    return tech.prerequisites.every(p => unlockedTechs.includes(p)) ? 'available' : 'locked'
  }

  function getRemainingWeeks(techId: string): number {
    const p = researchQueue.find(r => r.techId === techId)
    return p ? p.weeksRemaining : 0
  }

  // Group techs by category
  const categoryGroups = useMemo(() => {
    const groups = new Map<TechCategory, TechNode[]>()
    for (const cat of COLUMN_ORDER) groups.set(cat, [])
    for (const t of allTechs) {
      groups.get(t.category)?.push(t)
    }
    return groups
  }, [allTechs])

  // Compute layouts per category
  const categoryLayouts = useMemo(() => {
    const layouts = new Map<TechCategory, { depths: Map<string, number>; positions: Map<string, NodePosition>; totalHeight: number; nodes: TechNode[] }>()
    for (const cat of COLUMN_ORDER) {
      const nodes = categoryGroups.get(cat) ?? []
      const depths = computeCategoryDepths(nodes)
      const { positions, totalHeight } = computeColumnLayout(nodes, depths)
      layouts.set(cat, { depths, positions, totalHeight, nodes })
    }
    return layouts
  }, [categoryGroups])

  // Determine the max column height for uniform scrolling
  const maxColumnHeight = useMemo(() => {
    let maxH = 400
    for (const layout of categoryLayouts.values()) {
      maxH = Math.max(maxH, layout.totalHeight)
    }
    return maxH
  }, [categoryLayouts])

  const hoveredTech = hovered ? allTechs.find(t => t.id === hovered) ?? null : null

  return (
    <div
      className="fixed inset-0 z-50 bg-[#060d1a]/95 backdrop-blur-sm flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#080f1e]/90 shrink-0">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Technology</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-cyan-300 font-mono">🔬 {currentRP.toLocaleString()} RP</span>
          <span className="text-xs text-gray-500">+{weeklyRP}/week</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
      </div>

      {/* ── Category tabs ───────────────────────────────────────────────── */}
      <div className="flex border-b border-white/10 bg-[#080f1e]/80 shrink-0">
        {COLUMN_ORDER.map(cat => {
          const meta = CATEGORY_META[cat]
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${
                isActive
                  ? `${meta.activeClass} border-current`
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              <span className="mr-1">{meta.icon}</span>
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* ── Active category content (vertical scroll) ────────────────────── */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {(() => {
          const cat = activeCategory
          const meta = CATEGORY_META[cat]
          const layout = categoryLayouts.get(cat)!
          const { nodes, positions, depths, totalHeight } = layout
          const maxNodesInRow = (() => {
            const byDepth = new Map<number, number>()
            for (const n of nodes) {
              const d = depths.get(n.id) ?? 0
              byDepth.set(d, (byDepth.get(d) ?? 0) + 1)
            }
            return Math.max(1, ...byDepth.values())
          })()
          const columnWidth = Math.max(300, maxNodesInRow * NODE_SLOT_W + 32)

          return (
            <div className="relative mx-auto" style={{ width: columnWidth, minHeight: totalHeight + 32 }}>
              {/* SVG lines */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: columnWidth, height: totalHeight + 32 }}
              >
                {nodes.map(node => {
                  const toPos = positions.get(node.id)
                  if (!toPos) return null
                  const nodeIdsInCat = new Set(nodes.map(n => n.id))
                  return node.prerequisites
                    .filter(pid => nodeIdsInCat.has(pid))
                    .map(pid => {
                      const fromPos = positions.get(pid)
                      if (!fromPos) return null
                      const cx = columnWidth / 2
                      const x1 = cx + fromPos.x
                      const y1 = fromPos.y + NODE_SIZE / 2 + 6
                      const x2 = cx + toPos.x
                      const y2 = toPos.y - NODE_SIZE / 2 - 6
                      if (y2 <= y1) return null
                      const cpY = (y2 - y1) * 0.4
                      return (
                        <path
                          key={`${pid}->${node.id}`}
                          d={`M ${x1} ${y1} C ${x1} ${y1 + cpY}, ${x2} ${y2 - cpY}, ${x2} ${y2}`}
                          fill="none"
                          stroke={meta.color}
                          strokeWidth={1.2}
                          strokeOpacity={0.3}
                          strokeLinecap="round"
                        />
                      )
                    })
                })}
              </svg>

              {/* Nodes */}
              {nodes.map(tech => {
                const pos = positions.get(tech.id)
                if (!pos) return null
                const nodeState = getNodeState(tech)
                const icon = getTechIcon(tech)
                const remainingWeeks = getRemainingWeeks(tech.id)

                let circleClasses = ''
                let nameColorClass = 'text-gray-500'
                let cursor = 'cursor-default'

                switch (nodeState) {
                  case 'locked':
                    circleClasses = 'bg-white/[0.04] border-white/10 opacity-50'
                    nameColorClass = 'text-gray-600'
                    break
                  case 'available':
                    circleClasses = `bg-white/[0.08] ${meta.borderColor} shadow-[0_0_8px_0px_${meta.color}40]`
                    nameColorClass = 'text-gray-300'
                    cursor = 'cursor-pointer'
                    break
                  case 'researching':
                    circleClasses = 'bg-blue-950/60 border-blue-500/80'
                    nameColorClass = 'text-blue-300'
                    break
                  case 'unlocked':
                    circleClasses = 'bg-green-900/60 border-green-500/60'
                    nameColorClass = 'text-green-300'
                    break
                }

                return (
                  <div
                    key={tech.id}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: columnWidth / 2 + pos.x - NODE_SLOT_W / 2,
                      top: pos.y - NODE_SIZE / 2,
                      width: NODE_SLOT_W,
                    }}
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 transition-all duration-200 ${circleClasses} ${cursor}`}
                      onMouseEnter={() => setHovered(tech.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => nodeState === 'available' && currentRP >= tech.cost && startResearch(tech.id, tech.researchWeeks)}
                      style={nodeState === 'researching' ? { animation: 'pulse 2s infinite' } : nodeState === 'available' ? { boxShadow: `0 0 10px 2px ${meta.color}30` } : {}}
                    >
                      {icon}
                    </div>
                    <span className={`text-[11px] text-center leading-tight mt-1.5 max-w-[92px] line-clamp-2 ${nameColorClass}`}>
                      {tech.name}
                    </span>
                    {nodeState === 'researching' && (
                      <span className="text-[9px] text-blue-400 mt-0.5">{formatWeeks(remainingWeeks)}</span>
                    )}
                  </div>
                )
              })}

              {nodes.length === 0 && (
                <div className="flex items-center justify-center h-32 text-gray-600 text-xs">
                  No techs available in this category
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── Hover tooltip ────────────────────────────────────────────────── */}
      {hovered && hoveredTech && (
        <div
          className="fixed z-50 w-64 p-3 rounded-lg bg-[#0c1424] border border-white/15 shadow-2xl pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <p className="text-sm font-semibold text-white mb-1">{hoveredTech.name}</p>
          <p className="text-xs text-gray-400 mb-2">{hoveredTech.description}</p>
          <div className="flex gap-3 text-[10px] text-gray-500 mb-1">
            <span>Cost: <span className="text-cyan-400">{hoveredTech.cost} RP</span></span>
            <span>Time: <span className="text-amber-400">{formatWeeks(hoveredTech.researchWeeks)}</span></span>
          </div>
          {hoveredTech.prerequisites.length > 0 && (
            <div className="text-[10px] text-gray-500">
              Requires: {hoveredTech.prerequisites.map(pid => {
                const prereq = allTechs.find(t => t.id === pid)
                const isCrossCategory = prereq && prereq.category !== hoveredTech.category
                const cat = isCrossCategory ? ` (${CATEGORY_META[prereq.category].label})` : ''
                return `${prereq?.name ?? pid}${cat}`
              }).join(', ')}
            </div>
          )}
          <div className="text-[10px] text-gray-600 mt-1">
            {getNodeState(hoveredTech) === 'locked' && 'Locked - prerequisites not met'}
            {getNodeState(hoveredTech) === 'available' && (currentRP >= hoveredTech.cost ? 'Click to research' : 'Not enough RP')}
            {getNodeState(hoveredTech) === 'researching' && `Researching - ${formatWeeks(getRemainingWeeks(hoveredTech.id))} remaining`}
            {getNodeState(hoveredTech) === 'unlocked' && 'Unlocked'}
          </div>
        </div>
      )}
    </div>
  )
}
