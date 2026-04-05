import { useState, useRef, useCallback, useEffect } from 'react'
import { useGameStore } from '../stores'
import type { Organisation, Dispute, NonStateActor } from '@ad-astra/shared/types'

const ORG_TYPE_COLOURS: Record<string, string> = {
  military_alliance: 'bg-red-900/50 text-red-300',
  trade_bloc: 'bg-green-900/50 text-green-300',
  research_collective: 'bg-blue-900/50 text-blue-300',
  political_union: 'bg-purple-900/50 text-purple-300',
  cultural: 'bg-yellow-900/50 text-yellow-300',
}

const DISPUTE_STATUS_COLOURS: Record<string, string> = {
  active: 'bg-red-900/50 text-red-300',
  negotiating: 'bg-yellow-900/50 text-yellow-300',
  frozen: 'bg-blue-900/50 text-blue-300',
  resolved: 'bg-green-900/50 text-green-300',
}

interface OrgPanelProps {
  isOpen?: boolean
  onOpen?: () => void
  onClose?: () => void
}

export default function OrgPanel({ isOpen, onOpen, onClose }: OrgPanelProps = {}) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = isOpen !== undefined ? isOpen : localOpen
  const handleOpen = () => { if (onOpen) onOpen(); else setLocalOpen(true) }
  const handleClose = () => { if (onClose) onClose(); else setLocalOpen(false) }
  const [panelW, setPanelW] = useState(288)
  const [panelH, setPanelH] = useState(420)
  const dragRef = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null)
  const gameState = useGameStore(s => s.state)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, w: panelW, h: panelH }
  }, [panelW, panelH])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dw = dragRef.current.startX - e.clientX
      const dh = dragRef.current.startY - e.clientY
      setPanelW(Math.max(220, Math.min(500, dragRef.current.w + dw)))
      setPanelH(Math.max(200, Math.min(700, dragRef.current.h + dh)))
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  if (!gameState) return null

  const { organisations, disputes, nonStateActors } = gameState

  return (
    <div>
      {!open ? (
        <button
          onClick={handleOpen}
          className="w-10 h-10 rounded-full bg-[#0d1f3c]/90 border border-white/20 flex items-center justify-center hover:bg-blue-900/80 transition-colors"
          title="Organisations & Conflicts"
        >
          <span className="text-lg">🌐</span>
        </button>
      ) : (
        <div className="rounded-2xl bg-[#0a1628] border border-white/15 shadow-2xl overflow-hidden flex flex-col"
          style={{ width: panelW, height: panelH }}>
          {/* Resize handle — top-left corner */}
          <div onMouseDown={onResizeStart}
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize opacity-0 hover:opacity-100 z-10"
            style={{ background: 'radial-gradient(circle at 0 0, rgba(96,165,250,0.5) 0%, transparent 70%)' }} />

          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span>🌐</span>
              <div>
                <p className="text-xs font-bold text-white">Organisations & Conflicts</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-sm leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Organisations */}
            <section>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Organisations ({organisations.length})</p>
              {organisations.length === 0 && <p className="text-xs text-gray-600">None active</p>}
              {organisations.map((org: Organisation) => (
                <div key={org.id} className="rounded bg-white/5 p-2 mb-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{org.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${ORG_TYPE_COLOURS[org.type] ?? 'bg-gray-700 text-gray-300'}`}>
                      {org.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{org.members.length} members · Founded {org.founded}</p>
                </div>
              ))}
            </section>

            {/* Disputes */}
            <section>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Disputes ({disputes.length})</p>
              {disputes.length === 0 && <p className="text-xs text-gray-600">None active</p>}
              {disputes.map((d: Dispute) => (
                <div key={d.id} className="rounded bg-white/5 p-2 mb-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{d.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${DISPUTE_STATUS_COLOURS[d.status] ?? 'bg-gray-700 text-gray-300'}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Parties: {d.parties.join(', ')}</p>
                </div>
              ))}
            </section>

            {/* Non-State Actors */}
            <section>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Non-State Actors ({nonStateActors.length})</p>
              {nonStateActors.length === 0 && <p className="text-xs text-gray-600">None active</p>}
              {nonStateActors.map((nsa: NonStateActor) => (
                <div key={nsa.id} className="rounded bg-white/5 p-2 mb-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{nsa.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900/50 text-orange-300">
                      {nsa.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Strength: {nsa.strength} · Regions: {nsa.regions.join(', ')}</p>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
