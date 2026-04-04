import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../stores'
import { TECH_TREE, ANCIENT_TECH_TREE } from '@ad-astra/shared/techTree'
import type { TechNode, Era, TechId } from '@ad-astra/shared/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_TECHS: TechNode[] = [...TECH_TREE, ...ANCIENT_TECH_TREE]

const NODE_W = 160
const NODE_H = 80
const COL_W = 220
const ROW_H = 110
const PAD_X = 48
const PAD_Y = 48

const ERA_LABELS: Record<Era, string> = {
  greek: 'Ancient Greek',
  roman: 'Roman',
  ottoman: 'Ottoman',
  '1945': 'Post-War 1945',
  '1960s': '1960s',
  '1990s': '1990s',
  '2010s': '2010s',
  modern: 'Modern',
}

const ERA_ORDER: Era[] = ['greek', 'roman', 'ottoman', '1945', '1960s', '1990s', '2010s', 'modern']

const TECH_ICONS: Record<string, string> = {
  nuclear: '☢️',
  fusion: '☢️',
  fission: '☢️',
  space: '🚀',
  satellite: '🛰️',
  moon: '🌕',
  semiconductor: '💻',
  computing: '🖥️',
  ai: '🤖',
  manufacturing: '⚙️',
  industry: '🏭',
  military: '⚔️',
  naval: '⚓',
  navy: '⚓',
  warfare: '⚔️',
  cavalry: '🐴',
  siege: '🏰',
  cannon: '💣',
  gunpowder: '💥',
  agriculture: '🌾',
  irrigation: '💧',
  crop: '🌾',
  medicine: '🏥',
  medical: '🏥',
  biotech: '🧬',
  energy: '⚡',
  renewable: '🌱',
  trade: '💰',
  merchant: '🏪',
  coinage: '🪙',
  philosophy: '📜',
  mathematics: '📐',
  astronomy: '🔭',
  printing: '📖',
  architecture: '🏛️',
  road: '🛤️',
  aqueduct: '🌊',
  bronze: '🪙',
  iron: '⚒️',
  steel: '⚒️',
  forging: '⚒️',
  stealth: '👁️',
  hypersonic: '🚀',
  photolithography: '💡',
  longbow: '🏹',
  crossbow: '🏹',
  armour: '🛡️',
  plate: '🛡️',
  fortification: '🏰',
  janissary: '⚔️',
  navigation: '🧭',
  cartography: '🗺️',
  compass: '🧭',
  caravel: '⛵',
  ocean: '🌊',
  exploration: '🗺️',
  trebuchet: '🏰',
  professional: '🎖️',
  hoplite: '⚔️',
  default: '🔬',
}

function getTechIcon(tech: TechNode): string {
  const searchStr = (tech.id + ' ' + tech.name).toLowerCase()
  for (const [key, icon] of Object.entries(TECH_ICONS)) {
    if (key === 'default') continue
    if (searchStr.includes(key)) return icon
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
  const depths = new Map<string, number>()

  // Seed: nodes with no prerequisites (within this filtered set)
  const roots = nodes.filter(n => n.prerequisites.filter(p => nodeIds.has(p)).length === 0)
  const queue: string[] = roots.map(n => n.id)
  queue.forEach(id => depths.set(id, 0))

  // BFS depth assignment — allow revisiting to get max-depth (longest path)
  const visited = new Set<string>()
  const bfsQueue = [...queue]

  while (bfsQueue.length > 0) {
    const id = bfsQueue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const depth = depths.get(id) ?? 0
    nodes
      .filter(n => n.prerequisites.includes(id as TechId) && nodeIds.has(n.id))
      .forEach(child => {
        const existing = depths.get(child.id) ?? 0
        const newDepth = Math.max(existing, depth + 1)
        depths.set(child.id, newDepth)
        bfsQueue.push(child.id)
      })
  }

  // Any nodes not reached (isolated in subgraph)
  nodes.forEach(n => {
    if (!depths.has(n.id)) depths.set(n.id, 0)
  })

  // Group into columns
  const columns = new Map<number, string[]>()
  for (const [id, depth] of depths) {
    if (!columns.has(depth)) columns.set(depth, [])
    columns.get(depth)!.push(id)
  }

  // Build a lookup for sort order
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  const positions = new Map<string, { x: number; y: number }>()

  for (const [col, ids] of columns) {
    // Sort within column: by earliest era availability index, then by name
    const sorted = [...ids].sort((a, b) => {
      const na = nodeMap.get(a as TechId)
      const nb = nodeMap.get(b as TechId)
      if (!na || !nb) return 0
      const eaA = Math.min(...na.unlocksEra.map(e => ERA_ORDER.indexOf(e as Era)).filter(i => i >= 0))
      const eaB = Math.min(...nb.unlocksEra.map(e => ERA_ORDER.indexOf(e as Era)).filter(i => i >= 0))
      if (eaA !== eaB) return eaA - eaB
      return na.name.localeCompare(nb.name)
    })

    sorted.forEach((id, row) => {
      positions.set(id, {
        x: PAD_X + col * COL_W,
        y: PAD_Y + row * ROW_H,
      })
    })
  }

  return positions
}

// ── Sub-components ────────────────────────────────────────────────────────────

type NodeState = 'unlocked' | 'researching' | 'available' | 'locked'

interface NodeCardProps {
  tech: TechNode
  nodeState: NodeState
  progress: number // 0–100 for researching
  position: { x: number; y: number }
  allTechs: TechNode[]
  onResearch: (techId: string, weeks: number) => void
}

function NodeCard({ tech, nodeState, progress, position, allTechs, onResearch }: NodeCardProps) {
  const icon = getTechIcon(tech)

  const borderClass =
    nodeState === 'unlocked'
      ? 'border-green-500/60'
      : nodeState === 'researching'
        ? 'border-blue-500/80'
        : nodeState === 'available'
          ? 'border-white/20 hover:border-blue-400/60'
          : 'border-white/5'

  const bgClass =
    nodeState === 'unlocked'
      ? 'bg-green-950/30'
      : nodeState === 'researching'
        ? 'bg-blue-950/40'
        : nodeState === 'available'
          ? 'bg-white/5'
          : 'bg-[#0a1628]'

  const glowStyle: React.CSSProperties =
    nodeState === 'researching'
      ? { boxShadow: '0 0 12px 2px rgba(59,130,246,0.35)' }
      : nodeState === 'unlocked'
        ? { boxShadow: '0 0 8px 1px rgba(34,197,94,0.2)' }
        : {}

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: NODE_W,
    height: NODE_H,
    ...glowStyle,
  }

  const prereqNames = tech.prerequisites
    .map(pid => allTechs.find(t => t.id === pid)?.name ?? pid)
    .join(', ')

  return (
    <div
      style={cardStyle}
      className={`
        rounded-lg border ${borderClass} ${bgClass}
        ${nodeState === 'locked' ? 'opacity-50' : ''}
        ${nodeState === 'researching' ? 'animate-pulse-border' : ''}
        flex flex-col justify-between p-2 select-none
        transition-all duration-200 group overflow-hidden
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-1.5 min-w-0">
        <span className="text-base leading-none flex-shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold leading-tight truncate ${
            nodeState === 'unlocked'
              ? 'text-green-300'
              : nodeState === 'researching'
                ? 'text-blue-200'
                : nodeState === 'locked'
                  ? 'text-gray-500'
                  : 'text-white'
          }`}>
            {tech.name}
          </p>
          <p className="text-[9px] text-gray-500 leading-tight mt-0.5 truncate">
            {tech.description}
          </p>
        </div>
      </div>

      {/* Meta + action row */}
      <div className="flex items-center justify-between mt-1 gap-1">
        <span className="text-[9px] text-gray-600 font-mono flex-shrink-0">
          {formatWeeks(tech.researchWeeks)} · {tech.cost} RP
        </span>

        {nodeState === 'unlocked' && (
          <span className="text-[10px] text-green-400 font-semibold flex-shrink-0">✓ Done</span>
        )}

        {nodeState === 'researching' && (
          <span className="text-[10px] text-blue-400 font-semibold flex-shrink-0 animate-pulse">
            Researching…
          </span>
        )}

        {nodeState === 'available' && (
          <button
            onClick={() => onResearch(tech.id, tech.researchWeeks)}
            className="
              flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold
              bg-blue-600/80 hover:bg-blue-500 text-white
              transition-colors duration-150
            "
          >
            Research
          </button>
        )}

        {nodeState === 'locked' && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-gray-600">🔒</span>
          </div>
        )}
      </div>

      {/* Locked tooltip: prereqs */}
      {nodeState === 'locked' && prereqNames && (
        <div
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
            bg-[#0d1f3c] border border-white/10 rounded px-2 py-1
            text-[9px] text-gray-400 whitespace-nowrap
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            pointer-events-none z-10
          "
        >
          Requires: {prereqNames}
        </div>
      )}

      {/* Researching progress bar along bottom */}
      {nodeState === 'researching' && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5 rounded-b-lg overflow-hidden"
        >
          <div
            className="h-full bg-blue-400 rounded-b-lg transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ── SVG connection lines ──────────────────────────────────────────────────────

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

      const x1 = from.x + NODE_W
      const y1 = from.y + NODE_H / 2
      const x2 = to.x
      const y2 = to.y + NODE_H / 2
      const cp = Math.max(40, Math.abs(x2 - x1) * 0.45)
      const d = `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`

      // Determine colour based on states of both endpoints
      const prereqUnlocked = unlockedTechs.includes(prereqId)
      const nodeUnlocked = unlockedTechs.includes(node.id)
      const nodeResearching = researchingIds.includes(node.id)
      const prereqResearching = researchingIds.includes(prereqId)

      let stroke = '#1e293b'         // dark — locked
      let strokeDash = '6 4'
      let strokeOpacity = 0.5
      let strokeWidth = 1

      if (nodeUnlocked && prereqUnlocked) {
        stroke = '#166534'            // dim green — both unlocked
        strokeDash = 'none'
        strokeOpacity = 0.7
        strokeWidth = 1.5
      } else if (prereqUnlocked && (nodeResearching || prereqResearching)) {
        stroke = '#3b82f6'            // blue — active research path
        strokeDash = 'none'
        strokeOpacity = 0.7
        strokeWidth = 1.5
      } else if (prereqUnlocked) {
        stroke = '#94a3b8'            // light — available
        strokeDash = 'none'
        strokeOpacity = 0.45
        strokeWidth = 1
      }

      paths.push(
        <path
          key={`${prereqId}->${node.id}`}
          d={d}
          fill="none"
          stroke={stroke}
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

// ── Era filter pills ──────────────────────────────────────────────────────────

interface EraFilterProps {
  allEras: Era[]
  activeEra: Era | 'all'
  currentEra: Era
  onChange: (era: Era | 'all') => void
}

function EraFilter({ allEras, activeEra, currentEra, onChange }: EraFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange('all')}
        className={`
          px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150
          ${activeEra === 'all'
            ? 'bg-white/15 text-white border border-white/30'
            : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 hover:text-gray-200'
          }
        `}
      >
        All Eras
      </button>
      {allEras.map(era => (
        <button
          key={era}
          onClick={() => onChange(era)}
          className={`
            px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150
            ${activeEra === era
              ? era === currentEra
                ? 'bg-blue-600/80 text-white border border-blue-500/60'
                : 'bg-white/15 text-white border border-white/30'
              : era === currentEra
                ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40 hover:border-blue-600/60'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 hover:text-gray-200'
            }
          `}
        >
          {ERA_LABELS[era]}
          {era === currentEra && (
            <span className="ml-1 text-[9px] opacity-70">●</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface TechTreeFullscreenProps {
  onClose: () => void
}

export default function TechTreeFullscreen({ onClose }: TechTreeFullscreenProps) {
  const gameState = useGameStore(s => s.state)
  const startResearch = useGameStore(s => s.startResearch)

  const [eraFilter, setEraFilter] = useState<Era | 'all'>('all')

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Initialise era filter to current game era on open
  useEffect(() => {
    if (gameState?.era) setEraFilter(gameState.era)
  }, [])  // only on mount

  if (!gameState) return null

  const currentEra: Era = gameState.era
  const unlockedTechs: string[] = gameState.unlockedTechs ?? []
  const researchQueue = gameState.researchQueue ?? []
  const researchingIds = researchQueue.map(r => r.techId)

  // Which eras have any techs?
  const allErasPresent: Era[] = ERA_ORDER.filter(era =>
    ALL_TECHS.some(t => t.unlocksEra.includes(era))
  )

  // Filter techs by era filter
  const visibleTechs: TechNode[] = useMemo(() => {
    if (eraFilter === 'all') return ALL_TECHS
    return ALL_TECHS.filter(t => t.unlocksEra.includes(eraFilter))
  }, [eraFilter])

  // Compute layout
  const positions = useMemo(() => computeLayout(visibleTechs), [visibleTechs])

  // Compute canvas size
  const canvasSize = useMemo(() => {
    let maxX = 0
    let maxY = 0
    for (const { x, y } of positions.values()) {
      maxX = Math.max(maxX, x + NODE_W + PAD_X)
      maxY = Math.max(maxY, y + NODE_H + PAD_Y)
    }
    return { width: Math.max(maxX, 800), height: Math.max(maxY, 600) }
  }, [positions])

  // Node state helper
  function getNodeState(tech: TechNode): NodeState {
    if (unlockedTechs.includes(tech.id)) return 'unlocked'
    if (researchingIds.includes(tech.id)) return 'researching'
    const prereqsMet = tech.prerequisites.every(p => unlockedTechs.includes(p))
    return prereqsMet ? 'available' : 'locked'
  }

  function getResearchProgress(techId: string): number {
    const project = researchQueue.find(r => r.techId === techId)
    if (!project) return 0
    return Math.round((1 - project.weeksRemaining / project.totalWeeks) * 100)
  }

  const handleResearch = useCallback((techId: string, weeks: number) => {
    startResearch(techId as TechId, weeks)
  }, [startResearch])

  return (
    <div
      className="fixed inset-0 z-50 bg-[#060d1a]/95 backdrop-blur-sm flex flex-col"
      style={{ fontFamily: 'inherit' }}
    >
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div
        className="
          flex-shrink-0 flex items-start justify-between gap-4
          px-6 py-4 border-b border-white/8
          bg-[#07101f]/80
        "
      >
        <div className="flex flex-col gap-3 min-w-0 flex-1">
          {/* Title + era pill */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white tracking-wide">Technology Tree</h2>
            <span
              className="
                px-2.5 py-0.5 rounded-full text-[11px] font-semibold
                bg-blue-600/30 text-blue-300 border border-blue-500/30
              "
            >
              {ERA_LABELS[currentEra]}
            </span>
            {/* Stats */}
            <span className="text-[11px] text-gray-600">
              {unlockedTechs.length} unlocked
              {researchingIds.length > 0 && ` · ${researchingIds.length} in progress`}
            </span>
          </div>

          {/* Era filter */}
          <EraFilter
            allEras={allErasPresent}
            activeEra={eraFilter}
            currentEra={currentEra}
            onChange={setEraFilter}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close technology tree"
          className="
            flex-shrink-0 w-9 h-9 rounded-lg
            flex items-center justify-center
            text-gray-400 hover:text-white
            bg-white/5 hover:bg-white/10
            border border-white/8 hover:border-white/20
            transition-all duration-150 text-lg font-light
            mt-0.5
          "
        >
          ×
        </button>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div
        className="
          flex-shrink-0 flex items-center gap-5 px-6 py-2
          border-b border-white/5 bg-[#060d1a]/60
        "
      >
        {[
          { label: 'Unlocked', dot: 'bg-green-500', text: 'text-green-400' },
          { label: 'Researching', dot: 'bg-blue-500', text: 'text-blue-400' },
          { label: 'Available', dot: 'bg-white/40', text: 'text-gray-300' },
          { label: 'Locked', dot: 'bg-white/10', text: 'text-gray-600' },
        ].map(({ label, dot, text }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span className={`text-[10px] font-medium ${text}`}>{label}</span>
          </div>
        ))}
        <span className="text-[10px] text-gray-600 ml-auto">
          Scroll to navigate · ESC to close
        </span>
      </div>

      {/* ── Scrollable canvas ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div
          style={{
            position: 'relative',
            width: canvasSize.width,
            height: canvasSize.height,
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          {/* SVG layer for connections */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: canvasSize.width,
              height: canvasSize.height,
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            <Connections
              nodes={visibleTechs}
              positions={positions}
              unlockedTechs={unlockedTechs}
              researchingIds={researchingIds}
            />
          </svg>

          {/* Node cards */}
          {visibleTechs.map(tech => {
            const pos = positions.get(tech.id)
            if (!pos) return null
            const nodeState = getNodeState(tech)
            const progress = getResearchProgress(tech.id)

            return (
              <NodeCard
                key={tech.id}
                tech={tech}
                nodeState={nodeState}
                progress={progress}
                position={pos}
                allTechs={ALL_TECHS}
                onResearch={handleResearch}
              />
            )
          })}

          {/* Empty state */}
          {visibleTechs.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center space-y-2">
                <p className="text-4xl">🔬</p>
                <p className="text-gray-500 text-sm">No technologies available for this era.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
