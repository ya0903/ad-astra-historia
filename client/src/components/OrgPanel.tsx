import { useState } from 'react'
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

export default function OrgPanel() {
  const [open, setOpen] = useState(false)
  const gameState = useGameStore(s => s.state)

  if (!gameState) return null

  const { organisations, disputes, nonStateActors } = gameState

  return (
    <div className="absolute top-4 right-4 z-10">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 rounded-full bg-[#0d1f3c]/90 border border-white/20 flex items-center justify-center hover:bg-blue-900/80 transition-colors"
          title="Organisations & Conflicts"
        >
          <span className="text-lg">🌐</span>
        </button>
      ) : (
        <div className="w-72 max-h-[70vh] overflow-y-auto rounded-lg bg-[#0d1f3c]/95 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-sm font-semibold">Orgs & Conflicts</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
          </div>

          <div className="p-3 space-y-4">
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
